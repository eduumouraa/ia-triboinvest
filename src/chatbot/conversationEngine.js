const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa } = require('./salesScript');
const { classificarTemperatura, TEMPERATURA } = require('./leadTemperature');
const { classificarPerfil, contextoPerfil, textoObjetivoEmocional, PERFIL } = require('./leadProfiles');
const { selecionarTempero } = require('./temperos');
const { filtrarFrasesProibidas } = require('./humanization');

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystemPrompt(sessao) {
  const perfil = sessao.perfil || PERFIL.A;
  const ctx = contextoPerfil(perfil);
  const objetivoEmocional = sessao.objetivoEmocional;
  const objetivoTexto = objetivoEmocional ? textoObjetivoEmocional(objetivoEmocional) : null;

  return `Você é a assistente comercial da Tribo Invest, comunidade de educação financeira liderada pelo Lucas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERFIL DO LEAD ATUAL: ${perfil.toUpperCase()}
Tom de voz: ${ctx.tom}
Drivers de decisão: ${ctx.drivers}
Evitar: ${ctx.evitar}
Foco da conversa: ${ctx.foco}
${objetivoTexto ? `Objetivo emocional do lead: "${objetivoTexto}" — mencione isso quando natural, como "lembrei da sua meta de ${objetivoTexto}"` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUTOS:
• Tribo do Investidor — 12x R$ 97,00
  Comunidade, mentorias ao vivo, carteiras recomendadas, análises exclusivas.
  Ideal para: iniciantes que querem aprender E investidores que querem evoluir.

• Organização Financeira e Negociação de Dívidas — R$ 97,00 (único)
  Método do zero pra organizar e sair das dívidas.
  Ideal para: quem tem dívidas e precisa do primeiro passo.

• SCP / SPE (para Perfil C):
  Projetos de alto potencial (leilões, incorporações) para investidores com capital maior.
  A Tribo é a porta de entrada para entender e participar dessas operações.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS ABSOLUTAS (violá-las é inaceitável)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NUNCA use: "E aí, decidiu?", "Vai comprar?", "Fechou?", "O que achou?"
❌ NUNCA pressione. Follow-up é condução de valor, não cobrança.
❌ NUNCA pule etapas do funil.
❌ NUNCA invente dados, números ou depoimentos.
✅ SEMPRE gere um novo loop de curiosidade ou valor quando o lead hesitar.
✅ SEMPRE chame pelo nome quando souber.
✅ SEMPRE adapte ao perfil do lead — não trate investidor como iniciante.
✅ Se perguntar se é IA: "Sou uma assistente virtual da Tribo Invest. Mas fui treinada pra entender o que você precisa de verdade, não pra te vender qualquer coisa."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRATÉGIAS DE PERSUASÃO (use com naturalidade)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Ancoragem: R$ 3,23/dia vs cafezinho. Custo de uma decisão errada é muito maior.
• Reciprocidade: Material gratuito cria dívida de gratidão antes da venda.
• Garantia: 7 dias incondicional. Risco zero. O medo de errar some.
• Prova Social: Histórias de alunos que estavam na mesma situação.
• Curiosidade: "Amanhã o Lucas vai revelar..." — loops que trazem o lead de volta.
• Escassez (só no encerramento Toque 3): Nunca inventar vagas falsas.
• Afinidade: Reference o objetivo emocional do lead para mostrar que você lembrou.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETECÇÃO ESPECIAL — SCP / SPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Se o lead mencionar: SCP, SPE, leilão, incorporação, patrimônio alto, aporte acima de R$ 50k:
→ Classificar como Perfil C
→ Usar o gatilho da Exclusividade
→ Explicar SCP/SPE brevemente: "É onde você investe em projetos específicos junto com o grupo..."
→ Posicionar a Tribo como a base e a porta de entrada para essas operações.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (JSON PURO — sem texto fora do JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "resposta": "mensagem exata para o lead (texto limpo, sem markdown)",
  "dadosExtraidos": {
    "nome": "string ou null",
    "objetivo": "investir|sair_dividas|aprender|entender|null",
    "temDividas": true|false|null,
    "experiencia": "iniciante|basico|intermediario|avancado|null",
    "renda": "ate_2k|2k_5k|5k_10k|acima_10k|sem_renda|null",
    "interessado": true|false|null,
    "bloqueio": "tempo|dinheiro|medo|confianca|prioridade|passo_a_passo|null",
    "objetivoEmocional": "aposentadoria|familia|liberdade|seguranca|crescimento|dividas|null",
    "interesseScpSpe": true|false|null
  },
  "perfil": "iniciante|investidor|scp_spe|null",
  "temperatura": "quente|morno|frio|null",
  "avancarEtapa": true|false,
  "encerrarConversa": false,
  "injetarTempero": true|false
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

  // Tempero sugerido a cada 4 mensagens
  const deveTentarTempero = historico.length > 2 && historico.length % 4 === 0;
  const temperoSugerido = deveTentarTempero
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
${temperoSugerido ? `TEMPERO SUGERIDO: "${temperoSugerido.mensagem}"` : ''}

MENSAGEM DO LEAD: "${mensagemLead}"

Interprete, extraia dados, classifique perfil e temperatura, e gere resposta adequada.`;

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

    // Filtra frases proibidas de cobrança
    const respostaFiltrada = filtrarFrasesProibidas(parsed.resposta || '');

    // Mescla dados
    const dadosAtualizados = {
      ...dadosLead,
      ...Object.fromEntries(
        Object.entries(parsed.dadosExtraidos || {}).filter(([, v]) => v !== null && v !== undefined)
      ),
    };

    // Reclassifica perfil com todos os dados disponíveis
    const { perfil: novoPerfilCalc, objetivoEmocional: objEmoCalc } = classificarPerfil(
      dadosAtualizados,
      historico
    );

    // Perfil: prioriza o que o Claude detectou se mais específico
    const perfilFinal = resolverPerfil(
      sessao.perfil,
      parsed.perfil,
      novoPerfilCalc,
      dadosAtualizados.interesseScpSpe
    );

    // Objetivo emocional: preserva o já detectado ou usa o novo
    const objetivoEmocionalFinal =
      sessao.objetivoEmocional ||
      parsed.dadosExtraidos?.objetivoEmocional ||
      objEmoCalc ||
      null;

    // Temperatura
    const { temperatura: novaTemp, pontuacao } = classificarTemperatura(
      dadosAtualizados,
      historico,
      sessao.pontuacaoTemperatura || 0
    );
    const temperaturaFinal = resolverTemperatura(sessao.temperatura, parsed.temperatura, novaTemp);

    // Próxima etapa
    let proximaEtapaInfo = { etapa: etapaAtual };
    if (parsed.avancarEtapa) {
      proximaEtapaInfo = proximaEtapa(etapaAtual, dadosAtualizados);
    }

    // Temperos usados
    const temperosAtualizados = [...temperosUsados];
    if (temperoSugerido && parsed.injetarTempero) {
      temperosAtualizados.push(temperoSugerido.tipo);
    }

    // Historico (mantém últimas 24 mensagens)
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
      encerrada: parsed.encerrarConversa || proximaEtapaInfo.etapa === ETAPAS.ENCERRADO,
    };

    return { resposta: respostaFiltrada, sessaoAtualizada };
  } catch (error) {
    logger.error('Erro ao processar com Claude', { error: error.message });
    throw error;
  }
}

// ─── Resolvers de conflito ────────────────────────────────────────────────────

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
