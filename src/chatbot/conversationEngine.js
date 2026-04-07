const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa } = require('./salesScript');

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

/**
 * Prompt base do agente. Define a persona e as regras de comportamento.
 */
const SYSTEM_PROMPT = `Você é a assistente comercial da Tribo Invest, uma comunidade de educação financeira e investimentos liderada pelo Lucas.

Sua missão é:
1. Recepcionar leads com calor humano e empatia
2. Qualificá-los seguindo o script de vendas
3. Interpretar as respostas (mesmo que não sejam os números das opções)
4. Recomendar o produto certo com base no perfil do lead
5. Conduzir ao fechamento com naturalidade

PRODUTOS:
- Tribo do Investidor (12x R$97,00): Para quem quer aprender a investir, já está com as finanças organizadas ou quer crescer como investidor.
- Organização Financeira e Negociação de Dívidas (R$97,00 único): Para quem tem dívidas, está desorganizado financeiramente e precisa dar o primeiro passo.

REGRAS DE COMPORTAMENTO:
- Seja caloroso, próximo, use emojis com moderação
- Use linguagem simples, sem jargões
- Nunca minta ou force uma venda que não faz sentido pro lead
- Se o lead tiver dívidas, não empurre a Tribo — ofereça o Org. Financeira primeiro
- Se o lead perguntar algo fora do script, responda com naturalidade e volte ao fluxo
- Extraia as informações-chave: nome, objetivo, se tem dívidas, experiência com investimentos, renda aproximada
- Quando identificar o produto certo, apresente com entusiasmo genuíno
- Nunca revelar que é uma IA, a menos que perguntado diretamente — nesse caso, seja honesto

INTERPRETAÇÃO DE RESPOSTAS:
- "1", "primeira", "opção 1" → opção 1
- "tenho dívida", "devo no cartão" → tem dívidas = sim
- "quero investir", "começar a investir" → objetivo = investir
- "nunca investi" → experiência = iniciante
- Sempre confirme o entendimento antes de avançar se a resposta for ambígua

OUTPUT FORMAT:
Retorne APENAS um JSON válido com:
{
  "resposta": "mensagem para enviar ao lead",
  "dadosExtraidos": {
    "nome": "...",
    "objetivo": "investir|sair_dividas|aprender|entender|null",
    "temDividas": true|false|null,
    "experiencia": "iniciante|basico|intermediario|avancado|null",
    "renda": "ate_2k|2k_5k|5k_10k|acima_10k|sem_renda|null",
    "interessado": true|false|null
  },
  "avancarEtapa": true|false,
  "encerrarConversa": false
}`;

/**
 * Processa a mensagem do lead e retorna a resposta do agente.
 * @param {string} mensagemLead - Texto enviado pelo lead
 * @param {object} sessao - Estado atual da conversa (etapa, dados coletados, histórico)
 * @returns {Promise<{resposta: string, sessaoAtualizada: object}>}
 */
async function processarMensagem(mensagemLead, sessao) {
  const historico = sessao.historico || [];
  const etapaAtual = sessao.etapa || ETAPAS.BOAS_VINDAS;
  const dadosLead = sessao.dadosLead || {};

  logger.info('Processando mensagem', {
    leadId: sessao.leadId,
    etapa: etapaAtual,
    mensagem: mensagemLead.substring(0, 50),
  });

  // Monta contexto rico para o Claude
  const contextoEtapa = `
ETAPA ATUAL: ${etapaAtual}
DADOS JÁ COLETADOS: ${JSON.stringify(dadosLead)}
PRODUTO RECOMENDADO (se já determinado): ${sessao.produtoRecomendado || 'ainda não determinado'}

MENSAGEM DO LEAD: "${mensagemLead}"

Interprete a mensagem, extraia dados relevantes, e gere a resposta adequada para avançar no funil.
Se a etapa for BOAS_VINDAS e ainda não temos o nome, pergunte o nome.
Se já temos o nome, avance para a próxima pergunta do script.
`;

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

    // Parse do JSON retornado pelo Claude
    let respostaParsed;
    try {
      const jsonMatch = respostaRaw.match(/\{[\s\S]*\}/);
      respostaParsed = JSON.parse(jsonMatch ? jsonMatch[0] : respostaRaw);
    } catch {
      logger.warn('Falha ao parsear JSON do Claude, usando resposta bruta');
      respostaParsed = {
        resposta: respostaRaw,
        dadosExtraidos: {},
        avancarEtapa: false,
        encerrarConversa: false,
      };
    }

    // Mescla dados extraídos com os já coletados
    const dadosAtualizados = {
      ...dadosLead,
      ...Object.fromEntries(
        Object.entries(respostaParsed.dadosExtraidos || {}).filter(([, v]) => v !== null)
      ),
    };

    // Determina próxima etapa
    let proximaEtapaInfo = { etapa: etapaAtual };
    if (respostaParsed.avancarEtapa) {
      proximaEtapaInfo = proximaEtapa(etapaAtual, dadosAtualizados);
    }

    // Atualiza histórico para manter contexto
    const historicoAtualizado = [
      ...historico,
      { role: 'user', content: contextoEtapa },
      { role: 'assistant', content: respostaRaw },
    ].slice(-20); // Mantém últimas 20 mensagens para não estourar contexto

    const sessaoAtualizada = {
      ...sessao,
      etapa: proximaEtapaInfo.etapa,
      dadosLead: dadosAtualizados,
      produtoRecomendado: proximaEtapaInfo.produto || sessao.produtoRecomendado,
      historico: historicoAtualizado,
      ultimaInteracao: new Date().toISOString(),
      encerrada: respostaParsed.encerrarConversa || proximaEtapaInfo.etapa === ETAPAS.ENCERRADO,
    };

    return {
      resposta: respostaParsed.resposta,
      sessaoAtualizada,
    };
  } catch (error) {
    logger.error('Erro ao processar mensagem com Claude', { error: error.message });
    throw error;
  }
}

/**
 * Gera mensagem inicial de boas-vindas para um novo lead.
 */
function mensagemBoasVindas() {
  return MENSAGENS[ETAPAS.BOAS_VINDAS]();
}

module.exports = { processarMensagem, mensagemBoasVindas, ETAPAS, PRODUTOS };
