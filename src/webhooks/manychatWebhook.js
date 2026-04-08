const express = require('express');
const router = express.Router();
const { processarLeadIncoming } = require('../handlers/leadHandler');
const logger = require('../config/logger');

/**
 * POST /webhook/manychat
 *
 * Endpoint compatível com o External Request do ManyChat.
 * O ManyChat chama este endpoint quando o lead manda uma DM no Instagram.
 *
 * Payload recebido do ManyChat:
 * {
 *   "user_id":     "{{user_id}}",       ← ID único do contato no ManyChat
 *   "first_name":  "{{first_name}}",
 *   "last_name":   "{{last_name}}",
 *   "message":     "{{last_input_text}}", ← texto que o lead enviou
 *   "fonte":       "instagram"
 * }
 *
 * Resposta no formato ManyChat Dynamic Content v2:
 * {
 *   "version": "v2",
 *   "content": {
 *     "messages": [ { "type": "text", "text": "..." } ]
 *   }
 * }
 *
 * Timeout do ManyChat: 10 segundos.
 * Por isso o delay de humanização é desativado neste canal —
 * o ManyChat já adiciona o indicador de "digitando" por conta própria.
 */
router.post('/', express.json(), async (req, res) => {
  const { user_id, first_name, last_name, message, fonte } = req.body;

  if (!user_id || !message) {
    return res.status(400).json(erroManychat('Campos user_id e message são obrigatórios'));
  }

  const nome = [first_name, last_name].filter(Boolean).join(' ') || null;
  const platformId = `mc_${user_id}`;
  const canal = fonte || 'instagram';

  logger.info('Mensagem ManyChat recebida', {
    user_id,
    nome,
    canal,
    preview: message.substring(0, 60),
  });

  try {
    // Processa sem delay (ManyChat tem timeout de 10s)
    // O delay de humanização é controlado via env — aqui forçamos skip
    process.env._SKIP_HUMANIZATION = 'true';
    const respostas = await processarLeadIncoming(platformId, message, canal);
    process.env._SKIP_HUMANIZATION = 'false';

    // Converte array de respostas para formato ManyChat
    const messages = respostas.map((texto) => ({
      type: 'text',
      text: texto,
    }));

    // ManyChat suporta até 10 mensagens por resposta
    return res.json({
      version: 'v2',
      content: { messages: messages.slice(0, 10) },
    });
  } catch (error) {
    logger.error('Erro ao processar mensagem ManyChat', { error: error.message, user_id });
    return res.json(respostaFallback());
  }
});

/**
 * POST /webhook/manychat/iniciar
 *
 * Chamado quando o lead entra em contato pela primeira vez
 * (trigger de "Primeira Mensagem" no ManyChat).
 * Garante que a sessão é criada com a fonte correta.
 */
router.post('/iniciar', express.json(), async (req, res) => {
  const { user_id, first_name, last_name, fonte } = req.body;

  if (!user_id) {
    return res.status(400).json(erroManychat('Campo user_id é obrigatório'));
  }

  const platformId = `mc_${user_id}`;
  const canal = fonte || 'instagram';

  logger.info('Novo lead via ManyChat', { user_id, first_name, canal });

  try {
    process.env._SKIP_HUMANIZATION = 'true';
    const respostas = await processarLeadIncoming(platformId, 'oi', canal);
    process.env._SKIP_HUMANIZATION = 'false';

    return res.json({
      version: 'v2',
      content: {
        messages: respostas.map((texto) => ({ type: 'text', text: texto })).slice(0, 10),
      },
    });
  } catch (error) {
    logger.error('Erro ao iniciar sessão ManyChat', { error: error.message, user_id });
    return res.json(respostaFallback());
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function respostaFallback() {
  return {
    version: 'v2',
    content: {
      messages: [
        {
          type: 'text',
          text: 'Oi! Tive um pequeno problema aqui. Pode repetir sua mensagem? 😊',
        },
      ],
    },
  };
}

function erroManychat(msg) {
  return { version: 'v2', content: { messages: [{ type: 'text', text: msg }] } };
}

module.exports = router;
