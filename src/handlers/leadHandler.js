const { processarMensagem, mensagemBoasVindas } = require('../chatbot/conversationEngine');
const { obterOuCriarSessao, salvarSessao } = require('../sessions/sessionManager');
const { criarLead, criarContato, adicionarNota } = require('../integrations/kommo');
const logger = require('../config/logger');
const { ETAPAS } = require('../chatbot/salesScript');

/**
 * Handler central que processa qualquer mensagem recebida de qualquer canal.
 * Retorna a(s) resposta(s) que devem ser enviadas ao lead.
 *
 * @param {string} platformId - ID único do usuário na plataforma
 * @param {string} mensagem - Texto recebido
 * @param {string} fonte - Canal de origem: 'instagram', 'whatsapp', 'landing_page'
 * @returns {Promise<string[]>} - Array de mensagens para enviar
 */
async function processarLeadIncoming(platformId, mensagem, fonte = 'desconhecido') {
  const sessao = obterOuCriarSessao(platformId, fonte);
  const respostas = [];

  // Primeiro contato: envia boas-vindas automaticamente
  if (!sessao.boasVindasEnviada) {
    const boasVindas = mensagemBoasVindas();
    respostas.push(boasVindas);
    sessao.boasVindasEnviada = true;
    salvarSessao(platformId, sessao);

    // Se a mensagem recebida foi apenas um "oi", não processa mais
    const msgNormalizada = mensagem.trim().toLowerCase();
    const apenasGreeting = ['oi', 'olá', 'ola', 'oii', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite'].some(
      (g) => msgNormalizada === g || msgNormalizada.startsWith(g + ' ')
    );

    if (apenasGreeting) {
      return respostas;
    }
  }

  // Conversa já encerrada
  if (sessao.encerrada) {
    respostas.push('Obrigado pelo contato! Em breve um especialista vai entrar em contato. 😊');
    return respostas;
  }

  try {
    const { resposta, sessaoAtualizada } = await processarMensagem(mensagem, sessao);
    respostas.push(resposta);

    // Lead qualificado e conversa chegando ao fim → envia pro Kommo
    if (deveEnviarParaCRM(sessao, sessaoAtualizada)) {
      await enviarParaCRM(platformId, sessaoAtualizada);
    }

    salvarSessao(platformId, sessaoAtualizada);
  } catch (error) {
    logger.error('Erro ao processar mensagem do lead', { error: error.message, platformId });
    respostas.push(
      'Ops, tive um pequeno problema aqui! Pode repetir sua mensagem? 😊'
    );
  }

  return respostas;
}

/**
 * Verifica se é momento de enviar o lead para o CRM Kommo.
 * Envia quando a sessão chega na etapa de OFERTA ou ENCERRADO.
 */
function deveEnviarParaCRM(sessaoAnterior, sessaoAtualizada) {
  if (sessaoAtualizada.kommoLeadId) return false; // Já enviado

  const etapasQueEnviam = [
    ETAPAS.OFERTA_TRIBO,
    ETAPAS.OFERTA_ORG_FIN,
    ETAPAS.FECHAMENTO,
    ETAPAS.ENCERRADO,
  ];

  return (
    etapasQueEnviam.includes(sessaoAtualizada.etapa) &&
    !etapasQueEnviam.includes(sessaoAnterior.etapa)
  );
}

/**
 * Envia os dados do lead qualificado para o Kommo CRM.
 */
async function enviarParaCRM(platformId, sessao) {
  try {
    const { dadosLead, produtoRecomendado, fonte, historico } = sessao;

    logger.info('Enviando lead para Kommo', {
      leadId: sessao.leadId,
      produto: produtoRecomendado,
      fonte,
    });

    const kommoLeadId = await criarLead(dadosLead, fonte, produtoRecomendado);
    await criarContato(kommoLeadId, dadosLead, platformId);
    await adicionarNota(kommoLeadId, historico);

    // Salva o ID do Kommo na sessão para não duplicar
    sessao.kommoLeadId = kommoLeadId;

    logger.info('Lead enviado com sucesso para Kommo', { kommoLeadId, leadId: sessao.leadId });
  } catch (error) {
    logger.error('Falha ao enviar lead para Kommo', { error: error.message, leadId: sessao.leadId });
    // Não lança erro para não interromper a conversa com o lead
  }
}

module.exports = { processarLeadIncoming };
