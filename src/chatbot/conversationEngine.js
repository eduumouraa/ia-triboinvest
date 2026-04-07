const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa } = require('./salesScript');
const { classificarTemperatura, TEMPERATURA } = require('./leadTemperature');
const { classificarPerfil, contextoPerfil, textoObjetivoEmocional, PERFIL } = require('./leadProfiles');
const { selecionarTempero } = require('./temperos');
const { filtrarFrasesProibidas } = require('./humanization');
const { detectarObjecao, detectarInteressePositivo, detectarRecusa } = require('./objectionHandler');

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

// ─── PRODUTOS — contexto completo para o Claude ──────────────────────────────

const CONTEXTO_PRODUTOS = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUTO 1 — TRIBO DO INVESTIDOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O QUE É: Uma comunidade ativa de investidores, não apenas um curso.
DIFERENCIAL: Contato direto com o Lucas. Análises em tempo real. Decisões com segurança.
PREÇO: 12x R$ 97,00 (= R$ 3,23/dia — menos que um café)
GARANTIA: 7 dias incondicional — entra, acessa tudo, se não gostar devolve 100%.
LINK DE COMPRA: https://triboinvest.com.br/tribo-do-investidor/
PARA QUEM: Quem quer aprender a investir do zero OU quem já investe e quer consistência/evolução.

O QUE ENTREGA:
• Mentorias ao vivo toda semana com o Lucas (perguntas e respostas em tempo real)
• Carteiras recomendadas atualizadas (você não precisa escolher sozinho)
• Análises e alertas exclusivos (já salvou alunos de quedas de 15% em posições erradas)
• Comunidade ativa de investidores para troca e aprendizado
• Suporte direto

ARGUMENTOS DE VENDA:
• "Não é um curso gravado que você assiste e esquece. É uma comunidade viva."
• "R$ 3,23/dia com garantia de 7 dias — o risco é completamente nosso."
• "Quem investe sozinho comete erros que custam muito mais que 12x R$ 97."
• "O Lucas compartilha o que faz na carteira dele — transparência total."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUTO 2 — ORGANIZAÇÃO FINANCEIRA E NEGOCIAÇÃO DE DÍVIDAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O QUE É: Um método prático, passo a passo, para organizar finanças e sair das dívidas.
DIFERENCIAL: Técnicas reais de negociação (desconto de 40% a 70% nas dívidas). Não é teoria.
PREÇO: R$ 97,00 — PAGAMENTO ÚNICO. SEM MENSALIDADE.
GARANTIA: 7 dias incondicional — entra, aplica, se não gostar devolve 100%.
LINK DE COMPRA: https://chk.eduzz.com/8WPNOBJN0P
PARA QUEM: Quem tem dívidas, está desorganizado, quer dar o primeiro passo real.

O QUE ENTREGA:
• Organização do zero — método que funciona na vida real, não em planilha bonita
• Negociação de dívidas — técnicas para conseguir descontos reais com bancos e cartões
• Construção da reserva de emergência — como guardar mesmo com pouco
• Base para começar a investir depois de organizar

ARGUMENTOS DE VENDA:
• "Não é 'corta o cafezinho'. É método real para quem está de verdade no buraco."
• "R$ 97 único vs. meses de juros compostos. A matemática fala por si."
• "Nossos alunos conseguem descontos de até 70% na negociação de dívidas."
• "Ao final, você sai organizado e pronto para dar os primeiros passos como investidor."
• "Pagamento único — acesso vitalício. Não é assinatura."
`;

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystemPrompt(sessao) {
  const perfil = sessao.perfil || PERFIL.A;
  const ctx = contextoPerfil(perfil);
  const objetivoTexto = sessao.objetivoEmocional
    ? textoObjetivoEmocional(sessao.objetivoEmocional)
    : null;

  return `Você é a assistente comercial da Tribo Invest, comunidade de educação financeira liderada pelo Lucas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERFIL DO LEAD: ${perfil.toUpperCase()}
Tom: ${ctx.tom}
Drivers: ${ctx.drivers}
Evitar: ${ctx.evitar}
Foco: ${ctx.foco}
${objetivoTexto ? `Objetivo emocional: "${objetivoTexto}" — mencione quando natural` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${CONTEXTO_PRODUTOS}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUXO DE CONVERSA — ETAPAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOAS_VINDAS → OBJETIVO → SITUACAO_FINANCEIRA → [EXPERIENCIA] → RENDA
  → APRESENTACAO_TRIBO ou APRESENTACAO_ORG_FIN
  → PROPOSTA_TRIBO ou PROPOSTA_ORG_FIN
  → [OBJECAO se o lead hesitar]
  → FECHAMENTO_TRIBO ou FECHAMENTO_ORG_FIN
  → ENCERRADO

REGRA DA APRESENTAÇÃO:
Na etapa de APRESENTACAO, construa valor ANTES de falar em preço.
Faça perguntas que gerem comprometimento ("faz sentido?", "isso é o que você precisa?").
O lead deve QUERER o produto antes de ouvir o quanto custa.

REGRA DA PROPOSTA:
Na etapa de PROPOSTA, apresente o preço com ancoragem (R$ 3,23/dia).
Sempre mencione a garantia de 7 dias — ela elimina o medo de errar.
CTA claro: ofereça 3 opções (sim / tenho dúvida / preciso pensar).

REGRA DO FECHAMENTO:
Na etapa de FECHAMENTO, entregue o link sem enrolação.
Tribo: https://triboinvest.com.br/tribo-do-investidor/
Org. Financeira: https://chk.eduzz.com/8WPNOBJN0P
Informe o que fazer após o pagamento. Transmita segurança.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS ABSOLUTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NUNCA: "E aí, decidiu?", "Vai comprar?", "Fechou?", "O que achou?"
❌ NUNCA inventar números, depoimentos ou promoções inexistentes
❌ NUNCA dar o link antes da etapa de FECHAMENTO
✅ SEMPRE construir valor antes de mostrar preço
✅ SEMPRE usar o nome do lead
✅ SEMPRE tratar objeção com empatia antes de rebater
✅ Se perguntar se é IA: "Sou assistente virtual da Tribo Invest — mas meu objetivo é te ajudar de verdade."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — JSON PURO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "resposta": "mensagem para o lead",
  "dadosExtraidos": {
    "nome": null,
    "objetivo": null,
    "temDividas": null,
    "experiencia": null,
    "renda": null,
    "interessado": null,
    "bloqueio": null,
    "objetivoEmocional": null,
    "interesseScpSpe": null,
    "tipoObjecao": null
  },
  "perfil": null,
  "temperatura": null,
  "avancarEtapa": false,
  "irParaObjecao": false,
  "encerrarConversa": false,
  "injetarTempero": false
}`;
}

// ─── PROCESSAMENTO PRINCIPAL ──────────────────────────────────────────────────

async function processarMensagem(mensagemLead, sessao) {
  const historico = sessao.historico || [];
  const etapaAtual = sessao.etapa || ETAPAS.BOAS_VINDAS;
  const dadosLead = sessao.dadosLead || {};
  const temperosUsados = sessao.temperosUsados || [];

  logger.info('Processando mensagem', {
    leadId: sessao.leadId,
    etapa: etapaAtual,
    perfil: sessao.perfil,
    temperatura: sessao.temperatura,
  });

  // Detecção direta de padrões (evita custo de API para casos óbvios)
  const eInteresse = detectarInteressePositivo(mensagemLead);
  const eRecusa = detectarRecusa(mensagemLead);
  const tipoObjecao = detectarObjecao(mensagemLead);

  // Tempero sugerido a cada 4 mensagens
  const temperoSugerido =
    historico.length > 2 && historico.length % 4 === 0
      ? selecionarTempero(dadosLead.nome, sessao.produtoRecomendado, etapaAtual, temperosUsados)
      : null;

  const contexto = `
ETAPA ATUAL: ${etapaAtual}
DADOS COLETADOS: ${JSON.stringify(dadosLead)}
PRODUTO RECOMENDADO: ${sessao.produtoRecomendado || 'não determinado'}
TEMPERATURA: ${sessao.temperatura || 'não classificada'}
PERFIL: ${sessao.perfil || 'não classificado'}
OBJETIVO EMOCIONAL: ${sessao.objetivoEmocional || 'não detectado'}
TEMPEROS JÁ USADOS: ${temperosUsados.join(', ') || 'nenhum'}
INTERESSE POSITIVO DETECTADO: ${eInteresse}
OBJEÇÃO DETECTADA: ${tipoObjecao || 'nenhuma'}
RECUSA DETECTADA: ${eRecusa}
${temperoSugerido ? `TEMPERO SUGERIDO (incorpore se natural): "${temperoSugerido.mensagem}"` : ''}

MENSAGEM DO LEAD: "${mensagemLead}"

Analise, extraia dados e gere a resposta ideal para este momento do funil.
${eInteresse ? 'O lead sinalizou interesse — avance para a próxima etapa ou feche.' : ''}
${tipoObjecao ? `Objeção do tipo "${tipoObjecao}" — trate com empatia antes de rebater.` : ''}
${eRecusa ? 'O lead recusou — encerre com elegância e agende follow-up.' : ''}`;

  try {
    const completion = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 1024,
      system: buildSystemPrompt(sessao),
      messages: [
        ...historico,
        { role: 'user', content: contexto },
      ],
    });

    const respostaRaw = completion.content[0].text.trim();

    let parsed;
    try {
      const match = respostaRaw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : respostaRaw);
    } catch {
      logger.warn('Falha ao parsear JSON do Claude');
      parsed = { resposta: respostaRaw, dadosExtraidos: {}, avancarEtapa: false, encerrarConversa: false };
    }

    const respostaFiltrada = filtrarFrasesProibidas(parsed.resposta || '');

    // Mescla dados extraídos
    const dadosAtualizados = {
      ...dadosLead,
      ...Object.fromEntries(
        Object.entries(parsed.dadosExtraidos || {}).filter(([, v]) => v !== null && v !== undefined)
      ),
    };

    // Reclassifica perfil e temperatura
    const { perfil: perfilCalc, objetivoEmocional: objEmoCalc } = classificarPerfil(dadosAtualizados, historico);
    const { temperatura: tempCalc, pontuacao } = classificarTemperatura(dadosAtualizados, historico, sessao.pontuacaoTemperatura || 0);

    const perfilFinal = resolverPerfil(sessao.perfil, parsed.perfil, perfilCalc, dadosAtualizados.interesseScpSpe);
    const temperaturaFinal = resolverTemperatura(sessao.temperatura, parsed.temperatura, tempCalc);
    const objetivoEmocionalFinal = sessao.objetivoEmocional || parsed.dadosExtraidos?.objetivoEmocional || objEmoCalc || null;

    // Determina próxima etapa
    let proximaEtapaInfo = { etapa: etapaAtual };
    if (parsed.avancarEtapa || eInteresse) {
      proximaEtapaInfo = proximaEtapa(etapaAtual, dadosAtualizados);
    } else if (parsed.irParaObjecao) {
      // Vai para etapa de objeção correspondente
      if (sessao.produtoRecomendado === PRODUTOS.TRIBO) proximaEtapaInfo = { etapa: ETAPAS.OBJECAO_TRIBO };
      if (sessao.produtoRecomendado === PRODUTOS.ORG_FIN) proximaEtapaInfo = { etapa: ETAPAS.OBJECAO_ORG_FIN };
    }

    const temperosAtualizados = [...temperosUsados];
    if (temperoSugerido && parsed.injetarTempero) {
      temperosAtualizados.push(temperoSugerido.tipo);
    }

    const historicoAtualizado = [
      ...historico,
      { role: 'user', content: contexto },
      { role: 'assistant', content: respostaRaw },
    ].slice(-24);

    const sessaoAtualizada = {
      ...sessao,
      etapa: proximaEtapaInfo.etapa,
      dadosLead: dadosAtualizados,
      perfil: perfilFinal,
      temperatura: temperaturaFinal,
      pontuacaoTemperatura: pontuacao,
      objetivoEmocional: objetivoEmocionalFinal,
      produtoRecomendado: proximaEtapaInfo.produto || sessao.produtoRecomendado,
      temperosUsados: temperosAtualizados,
      historico: historicoAtualizado,
      ultimaInteracao: new Date().toISOString(),
      encerrada: parsed.encerrarConversa || eRecusa || proximaEtapaInfo.etapa === ETAPAS.ENCERRADO,
    };

    return { resposta: respostaFiltrada, sessaoAtualizada };
  } catch (error) {
    logger.error('Erro ao processar com Claude', { error: error.message });
    throw error;
  }
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

function resolverPerfil(anterior, detectadoClaude, calculado, interesseScpSpe) {
  if (interesseScpSpe) return PERFIL.C;
  if (detectadoClaude === 'scp_spe' || calculado === PERFIL.C) return PERFIL.C;
  if (detectadoClaude === 'investidor' || calculado === PERFIL.B) return PERFIL.B;
  return anterior || calculado || PERFIL.A;
}

function resolverTemperatura(anterior, detectadaClaude, calculada) {
  const ordem = [TEMPERATURA.FRIO, TEMPERATURA.MORNO, TEMPERATURA.QUENTE];
  return [anterior, detectadaClaude, calculada]
    .filter(Boolean)
    .reduce((melhor, atual) => (ordem.indexOf(atual) > ordem.indexOf(melhor) ? atual : melhor), TEMPERATURA.FRIO);
}

function mensagemBoasVindas() {
  return MENSAGENS[ETAPAS.BOAS_VINDAS]();
}

module.exports = { processarMensagem, mensagemBoasVindas, ETAPAS, PRODUTOS, TEMPERATURA, PERFIL };
