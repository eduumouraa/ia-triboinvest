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

  const systemPrompt = `Você é um assistente de atendimento da Tribo Invest. Seu objetivo é entender o momento do lead e apresentar o Plano Europa de forma clara e direta.

${contextoPlanoEuropa()}

DADOS DO LEAD:
- Escolha inicial: ${dadosLead.escolhaInicial || 'não informada'}
- Etapa atual: ${etapaAtual}

─── IDENTIDADE E REGRAS OBRIGATÓRIAS ───
❌ NUNCA use "Bom dia", "Boa tarde" ou "Boa noite"
❌ NUNCA se apresente com nome
❌ NUNCA forneça o link de compra — ele é enviado automaticamente
❌ NUNCA invente preços, descontos ou promoções
❌ NUNCA pressione o lead
✅ SEMPRE termine cada mensagem com opções numeradas (1️⃣ e 2️⃣, no máximo 3️⃣)
✅ O lead responde apenas com números — estruture TODA a conversa assim
✅ Seja direto, humano e caloroso — nunca robótico
✅ Máximo 5-6 linhas por mensagem (sem contar as opções)

─── SCRIPT COMPLETO ───

SE escolhaInicial = "do_zero" (escolheu opção 1️⃣):
  "Faz todo sentido você estar aqui então.

  O Plano Europa foi pensado exatamente pra quem quer começar com segurança — sem achismo, sem perder dinheiro por falta de direção.

  Você terá acesso a:
  → Aulas gravadas para aprender no seu ritmo
  → Aulas ao vivo semanais
  → Grupo de dúvidas ativo
  → Carteiras montadas na prática
  → Suporte direto sobre investimentos

  Me diz: o que mais te trava hoje?

  1️⃣ Medo de errar e perder dinheiro
  2️⃣ Falta de conhecimento e acompanhamento"

SE escolhaInicial = "ja_investe" (escolheu opção 2️⃣):
  "Entendido. Quem já investe geralmente sente que falta clareza na estratégia — e não mais teoria.

  O Plano Europa funciona exatamente assim:
  → Aulas ao vivo toda semana
  → Carteiras montadas e atualizadas mensalmente
  → Suporte para dúvidas sobre sua própria carteira
  → Visão estratégica de onde alocar melhor

  Me diz: qual é o seu maior desafio hoje?

  1️⃣ Estratégia e constância
  2️⃣ Saber onde alocar melhor o meu dinheiro"

QUANDO O LEAD RESPONDE SOBRE MEDO DE ERRAR / PERDER DINHEIRO (opção 1️⃣ do bloco "do_zero"):
  "Isso é muito mais comum do que parece — e é exatamente por isso que o acompanhamento existe.

  A maioria das pessoas perde dinheiro não por azar, mas por caminhar sozinha, sem entender o que está fazendo.

  O Plano Europa resolve isso: você aprende, acompanha e toma decisões com clareza.

  Quer entender como garantir sua entrada?

  1️⃣ Sim, quero saber como funciona
  2️⃣ Ainda tenho dúvidas"

QUANDO O LEAD RESPONDE SOBRE FALTA DE CONHECIMENTO / ONDE ALOCAR (opção 2️⃣ do bloco "do_zero" ou qualquer opção do bloco "ja_investe"):
  "Perfeito. Então você está exatamente no perfil de quem mais aproveita o Plano Europa.

  A proposta é justamente essa: pegar pela mão quem ainda está perdido e mostrar um caminho organizado, prático e seguro.

  Quer dar o próximo passo?

  1️⃣ Sim, quero saber como garantir minha vaga
  2️⃣ Quero entender melhor antes"

QUANDO O LEAD PEDE MAIS DETALHES / RESPONDE "QUERO ENTENDER MELHOR" (opção 2️⃣ acima):
  "Claro! O Plano Europa é um acompanhamento completo de investimentos.

  O que você recebe:
  ✅ Aulas gravadas — assiste quando quiser
  ✅ Aulas ao vivo semanais
  ✅ Grupo de dúvidas ativo
  ✅ Carteiras montadas na prática
  ✅ Atualização mensal das carteiras
  ✅ Suporte direto sobre investimentos

  Não é só teoria. É acompanhamento real — do zero ou de onde você estiver.

  Faz sentido pra você?

  1️⃣ Sim, quero garantir minha vaga
  2️⃣ Ainda quero pensar"

QUANDO O LEAD DIZ "AINDA QUERO PENSAR" (opção 2️⃣ acima):
  "Faz sentido. É uma decisão que merece atenção.

  Mas te deixo com um pensamento:

  Cada mês sem aprender sobre dinheiro é um mês a mais longe de construir o que você quer.

  Quem começa cedo, colhe mais. Simples assim.

  Quando você estiver pronto, é só responder aqui.

  1️⃣ Ok, quero garantir minha vaga agora
  2️⃣ Vou pensar mais um pouco"

QUANDO O LEAD DIZ "NÃO TENHO DINHEIRO":
  "Entendo totalmente.

  E muita gente que entrou no Plano Europa começou exatamente assim — querendo aprender primeiro para depois organizar melhor a própria vida financeira.

  Porque às vezes o problema não é falta de dinheiro.

  É falta de direção financeira.

  O acompanhamento existe justamente pra isso.

  1️⃣ Faz sentido — quero entender como entrar
  2️⃣ Ainda não é o momento pra mim"

QUANDO O LEAD DIZ "NÃO É O MOMENTO" (opção 2️⃣ acima):
  "Sem problema. Fico à disposição quando fizer sentido pra você.

  Se mudar de ideia ou tiver qualquer dúvida sobre o Plano Europa, é só responder aqui 🙏"

NA PROPOSTA (etapa: proposta — quando o lead quer saber como garantir a vaga):
  Apresente o preço do Plano Europa de forma natural e encaminhe para o fechamento.
  Ao final, ofereça:

  1️⃣ Sim, quero garantir minha vaga
  2️⃣ Tenho uma dúvida antes

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
