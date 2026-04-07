const express = require('express');
const router = express.Router();
const { validarAssinatura, extrairMensagens, enviarMensagem, marcarComoVisto, mostrarDigitando } = require('../integrations/instagram');
const { processarLeadIncoming } = require('../handlers/leadHandler');
const config = require('../config');
const logger = require('../config/logger');

/**
 * GET /webhook/instagram
 * Verificação do webhook pelo Facebook/Meta (obrigatório na configuração)
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.meta.verifyToken) {
    logger.info('Webhook Instagram verificado com sucesso');
    return res.status(200).send(challenge);
  }

  logger.warn('Falha na verificação do webhook Instagram', { mode, token });
  res.sendStatus(403);
});

/**
 * POST /webhook/instagram
 * Recebe eventos do Instagram (mensagens diretas, comentários, etc.)
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  // Responde 200 imediatamente para o Meta não reenviar o evento
  res.sendStatus(200);

  // Valida assinatura de segurança
  const signature = req.headers['x-hub-signature-256'];
  if (config.meta.appSecret && signature) {
    try {
      if (!validarAssinatura(req.body, signature)) {
        logger.warn('Assinatura do webhook inválida — mensagem ignorada');
        return;
      }
    } catch {
      logger.warn('Erro ao validar assinatura do webhook');
      return;
    }
  }

  let body;
  try {
    body = JSON.parse(req.body.toString());
  } catch {
    logger.error('Payload do webhook não é JSON válido');
    return;
  }

  const mensagens = extrairMensagens(body);

  for (const { senderId, texto } of mensagens) {
    if (!texto) continue;

    logger.info('Mensagem Instagram recebida', {
      senderId,
      texto: texto.substring(0, 60),
    });

    // Processa de forma assíncrona sem bloquear
    processar(senderId, texto).catch((err) =>
      logger.error('Erro no processamento assíncrono', { err: err.message, senderId })
    );
  }
});

async function processar(senderId, texto) {
  try {
    await marcarComoVisto(senderId);
    await mostrarDigitando(senderId);

    const respostas = await processarLeadIncoming(senderId, texto, 'instagram');

    for (const resposta of respostas) {
      // Pequena pausa entre mensagens para parecer mais natural
      if (respostas.indexOf(resposta) > 0) {
        await sleep(1200);
      }
      await enviarMensagem(senderId, resposta);
    }
  } catch (error) {
    logger.error('Erro ao processar e responder lead Instagram', { error: error.message, senderId });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = router;
