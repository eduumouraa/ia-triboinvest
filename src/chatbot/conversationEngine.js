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
  if (n === 1) return 'do_zero';
  if (n === 2) return 'ja_investe';
  if (n === 3) return 'como_funciona';
  // Texto livre — tenta inferir
  const m = msg.toLowerCase();
  if (m.includes('zero') || m.includes('começ') || m.includes('nunca') || m.includes('inician')) return 'do_zero';
  if (m.includes('já invisto') || m.includes('ja invisto') || m.includes('consistência') || m.includes('consisto') || m.includes('invisto')) return 'ja_investe';
  if (m.includes('como funciona') || m.includes('entender') || m.includes('saber mais')) return 'como_funciona';
  return null;
}

function extrairNumero(msg) {
  const match = msg.trim().match(/^[^0-9]*([1-3])[^0-9]*$/);
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
  const aceitouCompra =
    /^\s*1\s*$/.test(mensagemLead) ||
    /(quero|sim|vamos|bora|fechar|garantir|comprar|aceito|topo|entrar|quero entrar)/i.test(mensagemLead);

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

SE escolhaInicial = "do_zero" (escolheu opção 1):
  "Perfeito. Então o acompanhamento pode fazer muito sentido pra você.

  A proposta é justamente ajudar quem ainda não sabe por onde começar, com aulas gravadas, aulas ao vivo semanais, grupo de dúvidas, suporte para dúvidas sobre carteira e carteiras montadas na prática para o aluno entender melhor como funciona o mercado e como aplicar com mais clareza.

  Hoje, o que mais te trava: medo de errar, falta de conhecimento, ou falta de acompanhamento?"

SE escolhaInicial = "ja_investe" (escolheu opção 2):
  "Entendi. Nesse caso, o acompanhamento ajuda muito porque não fica só na teoria.

  A gente trabalha com aulas ao vivo, carteiras montadas na prática, atualização mensal dessas carteiras e suporte para tirar dúvidas relacionadas aos investimentos e às carteiras dos alunos.

  A ideia é justamente trazer mais clareza e direção para quem já investe, mas sente falta de acompanhamento e visão estratégica.

  Hoje você sente que sua maior dificuldade é: estratégia, constância, ou saber onde alocar melhor?"

SE escolhaInicial = "como_funciona" (escolheu opção 3) OU SE O LEAD PERGUNTA "COMO FUNCIONA?":
  "O Plano Europa funciona como um acompanhamento.

  Você terá: aulas gravadas; aulas ao vivo semanais; grupo de dúvidas; suporte para dúvidas sobre investimentos e carteiras; carteiras montadas na prática; atualização mensal dessas carteiras; e direcionamento para aprender a investir com mais clareza e segurança.

  A ideia não é só entregar teoria, mas acompanhar o aluno no processo."

SE O LEAD PEDE O VALOR (antes da proposta formal):
  "Te explico sim. Antes, só pra eu conseguir te direcionar melhor: você está começando agora ou já possui algum valor investido hoje?"

NA PROPOSTA (etapa: proposta):
  Apresente o preço do Plano Europa com naturalidade. Pergunte se quer entrar.

─── OBJEÇÕES ───

"Tenho medo de perder dinheiro":
  "Isso é mais comum do que você imagina.
  Muita gente entra justamente por isso: porque sente falta de direção e acompanhamento para começar com mais segurança e clareza.
  O objetivo do acompanhamento é justamente evitar que a pessoa caminhe sozinha e tome decisões sem entendimento."

"Não sei nada sobre investimentos":
  "Perfeito. Então você está exatamente no perfil de quem mais consegue aproveitar o acompanhamento.
  Porque a proposta é justamente pegar pela mão quem ainda está perdido e mostrar um caminho mais claro e organizado dentro dos investimentos."

"Vou pensar":
  "Perfeito. É uma decisão que realmente precisa ser tomada com clareza.
  Mas uma coisa é fato: quanto mais cedo a pessoa começa a aprender sobre dinheiro e investimentos, mais cedo ela começa a construir patrimônio e tomar decisões financeiras melhores.
  Se tiver qualquer dúvida sobre como funciona o acompanhamento, pode me chamar."

"Não tenho dinheiro agora":
  "Entendo. E muitas pessoas que entram no acompanhamento começaram justamente querendo aprender primeiro para depois organizar melhor a própria vida financeira.
  Porque às vezes o problema não é só dinheiro. É falta de direção financeira."

─── REGRAS ───
❌ NUNCA fornecer o link de compra — ele será enviado automaticamente após a confirmação
❌ NUNCA inventar números, descontos ou promoções que não estejam no script
❌ NÃO pressione o lead — nunca use frases como "E aí, decidiu?" ou "Vai entrar?"
✅ Seja caloroso e natural — como o Edu humano faria
✅ Máximo 5-6 linhas por mensagem
✅ Use o nome do lead quando disponível

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
