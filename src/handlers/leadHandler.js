const { processarMensagem, mensagemBoasVindas, TEMPERATURA } = require('../chatbot/conversationEngine');
const { obterOuCriarSessao, salvarSessao } = require('../sessions/sessionManager');
const { criarLead, criarContato, adicionarNota } = require('../integrations/kommo');
const { notificarLeadQuente } = require('../integrations/notificacaoHumano');
const { agendarCicloFollowUp, cancelarFollowUp } = require('../followup/followUpScheduler');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS } = require('../chatbot/salesScript');

/**
 * Handler central — processa mensagens de qualquer canal.
 * Orquestra: conversa → temperatura → CRM → follow-up → escalação humana.
 *
 * @param {string} platformId - ID único do usuário na plataforma
 * @param {string} mensagem - Texto recebido
 * @param {string} fonte - Canal: 'instagram', 'whatsapp', 'landing_page'
 * @returns {Promise<string[]>} - Respostas para enviar ao lead
 */
async function processarLeadIncoming(platformId, mensagem, fonte = 'desconhecido') {
  const sessao = obterOuCriarSessao(platformId, fonte);
  const respostas = [];

  // Primeiro contato → boas-vindas automática
  if (!sessao.boasVindasEnviada) {
    respostas.push(mensagemBoasVindas());
    sessao.boasVindasEnviada = true;
    salvarSessao(platformId, sessao);

    // Se só mandou um "oi", aguarda próxima mensagem com o nome
    if (apenasGreeting(mensagem)) {
      return respostas;
    }
  }

  // Sessão encerrada → mensagem de encerramento
  if (sessao.encerrada) {
    respostas.push(
      'Obrigado pelo contato! Em breve um dos nossos especialistas vai entrar em contato. 😊'
    );
    return respostas;
  }

  try {
    const sessaoAnterior = { ...sessao };
    const { resposta, sessaoAtualizada } = await processarMensagem(mensagem, sessao);
    respostas.push(resposta);

    // Ações pós-processamento (não bloqueiam a resposta ao lead)
    executarAcoesPosMensagem(sessaoAnterior, sessaoAtualizada, platformId, fonte).catch((err) =>
      logger.error('Erro nas ações pós-mensagem', { err: err.message, platformId })
    );

    salvarSessao(platformId, sessaoAtualizada);
  } catch (error) {
    logger.error('Erro ao processar mensagem', { error: error.message, platformId });
    respostas.push('Ops, tive um pequeno problema aqui! Pode repetir? 😊');
  }

  return respostas;
}

/**
 * Executa side-effects depois de processar a mensagem:
 * - Envia ao CRM quando qualificado
 * - Notifica Eduardo se lead ficou quente
 * - Agenda follow-up se lead não converteu
 * - Cancela follow-up se lead fechou
 */
async function executarAcoesPosMensagem(sessaoAnterior, sessaoAtualizada, platformId, fonte) {
  const { temperatura, etapa, encerrada, dadosLead, produtoRecomendado } = sessaoAtualizada;

  // 1. Lead QUENTE → notificar Eduardo + enviar ao CRM imediatamente
  if (temperatura === TEMPERATURA.QUENTE && sessaoAnterior.temperatura !== TEMPERATURA.QUENTE) {
    logger.info('Lead ficou QUENTE — escalando para Eduardo', { platformId });
    await notificarLeadQuente(sessaoAtualizada, fonte).catch(() => {});
    await enviarParaCRM(platformId, sessaoAtualizada);
    cancelarFollowUp(platformId); // Lead quente vai pro Eduardo, não pro follow-up automático
    return;
  }

  // 2. Chegou na oferta → envia ao CRM com estágio correto
  if (deveEnviarParaCRM(sessaoAnterior, sessaoAtualizada)) {
    await enviarParaCRM(platformId, sessaoAtualizada);
  }

  // 3. Conversa encerrada sem compra → agendar ciclo de follow-up 14 dias
  if (encerrada && !sessaoAtualizada.converteu && !sessaoAtualizada.followUpAgendado) {
    const produtoDefinido = produtoRecomendado && produtoRecomendado !== PRODUTOS.NENHUM;
    if (produtoDefinido && dadosLead.nome) {
      agendarCicloFollowUp(
        platformId,
        {
          ...dadosLead,
          produtoRecomendado,
          perfil: sessaoAtualizada.perfil,
          objetivoEmocional: sessaoAtualizada.objetivoEmocional,
        },
        temperatura || TEMPERATURA.MORNO
      );
      sessaoAtualizada.followUpAgendado = true;
    }
  }

  // 4. Lead fechou → cancelar follow-up e marcar como convertido
  if (etapa === ETAPAS.FECHAMENTO && !sessaoAnterior.converteu) {
    cancelarFollowUp(platformId);
    sessaoAtualizada.converteu = true;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deveEnviarParaCRM(sessaoAnterior, sessaoAtualizada) {
  if (sessaoAtualizada.kommoLeadId) return false;

  const etapasQueEnviam = [ETAPAS.PROPOSTA, ETAPAS.OBJECAO, ETAPAS.FECHAMENTO, ETAPAS.ENCERRADO];
  return (
    etapasQueEnviam.includes(sessaoAtualizada.etapa) &&
    !etapasQueEnviam.includes(sessaoAnterior.etapa)
  );
}

async function enviarParaCRM(platformId, sessao) {
  try {
    const { dadosLead, produtoRecomendado, fonte, historico } = sessao;
    const kommoLeadId = await criarLead(dadosLead, fonte, produtoRecomendado);
    await criarContato(kommoLeadId, dadosLead, platformId);
    await adicionarNota(kommoLeadId, historico);
    sessao.kommoLeadId = kommoLeadId;
    logger.info('Lead enviado ao Kommo', { kommoLeadId, nome: dadosLead.nome });
  } catch (error) {
    logger.error('Falha ao enviar ao Kommo', { error: error.message });
  }
}

function apenasGreeting(mensagem) {
  const greetings = ['oi', 'olá', 'ola', 'oii', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite'];
  const normalizada = mensagem.trim().toLowerCase();
  return greetings.some((g) => normalizada === g || normalizada.startsWith(g + ' '));
}

module.exports = { processarLeadIncoming };
