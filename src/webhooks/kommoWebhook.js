const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { processarNovoLeadKommo, processarMensagemKommo } = require('../handlers/kommoLeadHandler');

/**
 * POST /webhook/kommo
 *
 * Recebe eventos do Kommo CRM.
 * Responde imediatamente com 200 e processa em background (Kommo exige resposta < 5s).
 *
 * Eventos tratados:
 *   leads[add]   → novo lead de tráfego pago (Facebook Lead Ads, Instagram Ads, etc.)
 *   notes[add]   → nova nota/mensagem em lead existente → IA responde
 *
 * Configuração no Kommo:
 *   Configurações → Integrações → Webhooks → Adicionar webhook
 *   URL: https://ia-triboinvest-production.up.railway.app/webhook/kommo?token=SEU_TOKEN
 *   Eventos: Leads → Adicionar, Notas → Adicionar
 *
 * Segurança:
 *   Adicione ?token=KOMMO_WEBHOOK_SECRET à URL configurada no Kommo.
 *   Configure KOMMO_WEBHOOK_SECRET no Railway.
 */
router.post(
  '/',
  express.urlencoded({ extended: true }),
  express.json(),
  async (req, res) => {
    // Verificação de token secreto (passado como query param ou header)
    const tokenRecebido = req.query.token || req.headers['x-kommo-token'];
    if (process.env.KOMMO_WEBHOOK_SECRET && tokenRecebido !== process.env.KOMMO_WEBHOOK_SECRET) {
      logger.warn('Kommo webhook: token inválido, acesso negado');
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Responde imediatamente — Kommo não precisa da nossa resposta de processamento
    res.json({ received: true });

    // Processa em background para não bloquear o ack
    setImmediate(async () => {
      try {
        const body = req.body;

        const leadsAdicionados = extrairLeads(body, 'add');
        const notasAdicionadas = extrairNotas(body, 'add');

        logger.info('Kommo webhook recebido', {
          leadsAdd: leadsAdicionados.length,
          notasAdd: notasAdicionadas.length,
        });

        // Novos leads de tráfego pago
        for (const lead of leadsAdicionados) {
          await processarNovoLeadKommo(lead).catch((err) =>
            logger.error('Kommo: falha ao processar novo lead', { err: err.message, leadId: lead.id })
          );
        }

        // Novas notas (mensagens do lead ou do vendedor)
        for (const nota of notasAdicionadas) {
          await processarMensagemKommo(nota).catch((err) =>
            logger.error('Kommo: falha ao processar nota', { err: err.message, notaId: nota.id })
          );
        }
      } catch (err) {
        logger.error('Kommo webhook: erro inesperado', { err: err.message });
      }
    });
  }
);

// ─── Parsers de payload ───────────────────────────────────────────────────────
//
// Kommo envia form-encoded com estrutura aninhada:
//   leads[add][0][id]=123&leads[add][0][name]=João
//
// O express.urlencoded({ extended: true }) já converte isso em:
//   { leads: { add: { '0': { id: '123', name: 'João' } } } }
//
// Também suporta JSON caso o Kommo seja configurado para isso.

function extrairLeads(body, evento) {
  const dados = body?.leads?.[evento];
  if (!dados) return [];
  return Array.isArray(dados) ? dados : Object.values(dados);
}

function extrairNotas(body, evento) {
  const dados = body?.notes?.[evento];
  if (!dados) return [];
  return Array.isArray(dados) ? dados : Object.values(dados);
}

module.exports = router;
