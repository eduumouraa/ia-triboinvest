const express = require('express');
const router = express.Router();
const { processarLeadIncoming } = require('../handlers/leadHandler');
const logger = require('../config/logger');

/**
 * POST /webhook/lead
 * Recebe leads vindos de:
 * - Landing pages (formulários)
 * - Tráfego pago (Facebook Ads Lead Forms, Google Ads)
 * - Integrações externas (Zapier, Make, etc.)
 *
 * Body esperado:
 * {
 *   "id": "identificador_unico_do_lead",  // ex: email, telefone, ou ID externo
 *   "nome": "...",
 *   "mensagem": "...",                    // mensagem inicial (opcional)
 *   "fonte": "facebook_ads|google_ads|landing_page|organico",
 *   "dados": {                            // dados extras do formulário (opcional)
 *     "email": "...",
 *     "telefone": "..."
 *   }
 * }
 */
router.post('/', express.json(), async (req, res) => {
  const { id, nome, mensagem, fonte, dados } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Campo "id" é obrigatório' });
  }

  logger.info('Lead recebido via landing page / tráfego pago', {
    id,
    nome,
    fonte,
  });

  try {
    // Mensagem inicial: usa o nome se disponível, senão uma saudação genérica
    const msgInicial = mensagem || `Olá${nome ? ', ' + nome : ''}! Quero saber mais.`;

    const respostas = await processarLeadIncoming(id, msgInicial, fonte || 'landing_page');

    res.json({
      success: true,
      respostas,
      mensagem: 'Lead processado. As respostas devem ser enviadas ao canal de contato do lead.',
    });
  } catch (error) {
    logger.error('Erro ao processar lead da landing page', { error: error.message, id });
    res.status(500).json({ error: 'Erro interno ao processar lead' });
  }
});

/**
 * POST /webhook/lead/mensagem
 * Continua a conversa de um lead que veio via formulário.
 * Útil quando o lead responde por email ou WhatsApp após receber o primeiro contato.
 */
router.post('/mensagem', express.json(), async (req, res) => {
  const { id, mensagem, fonte } = req.body;

  if (!id || !mensagem) {
    return res.status(400).json({ error: 'Campos "id" e "mensagem" são obrigatórios' });
  }

  try {
    const respostas = await processarLeadIncoming(id, mensagem, fonte || 'landing_page');
    res.json({ success: true, respostas });
  } catch (error) {
    logger.error('Erro ao processar mensagem do lead', { error: error.message, id });
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
