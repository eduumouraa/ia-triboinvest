const express = require('express');
const router = express.Router();
const { validarAssinatura, extrairMensagens, enviarMensagem, marcarComoVisto, mostrarDigitando } = require('../integrations/instagram');
const { processarLeadIncoming } = require('../handlers/leadHandler');
const { aguardarDelay, sleep } = require('../chatbot/humanization');
const config = require('../config');
const logger = require('../config/logger');

/**
 * GET /webhook/instagram
 * Verificação do webhook pelo Facebook/Meta
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
 * Recebe DMs do Instagram. Responde 200 imediatamente e processa assincronamente.
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  res.sendStatus(200);

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
    logger.info('DM Instagram recebida', { senderId, preview: texto.substring(0, 60) });

    // Processa assincronamente com delay de humanização
    processar(senderId, texto).catch((err) =>
      logger.error('Erro no processamento assíncrono', { err: err.message, senderId })
    );
  }
});

/**
 * Pipeline de processamento com humanização completa:
 * 1. Marca como visto imediatamente (lead vê que foi lido)
 * 2. Processa a mensagem e gera resposta
 * 3. Aguarda delay de 1 a 3 minutos (simula leitura + digitação)
 * 4. Ativa "digitando..." no Instagram
 * 5. Envia a resposta
 */
async function processar(senderId, texto) {
  try {
    // Marca visto imediatamente — sinal de presença humana
    await marcarComoVisto(senderId);

    // Gera a resposta (rápido — o delay vem depois)
    const respostas = await processarLeadIncoming(senderId, texto, 'instagram');

    // Aguarda delay humanizado antes de enviar (1-3 min em produção)
    await aguardarDelay();

    for (let i = 0; i < respostas.length; i++) {
      // Ativa "digitando..." antes de cada mensagem
      await mostrarDigitando(senderId);

      // Delay proporcional ao tamanho da mensagem (simula digitação real)
      const tempoDigitacao = Math.min(respostas[i].length * 25, 4000); // max 4s
      await sleep(tempoDigitacao);

      await enviarMensagem(senderId, respostas[i]);

      // Pausa entre mensagens múltiplas
      if (i < respostas.length - 1) {
        await sleep(1500);
      }
    }
  } catch (error) {
    logger.error('Erro ao processar e responder lead Instagram', { error: error.message, senderId });
  }
}

module.exports = router;
