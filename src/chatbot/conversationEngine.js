/**
 * MOTOR DE CONVERSA — TRIBO INVEST
 *
 * Fluxo:
 * - BOAS_VINDAS: mensagem fixa enviada automaticamente (ver leadHandler.js)
 * - Tudo o mais: Claude AI segue o script do Plano Europa
 * - Aceitação na PROPOSTA ou OBJEÇÃO: mensagem fixa de FECHAMENTO (sem IA)
 */

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS, MENSAGENS } = require('./salesScript');
const { classificarTemperatura, TEMPERATURA } = require('./leadTemperature');
const { classificarPerfil, PERFIL } = require('./leadProfiles');

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

// ─── CONTEXTO DO PRODUTO ──────────────────────────────────────────────────────

function contextoPlanoEuropa() {
  const preco = process.env.PRECO_PLANO_EUROPA || '[PREÇO — configure no .env]';
  const garantia = process.env.GARANTIA_PLANO_EUROPA || '7 dias';
  return `PRODUTO — PLANO EUROPA (Tribo Invest)
Acompanhamento completo de investimentos com:
• Aulas gravadas
• Aulas ao vivo semanais
• Grupo de dúvidas
• Suporte para dúvidas sobre investimentos e carteiras dos alunos
• Carteiras montadas na prática, com atualização mensal
• Direcionamento para investir com mais clareza e segurança
Preço: ${preco}
Garantia: ${garantia}`;
}

// ─── PARSER DA ESCOLHA INICIAL ───────────────────────────────────────────────

function parsearEscolhaInicial(msg) {
  const n = extrairNumero(msg);
  if (n === 1) return 'ja_investe';
  if (n === 2) return 'do_zero';
  // Texto livre — tenta inferir
  const m = msg.toLowerCase();
  if (m.includes('zero') || m.includes('começ') || m.includes('nunca') || m.includes('inician')) return 'do_zero';
  if (m.includes('já invisto') || m.includes('ja invisto') || m.includes('invisto') || m.includes('investe')) return 'ja_investe';
  return null;
}

function extrairNumero(msg) {
  const match = msg.trim().match(/^[^0-9]*([1-9])[^0-9]*$/);
  return match ? parseInt(match[1]) : null;
}

// ─── PROCESSAMENTO PRINCIPAL ──────────────────────────────────────────────────

async function processarMensagem(mensagemLead, sessao) {
  const etapaAtual = sessao.etapa || ETAPAS.BOAS_VINDAS;
  const dadosLead = { ...sessao.dadosLead } || {};

  logger.info('Processando mensagem', {
    leadId: sessao.leadId,
    etapa: etapaAtual,
    msg: mensagemLead.substring(0, 40),
  });

  // BOAS_VINDAS: parseia a opção escolhida (1/2/3) antes de ir ao Claude
  if (etapaAtual === ETAPAS.BOAS_VINDAS) {
    const escolha = parsearEscolhaInicial(mensagemLead);
    if (!escolha) {
      return {
        resposta: 'Responda com *1*, *2* ou *3*. 😊',
        sessaoAtualizada: sessao,
      };
    }
    dadosLead.escolhaInicial = escolha;
  }

  // Aceitação na PROPOSTA ou OBJECAO → fechamento fixo (salva chamada à API)
  // Só considera "1" como aceitação se estiver em etapa de proposta/objeção
  const aceitouCompra =
    /^\s*1\s*$/.test(mensagemLead) ||
    /(quero entrar|fechar|garantir|comprar|aceito|topo)/i.test(mensagemLead);

  if (aceitouCompra && (etapaAtual === ETAPAS.PROPOSTA || etapaAtual === ETAPAS.OBJECAO)) {
    const resposta = MENSAGENS[ETAPAS.FECHAMENTO]();
    const historicoAtualizado = [
      ...(sessao.historico || []),
      { role: 'user', content: mensagemLead },
      { role: 'assistant', content: resposta },
    ].slice(-20);

    const sessaoAtualizada = {
      ...sessao,
      etapa: ETAPAS.ENCERRADO,
      dadosLead,
      produtoRecomendado: PRODUTOS.PLANO_EUROPA,
      historico: historicoAtualizado,
      converteu: true,
      encerrada: true,
      ultimaInteracao: new Date().toISOString(),
    };
    return { resposta, sessaoAtualizada };
  }

  return processarComClaude(mensagemLead, sessao, etapaAtual, dadosLead);
}

// ─── CLAUDE AI ────────────────────────────────────────────────────────────────

async function processarComClaude(mensagemLead, sessao, etapaAtual, dadosLead) {
  const historico = sessao.historico || [];

  const systemPrompt = `Você é Edu, do time de vendas da Tribo Invest. Atenda de forma calorosa, natural e direta — como um humano faria, sem ser robótico.

${contextoPlanoEuropa()}

DADOS DO LEAD:
- Nome: ${dadosLead.nome || 'não informado'}
- Escolha inicial: ${dadosLead.escolhaInicial || 'não informada'}
- Etapa atual: ${etapaAtual}

─── SCRIPT DE ATENDIMENTO ───

SE escolhaInicial = "ja_investe" (escolheu opção 1):
  Diga: "Entendi. Nesse caso, o acompanhamento ajuda muito porque não fica só na teoria.

  A gente trabalha com aulas ao vivo, carteiras montadas na prática, atualização mensal e suporte para tirar dúvidas das carteiras dos alunos.

  A ideia é trazer mais clareza e direção para quem já investe mas sente falta de acompanhamento.

  Hoje sua maior dificuldade é:

  1 - Estratégia
  2 - Constância
  3 - Saber onde alocar melhor"

SE escolhaInicial = "do_zero" (escolheu opção 2):
  Diga: "Perfeito. Então o acompanhamento pode fazer muito sentido pra você.

  A proposta é justamente ajudar quem ainda não sabe por onde começar, com aulas gravadas, aulas ao vivo semanais, grupo de dúvidas e carteiras montadas na prática.

  O que mais te trava hoje:

  1 - Medo de errar
  2 - Falta de conhecimento
  3 - Falta de acompanhamento"

SE O LEAD PEDE O VALOR (antes da proposta formal):
  Diga: "Te explico sim. Antes, me conta:

  1 - Estou começando agora
  2 - Já tenho algum valor investido"

NA PROPOSTA (etapa: proposta):
  Apresente o preço do Plano Europa. Ao final, ofereça sempre:

  1 - Quero entrar
  2 - Tenho uma dúvida
  3 - Preciso pensar um pouco

─── OBJEÇÕES ───

Quando o lead escolhe "2 - Tenho uma dúvida" ou "3 - Preciso pensar" ou expressa objeção:

Resposta ao medo / insegurança (ex: escolheu opção 1 no bloqueio):
  "Isso é mais comum do que você imagina. Muita gente entra justamente por isso.
  O objetivo do acompanhamento é evitar que a pessoa caminhe sozinha e tome decisões sem entendimento.
  Quer entrar e ver na prática?

  1 - Sim, quero entrar
  2 - Ainda tenho dúvidas"

Resposta ao "vou pensar":
  "Perfeito. É uma decisão que precisa ser tomada com clareza.
  Quanto mais cedo a pessoa começa a aprender, mais cedo constrói patrimônio.
  Se quiser, posso te explicar melhor como funciona:

  1 - Me explica melhor
  2 - Vou pensar mais um pouco"

Resposta ao "não tenho dinheiro":
  "Entendo. Às vezes o problema não é só dinheiro — é falta de direção financeira.
  Muitas pessoas que entram começaram querendo aprender primeiro.
  O que você prefere:

  1 - Entender como funciona antes de decidir
  2 - Deixa pra outro momento"

─── REGRAS ───
❌ NUNCA fornecer o link de compra — ele será enviado automaticamente após a confirmação
❌ NUNCA inventar números, descontos ou promoções
❌ NÃO pressione o lead
✅ SEMPRE termine cada mensagem com opções numeradas (1, 2 ou no máximo 3)
✅ O lead responde apenas com números — estruture toda a conversa assim
✅ Seja caloroso e natural — como o Edu humano faria
✅ Máximo 5-6 linhas por mensagem (sem contar as opções)

Responda APENAS com o texto da mensagem. Sem JSON, sem explicações.`;

  try {
    const completion = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        ...historico.slice(-10),
        { role: 'user', content: mensagemLead },
      ],
    });

    const resposta = completion.content[0].text.trim();

    // ── Avanço de etapa ────────────────────────────────────────────────────────

    let proximaEt = etapaAtual;

    const temDuvida =
      /(dúvida|duvida|não sei|caro|pensar|depois|medo|como funciona|quanto custa|valor|como pago)/i.test(mensagemLead);
    const recusou =
      /(não quero|nao quero|sem interesse|tchau|obrigad[ao])/i.test(mensagemLead);

    if (etapaAtual === ETAPAS.BOAS_VINDAS) {
      proximaEt = ETAPAS.APRESENTACAO;
    } else if (etapaAtual === ETAPAS.APRESENTACAO) {
      // Permite 2 trocas para Claude responder o bloqueio antes de ir para proposta
      const trocas = (dadosLead.trocasApresentacao || 0) + 1;
      dadosLead.trocasApresentacao = trocas;
      if (trocas >= 2) {
        proximaEt = ETAPAS.PROPOSTA;
      }
    } else if (etapaAtual === ETAPAS.PROPOSTA && temDuvida) {
      proximaEt = ETAPAS.OBJECAO;
    }

    const encerrada = recusou;

    const historicoAtualizado = [
      ...historico,
      { role: 'user', content: mensagemLead },
      { role: 'assistant', content: resposta },
    ].slice(-20);

    const { perfil, objetivoEmocional } = classificarPerfil(dadosLead, historicoAtualizado);
    const { temperatura } = classificarTemperatura(dadosLead, historicoAtualizado, sessao.pontuacaoTemperatura || 0);

    const sessaoAtualizada = {
      ...sessao,
      etapa: proximaEt,
      dadosLead,
      produtoRecomendado: PRODUTOS.PLANO_EUROPA,
      perfil: sessao.perfil || perfil,
      objetivoEmocional: sessao.objetivoEmocional || objetivoEmocional,
      historico: historicoAtualizado,
      temperatura: resolverTemperatura(sessao.temperatura, temperatura),
      ultimaInteracao: new Date().toISOString(),
      encerrada,
    };

    return { resposta, sessaoAtualizada };
  } catch (error) {
    logger.error('Erro ao processar com Claude', { error: error.message });
    throw error;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolverTemperatura(anterior, calculada) {
  const ordem = [TEMPERATURA.FRIO, TEMPERATURA.MORNO, TEMPERATURA.QUENTE];
  return [anterior, calculada]
    .filter(Boolean)
    .reduce((melhor, atual) => (ordem.indexOf(atual) > ordem.indexOf(melhor) ? atual : melhor), TEMPERATURA.FRIO);
}

function mensagemBoasVindas() {
  return MENSAGENS[ETAPAS.BOAS_VINDAS]();
}

module.exports = { processarMensagem, mensagemBoasVindas, ETAPAS, PRODUTOS, TEMPERATURA, PERFIL };
