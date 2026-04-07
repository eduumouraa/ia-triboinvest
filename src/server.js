require('dotenv').config();
const express = require('express');
const config = require('./config');
const logger = require('./config/logger');
const instagramWebhook = require('./webhooks/instagramWebhook');
const landingPageWebhook = require('./webhooks/landingPageWebhook');
const { sessoesAtivas } = require('./sessions/sessionManager');

const app = express();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessoesAtivas: sessoesAtivas().length,
  });
});

// Dashboard simples de sessões ativas (proteger em produção)
app.get('/admin/sessoes', (req, res) => {
  const authHeader = req.headers['x-admin-token'];
  if (process.env.ADMIN_TOKEN && authHeader !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  res.json({ sessoes: sessoesAtivas() });
});

// Webhooks
app.use('/webhook/instagram', instagramWebhook);
app.use('/webhook/lead', landingPageWebhook);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler global
app.use((err, req, res, next) => {
  logger.error('Erro não tratado', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Agente IA Tribo Invest rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${config.server.env}`);
  logger.info('Rotas ativas:');
  logger.info(`  GET  /health`);
  logger.info(`  GET  /webhook/instagram  (verificação Meta)`);
  logger.info(`  POST /webhook/instagram  (mensagens Instagram)`);
  logger.info(`  POST /webhook/lead       (landing pages / tráfego pago)`);
  logger.info(`  POST /webhook/lead/mensagem (continuação de conversa)`);
});

module.exports = app;
