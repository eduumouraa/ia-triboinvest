const axios = require('axios');
const config = require('../config');
const logger = require('../config/logger');

const GRAPH_URL = config.meta.graphApiUrl;

/**
 * Envia mensagem de texto via Instagram Direct (Messenger API for Instagram).
 * @param {string} recipientId - Instagram-scoped User ID do destinatário
 * @param {string} texto - Texto a enviar
 */
async function enviarMensagem(recipientId, texto) {
  const url = `${GRAPH_URL}/me/messages`;
  const payload = {
    recipient: { id: recipientId },
    message: { text: texto },
    messaging_type: 'RESPONSE',
  };

  try {
    const response = await axios.post(url, payload, {
      params: { access_token: config.meta.accessToken },
    });
    logger.info('Mensagem Instagram enviada', { recipientId, messageId: response.data.message_id });
    return response.data;
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    logger.error('Erro ao enviar mensagem Instagram', { recipientId, detalhe });
    throw error;
  }
}

/**
 * Marca a mensagem como "visto" para melhorar a experiência.
 */
async function marcarComoVisto(recipientId) {
  const url = `${GRAPH_URL}/me/messages`;
  try {
    await axios.post(
      url,
      {
        recipient: { id: recipientId },
        sender_action: 'mark_seen',
      },
      { params: { access_token: config.meta.accessToken } }
    );
  } catch {
    // Não crítico, pode falhar silenciosamente
  }
}

/**
 * Ativa o indicador de "digitando..." para dar sensação de resposta humana.
 */
async function mostrarDigitando(recipientId) {
  const url = `${GRAPH_URL}/me/messages`;
  try {
    await axios.post(
      url,
      {
        recipient: { id: recipientId },
        sender_action: 'typing_on',
      },
      { params: { access_token: config.meta.accessToken } }
    );
  } catch {
    // Não crítico
  }
}

/**
 * Valida a assinatura do webhook Meta para segurança.
 * @param {string} payload - Body da requisição como string
 * @param {string} signature - Header x-hub-signature-256
 */
function validarAssinatura(payload, signature) {
  const crypto = require('crypto');
  const esperada = `sha256=${crypto
    .createHmac('sha256', config.meta.appSecret)
    .update(payload)
    .digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(esperada), Buffer.from(signature));
}

/**
 * Extrai eventos de mensagem de um payload de webhook Instagram.
 * @param {object} body - Corpo do webhook
 * @returns {Array<{senderId, texto, timestamp}>}
 */
function extrairMensagens(body) {
  const mensagens = [];

  if (body.object !== 'instagram' && body.object !== 'page') return mensagens;

  for (const entry of body.entry || []) {
    for (const evento of entry.messaging || []) {
      if (!evento.message || evento.message.is_echo) continue;

      mensagens.push({
        senderId: evento.sender.id,
        recipientId: evento.recipient.id,
        texto: evento.message.text || '',
        timestamp: evento.timestamp,
        messageId: evento.message.mid,
      });
    }
  }

  return mensagens;
}

module.exports = { enviarMensagem, marcarComoVisto, mostrarDigitando, validarAssinatura, extrairMensagens };
