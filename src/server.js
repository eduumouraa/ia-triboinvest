require('dotenv').config();
const express = require('express');
const config = require('./config');
const logger = require('./config/logger');
const instagramWebhook = require('./webhooks/instagramWebhook');
const landingPageWebhook = require('./webhooks/landingPageWebhook');
const manychatWebhook = require('./webhooks/manychatWebhook');
const kommoWebhook = require('./webhooks/kommoWebhook');
const { sessoesAtivas } = require('./sessions/sessionManager');
const { iniciarAgendador, ciclosAtivos } = require('./followup/followUpScheduler');
const { enviarMensagem } = require('./integrations/instagram');

const app = express();

// ─── Inicializa agendador de follow-up ───────────────────────────────────────
// O agendador recebe a função de envio adequada ao canal
// Por ora aponta para Instagram; expandir para multi-canal conforme necessidade
iniciarAgendador(async (platformId, texto) => {
  try {
    await enviarMensagem(platformId, texto);
  } catch (err) {
    logger.error('Agendador: falha ao enviar follow-up', { platformId, err: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessoesAtivas: sessoesAtivas().length,
    followUpsCiclosAtivos: ciclosAtivos().length,
  });
});

// ─── Admin dashboard ──────────────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (process.env.ADMIN_TOKEN && token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
}

app.get('/admin/sessoes', adminAuth, (req, res) => {
  res.json({ sessoes: sessoesAtivas() });
});

app.get('/admin/followups', adminAuth, (req, res) => {
  res.json({ ciclos: ciclosAtivos() });
});

// ─── Webhooks ─────────────────────────────────────────────────────────────────
app.use('/webhook/instagram', instagramWebhook);
app.use('/webhook/manychat', manychatWebhook);
app.use('/webhook/lead', landingPageWebhook);
app.use('/webhook/kommo', kommoWebhook);

// ─── 404 / Error handler ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use((err, req, res, next) => {
  logger.error('Erro não tratado', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Agente IA Tribo Invest rodando na porta ${PORT} [${config.server.env}]`);
  logger.info('Rotas:');
  logger.info('  GET  /health');
  logger.info('  GET  /admin/sessoes         (x-admin-token)');
  logger.info('  GET  /admin/followups       (x-admin-token)');
  logger.info('  GET  /webhook/instagram     (verificação Meta)');
  logger.info('  POST /webhook/instagram     (DMs Instagram)');
  logger.info('  POST /webhook/manychat        (DMs via ManyChat)');
  logger.info('  POST /webhook/manychat/iniciar (primeiro contato ManyChat)');
  logger.info('  POST /webhook/lead            (landing pages / ads)');
  logger.info('  POST /webhook/lead/mensagem   (continuação de conversa)');
  logger.info('  POST /webhook/kommo           (Kommo CRM — tráfego pago)');
});

module.exports = app;
