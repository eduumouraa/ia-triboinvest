/**
 * MOTOR DE CONVERSA — TRIBO INVEST
 *
 * Fluxo híbrido:
 * - Qualificação (boas-vindas → renda): perguntas fixas com opções numeradas (sem IA)
 * - Apresentação / Proposta / Objeção / Fechamento: Claude AI (persuasão real)
 *
 * Vantagens:
 * ✅ Qualificação instantânea (sem espera de IA)
 * ✅ Apresentação persuasiva (Claude só onde importa)
 * ✅ Muito mais barato — 70% menos chamadas à API
 * ✅ Conversa previsível e testável
 */

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa, rotearProduto } = require('./salesScript');
const { classificarTemperatura, TEMPERATURA } = require('./leadTemperature');
const { classificarPerfil, PERFIL } = require('./leadProfiles');

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

// ─── ETAPAS DE QUALIFICAÇÃO (sem IA) ─────────────────────────────────────────

const ETAPAS_QUALIFICACAO = new Set([
  ETAPAS.BOAS_VINDAS,
  ETAPAS.OBJETIVO,
  ETAPAS.SITUACAO_FINANCEIRA,
  ETAPAS.EXPERIENCIA,
  ETAPAS.RENDA,
]);

// ─── PERGUNTAS FIXAS ──────────────────────────────────────────────────────────

const PERGUNTAS = {

  [ETAPAS.OBJETIVO]: (nome) =>
`Prazer, ${nome}! 😊

Pra eu te ajudar melhor, me conta: *qual é o seu principal objetivo financeiro agora?*

1️⃣ Quero começar a investir
2️⃣ Quero sair das dívidas
3️⃣ Quero entender melhor sobre finanças

_(Responda com 1, 2 ou 3)_`,

  [ETAPAS.SITUACAO_FINANCEIRA]: (nome) =>
`Entendido, ${nome}!

Você tem dívidas em aberto hoje?

1️⃣ Sim, tenho dívidas
2️⃣ Não tenho dívidas

_(Responda com 1 ou 2)_`,

  [ETAPAS.EXPERIENCIA]: (nome) =>
`Legal! E qual é sua experiência com investimentos hoje, ${nome}?

1️⃣ Nunca investi — sou iniciante
2️⃣ Já investi um pouco, mas tenho dúvidas
3️⃣ Já invisto regularmente

_(Responda com 1, 2 ou 3)_`,

  [ETAPAS.RENDA]: (nome) =>
`Última pergunta rápida, ${nome}!

Qual é a sua renda mensal aproximada?

1️⃣ Até R$ 2.000
2️⃣ De R$ 2.000 a R$ 5.000
3️⃣ De R$ 5.000 a R$ 10.000
4️⃣ Acima de R$ 10.000

_(Responda com 1, 2, 3 ou 4)_`,
};

// ─── PARSERS DE RESPOSTA ──────────────────────────────────────────────────────

function parsearObjetivo(msg) {
  const n = extrairNumero(msg);
  if (n === 1) return 'investir';
  if (n === 2) return 'sair_dividas';
  if (n === 3) return 'aprender';
  // Texto livre
  const m = msg.toLowerCase();
  if (m.includes('divida') || m.includes('dívida')) return 'sair_dividas';
  if (m.includes('invest')) return 'investir';
  if (m.includes('aprend') || m.includes('entend')) return 'aprender';
  return null;
}

function parsearSituacaoFinanceira(msg) {
  const n = extrairNumero(msg);
  if (n === 1) return true;
  if (n === 2) return false;
  const m = msg.toLowerCase();
  if (m.includes('sim') || m.includes('tenho') || m.includes('s')) return true;
  if (m.includes('não') || m.includes('nao') || m.includes('n')) return false;
  return null;
}

function parsearExperiencia(msg) {
  const n = extrairNumero(msg);
  if (n === 1) return 'iniciante';
  if (n === 2) return 'alguma';
  if (n === 3) return 'experiente';
  const m = msg.toLowerCase();
  if (m.includes('nunca') || m.includes('inician')) return 'iniciante';
  if (m.includes('regular') || m.includes('sempre')) return 'experiente';
  return 'alguma';
}

function parsearRenda(msg) {
  const n = extrairNumero(msg);
  if (n === 1) return 'ate_2k';
  if (n === 2) return '2k_5k';
  if (n === 3) return '5k_10k';
  if (n === 4) return 'acima_10k';
  // Texto livre
  const m = msg.toLowerCase().replace(/\./g, '').replace(/,/g, '');
  if (m.includes('10') || m.includes('dez')) return 'acima_10k';
  if (m.includes('5') || m.includes('cinco')) return '5k_10k';
  if (m.includes('2') || m.includes('dois')) return '2k_5k';
  return 'ate_2k';
}

function extrairNome(msg) {
  const limpo = msg.trim().replace(/[!.,?]/g, '');
  const partes = limpo.split(/\s+/);
  // Pega só o primeiro nome (ou dois primeiros se for composto)
  return partes.slice(0, 2).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

function extrairNumero(msg) {
  const match = msg.trim().match(/^[^0-9]*([1-4])[^0-9]*$/);
  return match ? parseInt(match[1]) : null;
}

// ─── MENSAGEM DE OPÇÃO INVÁLIDA ───────────────────────────────────────────────

function respostaOpcaoInvalida(etapa, nome) {
  const mapa = {
    [ETAPAS.OBJETIVO]: `Por favor, ${nome}, responda com *1*, *2* ou *3*. 😊`,
    [ETAPAS.SITUACAO_FINANCEIRA]: `Responda com *1* (sim) ou *2* (não), ${nome}. 😊`,
    [ETAPAS.EXPERIENCIA]: `Responda com *1*, *2* ou *3*, ${nome}. 😊`,
    [ETAPAS.RENDA]: `Responda com *1*, *2*, *3* ou *4*, ${nome}. 😊`,
  };
  return mapa[etapa] || 'Pode repetir? Não entendi sua resposta. 😊';
}

// ─── PROCESSAMENTO PRINCIPAL ──────────────────────────────────────────────────

async function processarMensagem(mensagemLead, sessao) {
  const etapaAtual = sessao.etapa || ETAPAS.BOAS_VINDAS;
  const dadosLead = { ...sessao.dadosLead } || {};
  const nome = dadosLead.nome || 'você';

  logger.info('Processando mensagem', {
    leadId: sessao.leadId,
    etapa: etapaAtual,
    msg: mensagemLead.substring(0, 40),
  });

  // ── Qualificação estruturada (sem IA) ──────────────────────────────────────
  if (ETAPAS_QUALIFICACAO.has(etapaAtual)) {
    return processarEtapaQualificacao(mensagemLead, sessao, etapaAtual, dadosLead, nome);
  }

  // ── Apresentação, proposta, objeção, fechamento → Claude AI ───────────────
  return processarComClaude(mensagemLead, sessao, etapaAtual, dadosLead);
}

// ─── QUALIFICAÇÃO ESTRUTURADA ─────────────────────────────────────────────────

function processarEtapaQualificacao(msg, sessao, etapa, dadosLead, nome) {
  let dadosAtualizados = { ...dadosLead };
  let resposta = '';
  let proximaEt = etapa;
  let produto = sessao.produtoRecomendado;

  switch (etapa) {

    // BOAS_VINDAS: aguarda nome
    case ETAPAS.BOAS_VINDAS: {
      const nomeExtraido = extrairNome(msg);
      dadosAtualizados.nome = nomeExtraido;
      proximaEt = ETAPAS.OBJETIVO;
      resposta = PERGUNTAS[ETAPAS.OBJETIVO](nomeExtraido);
      break;
    }

    // OBJETIVO: 1=investir, 2=dívidas, 3=aprender
    case ETAPAS.OBJETIVO: {
      const objetivo = parsearObjetivo(msg);
      if (!objetivo) {
        resposta = respostaOpcaoInvalida(etapa, nome);
        break;
      }
      dadosAtualizados.objetivo = objetivo;
      proximaEt = ETAPAS.SITUACAO_FINANCEIRA;
      resposta = PERGUNTAS[ETAPAS.SITUACAO_FINANCEIRA](nome);
      break;
    }

    // SITUACAO_FINANCEIRA: tem dívidas?
    case ETAPAS.SITUACAO_FINANCEIRA: {
      const temDividas = parsearSituacaoFinanceira(msg);
      if (temDividas === null) {
        resposta = respostaOpcaoInvalida(etapa, nome);
        break;
      }
      dadosAtualizados.temDividas = temDividas;

      // Se tem dívidas OU objetivo é sair_dividas → pula experiência, vai direto para renda
      if (temDividas || dadosAtualizados.objetivo === 'sair_dividas') {
        proximaEt = ETAPAS.RENDA;
        resposta = PERGUNTAS[ETAPAS.RENDA](nome);
      } else {
        proximaEt = ETAPAS.EXPERIENCIA;
        resposta = PERGUNTAS[ETAPAS.EXPERIENCIA](nome);
      }
      break;
    }

    // EXPERIENCIA: nível de investimento
    case ETAPAS.EXPERIENCIA: {
      dadosAtualizados.experiencia = parsearExperiencia(msg);
      proximaEt = ETAPAS.RENDA;
      resposta = PERGUNTAS[ETAPAS.RENDA](nome);
      break;
    }

    // RENDA: rota para produto + gera apresentação (via Claude)
    case ETAPAS.RENDA: {
      dadosAtualizados.renda = parsearRenda(msg);
      const produtoRotado = rotearProduto(dadosAtualizados);
      produto = produtoRotado;

      if (produtoRotado === PRODUTOS.TRIBO) {
        proximaEt = ETAPAS.APRESENTACAO_TRIBO;
      } else if (produtoRotado === PRODUTOS.ORG_FIN) {
        proximaEt = ETAPAS.APRESENTACAO_ORG_FIN;
      } else {
        proximaEt = ETAPAS.ENCERRADO;
        resposta = `Obrigada, ${nome}! Vou pedir que um dos nossos especialistas entre em contato com você pra entender melhor como podemos ajudar. 😊`;
      }

      // Para apresentação, Claude vai gerar a resposta na próxima chamada
      // Aqui apenas atualizamos o estado — Claude roda abaixo
      if (proximaEt !== ETAPAS.ENCERRADO) {
        const sessaoTransicao = {
          ...sessao,
          etapa: proximaEt,
          dadosLead: dadosAtualizados,
          produtoRecomendado: produto,
        };
        return processarComClaude(`[INICIAR_APRESENTACAO]`, sessaoTransicao, proximaEt, dadosAtualizados);
      }
      break;
    }
  }

  // Atualiza sessão
  const { perfil, objetivoEmocional } = classificarPerfil(dadosAtualizados, sessao.historico || []);
  const { temperatura } = classificarTemperatura(dadosAtualizados, sessao.historico || [], sessao.pontuacaoTemperatura || 0);

  const sessaoAtualizada = {
    ...sessao,
    etapa: proximaEt,
    dadosLead: dadosAtualizados,
    produtoRecomendado: produto || sessao.produtoRecomendado,
    perfil: sessao.perfil || perfil,
    objetivoEmocional: sessao.objetivoEmocional || objetivoEmocional,
    temperatura: resolverTemperatura(sessao.temperatura, temperatura),
    historico: sessao.historico || [],
    ultimaInteracao: new Date().toISOString(),
    encerrada: proximaEt === ETAPAS.ENCERRADO,
  };

  return { resposta, sessaoAtualizada };
}

// ─── CLAUDE AI — APRESENTAÇÃO / PROPOSTA / OBJEÇÃO / FECHAMENTO ───────────────

const CONTEXTO_PRODUTOS = `
PRODUTO 1 — TRIBO DO INVESTIDOR
Comunidade ativa de investidores liderada pelo Lucas.
Preço: 12x R$97 (R$3,23/dia). Garantia: 7 dias.
Link: https://triboinvest.com.br/tribo-do-investidor/
Entrega: mentorias ao vivo semanais, carteiras recomendadas, análises exclusivas, comunidade.

PRODUTO 2 — ORGANIZAÇÃO FINANCEIRA
Método para organizar finanças e sair das dívidas.
Preço: R$97 pagamento único. Garantia: 7 dias.
Link: https://chk.eduzz.com/8WPNOBJN0P
Entrega: método de organização, técnicas de negociação de dívidas (descontos de 40-70%), base para investir.`;

async function processarComClaude(mensagemLead, sessao, etapaAtual, dadosLead) {
  const nome = dadosLead.nome || 'você';
  const historico = sessao.historico || [];
  const eApresentacao = mensagemLead === '[INICIAR_APRESENTACAO]';

  const systemPrompt = `Você é a assistente comercial da Tribo Invest.

${CONTEXTO_PRODUTOS}

DADOS DO LEAD:
- Nome: ${dadosLead.nome || 'não informado'}
- Objetivo: ${dadosLead.objetivo || 'não informado'}
- Tem dívidas: ${dadosLead.temDividas ?? 'não informado'}
- Experiência: ${dadosLead.experiencia || 'não informado'}
- Renda: ${dadosLead.renda || 'não informado'}
- Produto indicado: ${sessao.produtoRecomendado || 'não determinado'}
- Etapa atual: ${etapaAtual}

REGRAS:
❌ NUNCA dar o link antes da etapa de FECHAMENTO
❌ NUNCA inventar números ou promoções
✅ Use o nome ${nome} naturalmente
✅ Na APRESENTACAO: construa valor, faça o lead querer. NÃO mencione preço ainda.
✅ Na PROPOSTA: apresente o preço com ancoragem. Ofereça 3 opções numeradas: 1=quero garantir minha vaga, 2=tenho dúvidas, 3=preciso pensar
✅ Na OBJECAO: trate com empatia antes de rebater
✅ No FECHAMENTO: entregue o link direto, transmita segurança

Responda APENAS com o texto da mensagem para o lead, sem JSON, sem explicações.`;

  const mensagemParaClaude = eApresentacao
    ? `Inicie a apresentação do produto indicado (${sessao.produtoRecomendado}) para ${nome}. Construa valor sem mencionar preço.`
    : mensagemLead;

  try {
    const completion = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        ...historico.slice(-10),
        { role: 'user', content: mensagemParaClaude },
      ],
    });

    const resposta = completion.content[0].text.trim();

    // Determina próxima etapa com base na resposta e contexto
    let proximaEt = etapaAtual;
    const msgLower = mensagemLead.toLowerCase();

    // Lead aceita → avança
    const aceitou = /\b1\b/.test(mensagemLead) ||
      /(quero|sim|vamos|bora|fechar|garantir|comprar|aceito)/i.test(mensagemLead);

    // Lead tem dúvida → objeção
    const temDuvida = /\b2\b/.test(mensagemLead) ||
      /(dúvida|duvida|não sei|caro|pensar|depois)/i.test(mensagemLead);

    // Lead recusa → encerrar
    const recusou = /\b3\b/.test(mensagemLead) && etapaAtual.includes('proposta') ||
      /(não quero|nao quero|sem interesse|tchau|obrigad)/i.test(mensagemLead);

    if (eApresentacao) {
      // Após apresentação: manter na etapa, aguardar reação do lead
    } else if (etapaAtual === ETAPAS.APRESENTACAO_TRIBO || etapaAtual === ETAPAS.APRESENTACAO_ORG_FIN) {
      proximaEt = etapaAtual === ETAPAS.APRESENTACAO_TRIBO ? ETAPAS.PROPOSTA_TRIBO : ETAPAS.PROPOSTA_ORG_FIN;
    } else if (aceitou && (etapaAtual === ETAPAS.PROPOSTA_TRIBO || etapaAtual === ETAPAS.PROPOSTA_ORG_FIN)) {
      proximaEt = etapaAtual === ETAPAS.PROPOSTA_TRIBO ? ETAPAS.FECHAMENTO_TRIBO : ETAPAS.FECHAMENTO_ORG_FIN;
    } else if (temDuvida && (etapaAtual === ETAPAS.PROPOSTA_TRIBO || etapaAtual === ETAPAS.PROPOSTA_ORG_FIN)) {
      proximaEt = etapaAtual === ETAPAS.PROPOSTA_TRIBO ? ETAPAS.OBJECAO_TRIBO : ETAPAS.OBJECAO_ORG_FIN;
    } else if (aceitou && (etapaAtual === ETAPAS.OBJECAO_TRIBO || etapaAtual === ETAPAS.OBJECAO_ORG_FIN)) {
      proximaEt = etapaAtual === ETAPAS.OBJECAO_TRIBO ? ETAPAS.FECHAMENTO_TRIBO : ETAPAS.FECHAMENTO_ORG_FIN;
    } else if (etapaAtual === ETAPAS.FECHAMENTO_TRIBO || etapaAtual === ETAPAS.FECHAMENTO_ORG_FIN) {
      proximaEt = ETAPAS.ENCERRADO;
    }

    const encerrada = recusou || proximaEt === ETAPAS.ENCERRADO;

    const historicoAtualizado = [
      ...historico,
      { role: 'user', content: mensagemParaClaude },
      { role: 'assistant', content: resposta },
    ].slice(-20);

    const { temperatura } = classificarTemperatura(dadosLead, historicoAtualizado, sessao.pontuacaoTemperatura || 0);

    const sessaoAtualizada = {
      ...sessao,
      etapa: proximaEt,
      dadosLead,
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
