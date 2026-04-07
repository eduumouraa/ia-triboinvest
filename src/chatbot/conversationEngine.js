const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa } = require('./salesScript');
const { classificarTemperatura, TEMPERATURA } = require('./leadTemperature');
const { selecionarTempero } = require('./temperos');

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

// ─── PROMPT DO AGENTE ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é a assistente comercial da Tribo Invest, uma comunidade de educação financeira e investimentos liderada pelo Lucas.

Sua missão é conduzir o lead por um funil de qualificação com calor humano, identificar o produto certo para o perfil dele e, quando o momento chegar, apresentar a oferta com convicção — mas sem pressão.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUTOS QUE VOCÊ REPRESENTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Tribo do Investidor — 12x R$ 97,00
  Para quem quer aprender a investir, já está organizado financeiramente ou quer crescer como investidor.
  Inclui: comunidade ativa, mentorias ao vivo com Lucas, carteiras recomendadas, análises exclusivas.

• Organização Financeira e Negociação de Dívidas — R$ 97,00 (pagamento único)
  Para quem tem dívidas, está desorganizado e precisa dar o primeiro passo.
  Inclui: método de organização do zero, estratégias de negociação, construção de reserva.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS INEGOCIÁVEIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NUNCA pressione. Follow-up é condução, nunca cobrança.
2. NUNCA pergunte "Decidiu?" ou "Vai comprar?". Use gatilhos de valor.
3. NUNCA pule etapas do funil.
4. SEMPRE chame o lead pelo nome quando souber.
5. Linguagem natural, curta e direta. Nunca soe como robô ou roteiro de spam.
6. Se o lead tiver dívidas, ofereça o Org. Financeira — não force a Tribo.
7. Se perguntar se você é IA, seja honesto: "Sou uma assistente virtual da Tribo Invest. Mas o que posso dizer é que meu objetivo é te ajudar de verdade, não te empurrar nada."
8. Nunca prometa o que não existe. Não invente números ou depoimentos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRATÉGIAS DE PERSUASÃO (use com naturalidade)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Ancoragem: Comparar R$ 97 com cafezinho (R$ 3,23/dia) ou custo de um erro financeiro.
• Reciprocidade: Oferecer material gratuito antes de vender cria gratidão genuína.
• Garantia: 7 dias de garantia incondicional. Risco é zero para o lead.
• Prova Social: Histórias reais de alunos que estavam na mesma situação.
• Escassez (só no encerramento): Não garantir condições futuras — nunca inventar vagas falsas.
• Curiosidade: Loops abertos ("amanhã o Lucas vai revelar...") que trazem o lead de volta.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERPRETAÇÃO DE RESPOSTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "1", "primeira opção", "opção um" → selecionar opção 1
• "tenho dívida", "tô devendo" → temDividas: true
• "quero investir", "começar a investir" → objetivo: "investir"
• "interessante", "parece bom" → sinal morno (não avançar para oferta ainda)
• "quanto custa", "como faço pra entrar", "quero" → sinal quente (lead pronto)
• "não tenho dinheiro", "tá caro" → objeção financeira → aplicar tempero de ancoragem
• "vou pensar" → objeção de tempo/confiança → aplicar curiosidade ou reciprocidade

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICAÇÃO DE TEMPERATURA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• QUENTE: Lead sinalizou intenção clara de compra → marcar como quente, notificar Eduardo.
• MORNO: Interessado mas com dúvidas → continuar conduzindo, injetar temperos.
• FRIO: Resistência alta ou desengajamento → não insistir, agendar follow-up suave.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (OBRIGATÓRIO — JSON PURO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "resposta": "mensagem exata para enviar ao lead",
  "dadosExtraidos": {
    "nome": "string ou null",
    "objetivo": "investir|sair_dividas|aprender|entender|null",
    "temDividas": true|false|null,
    "experiencia": "iniciante|basico|intermediario|avancado|null",
    "renda": "ate_2k|2k_5k|5k_10k|acima_10k|sem_renda|null",
    "interessado": true|false|null,
    "bloqueio": "tempo|dinheiro|confianca|prioridade|null"
  },
  "temperatura": "quente|morno|frio|null",
  "avancarEtapa": true|false,
  "encerrarConversa": true|false,
  "injetarTempero": true|false
}`;

// ─── PROCESSAMENTO PRINCIPAL ─────────────────────────────────────────────────

/**
 * Processa a mensagem do lead e retorna resposta + estado atualizado da sessão.
 */
async function processarMensagem(mensagemLead, sessao) {
  const historico = sessao.historico || [];
  const etapaAtual = sessao.etapa || ETAPAS.BOAS_VINDAS;
  const dadosLead = sessao.dadosLead || {};
  const temperosUsados = sessao.temperosUsados || [];

  logger.info('Processando mensagem', {
    leadId: sessao.leadId,
    etapa: etapaAtual,
    temperatura: sessao.temperatura,
    mensagem: mensagemLead.substring(0, 60),
  });

  // Seleciona tempero se for hora de injetar (a cada 2 etapas)
  const deveTentarTempero = historico.length > 2 && historico.length % 4 === 0;
  const temperoSugerido = deveTentarTempero
    ? selecionarTempero(dadosLead.nome, sessao.produtoRecomendado, etapaAtual, temperosUsados)
    : null;

  const contextoEtapa = `
ETAPA ATUAL: ${etapaAtual}
DADOS COLETADOS: ${JSON.stringify(dadosLead)}
PRODUTO RECOMENDADO: ${sessao.produtoRecomendado || 'ainda não determinado'}
TEMPERATURA ATUAL: ${sessao.temperatura || 'não classificada'}
TEMPEROS JÁ USADOS: ${temperosUsados.join(', ') || 'nenhum'}
${temperoSugerido ? `TEMPERO SUGERIDO PARA INJETAR (adapte naturalmente): "${temperoSugerido.mensagem}"` : ''}

MENSAGEM DO LEAD: "${mensagemLead}"

Interprete a mensagem, extraia dados, classifique a temperatura e gere a resposta para avançar no funil.
${temperoSugerido ? 'Se for natural, incorpore o tempero sugerido na resposta.' : ''}`;

  try {
    const completion = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        ...historico,
        { role: 'user', content: contextoEtapa },
      ],
    });

    const respostaRaw = completion.content[0].text.trim();

    let respostaParsed;
    try {
      const jsonMatch = respostaRaw.match(/\{[\s\S]*\}/);
      respostaParsed = JSON.parse(jsonMatch ? jsonMatch[0] : respostaRaw);
    } catch {
      logger.warn('Falha ao parsear JSON do Claude');
      respostaParsed = {
        resposta: respostaRaw,
        dadosExtraidos: {},
        temperatura: null,
        avancarEtapa: false,
        encerrarConversa: false,
        injetarTempero: false,
      };
    }

    // Mescla dados extraídos
    const dadosAtualizados = {
      ...dadosLead,
      ...Object.fromEntries(
        Object.entries(respostaParsed.dadosExtraidos || {}).filter(([, v]) => v !== null)
      ),
    };

    // Reclassifica temperatura com todos os dados disponíveis
    const { temperatura: novaTemperatura, pontuacao } = classificarTemperatura(
      dadosAtualizados,
      historico,
      sessao.pontuacaoTemperatura || 0
    );

    // Temperatura final: prioriza o que o Claude detectou se mais quente
    const temperaturaFinal = resolverTemperatura(
      sessao.temperatura,
      respostaParsed.temperatura,
      novaTemperatura
    );

    // Próxima etapa
    let proximaEtapaInfo = { etapa: etapaAtual };
    if (respostaParsed.avancarEtapa) {
      proximaEtapaInfo = proximaEtapa(etapaAtual, dadosAtualizados);
    }

    // Registra tempero usado
    const temperosAtualizados = [...temperosUsados];
    if (temperoSugerido && respostaParsed.injetarTempero) {
      temperosAtualizados.push(temperoSugerido.tipo);
    }

    // Atualiza histórico
    const historicoAtualizado = [
      ...historico,
      { role: 'user', content: contextoEtapa },
      { role: 'assistant', content: respostaRaw },
    ].slice(-24);

    const sessaoAtualizada = {
      ...sessao,
      etapa: proximaEtapaInfo.etapa,
      dadosLead: dadosAtualizados,
      produtoRecomendado: proximaEtapaInfo.produto || sessao.produtoRecomendado,
      temperatura: temperaturaFinal,
      pontuacaoTemperatura: pontuacao,
      temperosUsados: temperosAtualizados,
      historico: historicoAtualizado,
      ultimaInteracao: new Date().toISOString(),
      encerrada: respostaParsed.encerrarConversa || proximaEtapaInfo.etapa === ETAPAS.ENCERRADO,
    };

    return { resposta: respostaParsed.resposta, sessaoAtualizada };
  } catch (error) {
    logger.error('Erro ao processar com Claude', { error: error.message });
    throw error;
  }
}

/**
 * Resolve conflito entre temperatura anterior e a nova detecção.
 * Temperatura nunca "esfria" — um lead quente continua quente.
 */
function resolverTemperatura(anterior, detectadaClaude, calculada) {
  const ordem = [TEMPERATURA.FRIO, TEMPERATURA.MORNO, TEMPERATURA.QUENTE];
  const max = [anterior, detectadaClaude, calculada]
    .filter(Boolean)
    .reduce((melhor, atual) => {
      return ordem.indexOf(atual) > ordem.indexOf(melhor) ? atual : melhor;
    }, TEMPERATURA.FRIO);
  return max;
}

function mensagemBoasVindas() {
  return MENSAGENS[ETAPAS.BOAS_VINDAS]();
}

module.exports = { processarMensagem, mensagemBoasVindas, ETAPAS, PRODUTOS, TEMPERATURA };
