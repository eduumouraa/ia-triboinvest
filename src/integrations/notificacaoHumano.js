/**
 * NOTIFICAÇÃO PARA HUMANO — ESCALAÇÃO DE LEAD QUENTE
 *
 * Quando a IA detecta um lead quente, notifica Eduardo para fechar pessoalmente.
 * Canais de notificação configuráveis: WhatsApp, Telegram, ou ambos.
 */

const axios = require('axios');
const logger = require('../config/logger');

/**
 * Notifica Eduardo sobre um lead quente para fechamento manual.
 * @param {object} sessao - Sessão completa com dados do lead
 * @param {string} plataforma - 'instagram', 'whatsapp', etc.
 */
async function notificarLeadQuente(sessao, plataforma) {
  const { dadosLead, produtoRecomendado, platformId, leadId } = sessao;

  const resumo = montarResumoLead(dadosLead, produtoRecomendado, platformId, plataforma, leadId);

  logger.info('Escalando lead quente para Eduardo', {
    leadId,
    nome: dadosLead.nome,
    produto: produtoRecomendado,
  });

  const erros = [];

  // Notificação via WhatsApp (usando API Meta ou Twilio)
  if (process.env.EDUARDO_WHATSAPP && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      await notificarViaWhatsApp(process.env.EDUARDO_WHATSAPP, resumo);
    } catch (e) {
      erros.push(`WhatsApp: ${e.message}`);
    }
  }

  // Notificação via Telegram
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      await notificarViaTelegram(resumo);
    } catch (e) {
      erros.push(`Telegram: ${e.message}`);
    }
  }

  if (erros.length > 0) {
    logger.warn('Falhas parciais na notificação de lead quente', { erros });
  }
}

/**
 * Envia notificação de lead quente via WhatsApp Business API.
 */
async function notificarViaWhatsApp(numeroEduardo, resumo) {
  const config = require('../config');
  const url = `${config.meta.graphApiUrl}/${config.meta.whatsappPhoneNumberId}/messages`;

  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: numeroEduardo,
      type: 'text',
      text: { body: resumo },
    },
    {
      headers: {
        Authorization: `Bearer ${config.meta.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  logger.info('Notificação WhatsApp enviada para Eduardo');
}

/**
 * Envia notificação via Telegram Bot.
 */
async function notificarViaTelegram(resumo) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: resumo,
    parse_mode: 'Markdown',
  });

  logger.info('Notificação Telegram enviada para Eduardo');
}

function montarResumoLead(dadosLead, produto, platformId, plataforma, leadId) {
  const { nome, objetivo, temDividas, renda, experiencia } = dadosLead;

  const mapaRenda = {
    ate_2k: 'Até R$2k',
    '2k_5k': 'R$2k-R$5k',
    '5k_10k': 'R$5k-R$10k',
    acima_10k: 'Acima de R$10k',
  };

  const mapaObjetivo = {
    investir: 'Começar a investir',
    sair_dividas: 'Sair das dívidas',
    aprender: 'Aprender mais',
    entender: 'Entender finanças',
  };

  const nomeProduto = produto === 'tribo_do_investidor' ? 'Tribo do Investidor (12x R$97)' : 'Org. Financeira (R$97)';

  return `🔥 *LEAD QUENTE — FECHAR AGORA*

👤 *Nome:* ${nome || 'Não informado'}
📱 *Canal:* ${plataforma} | ID: ${platformId}
🎯 *Produto:* ${nomeProduto}
🏦 *Objetivo:* ${mapaObjetivo[objetivo] || objetivo || 'N/A'}
💳 *Tem dívidas:* ${temDividas === true ? 'Sim' : temDividas === false ? 'Não' : 'N/A'}
💰 *Renda:* ${mapaRenda[renda] || renda || 'N/A'}
📊 *Experiência:* ${experiencia || 'N/A'}

🆔 Lead ID: ${leadId}

→ Responda agora enquanto o lead está quente!`;
}

/**
 * Notifica o especialista sobre um lead qualificado via ManyChat.
 * @param {object} dados - { nome, perfil, objetivo, renda, whatsapp, platformId, canal }
 */
async function notificarLeadManyChat(dados) {
  const { nome, perfil, objetivo, renda, whatsapp, platformId, canal } = dados;

  const resumo =
    `📋 *NOVO LEAD QUALIFICADO — MANYCHAT*\n\n` +
    `👤 *Nome:* ${nome}\n` +
    `📱 *WhatsApp:* ${whatsapp}\n` +
    `🎯 *Perfil:* ${perfil || 'N/A'}\n` +
    `💡 *Objetivo:* ${objetivo || 'N/A'}\n` +
    `💰 *Guarda por mês:* ${renda || 'N/A'}\n\n` +
    `📲 *Canal:* ${canal} | ID: ${platformId}\n\n` +
    `→ Entre em contato pelo WhatsApp acima!`;

  logger.info('Notificando especialista sobre lead ManyChat', { nome, whatsapp });

  const erros = [];

  if (process.env.EDUARDO_WHATSAPP && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      await notificarViaWhatsApp(process.env.EDUARDO_WHATSAPP, resumo);
    } catch (e) {
      erros.push(`WhatsApp: ${e.message}`);
    }
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      await notificarViaTelegram(resumo);
    } catch (e) {
      erros.push(`Telegram: ${e.message}`);
    }
  }

  if (erros.length > 0) {
    logger.warn('Falhas parciais na notificação de lead ManyChat', { erros });
  }
}

module.exports = { notificarLeadQuente, notificarLeadManyChat };
