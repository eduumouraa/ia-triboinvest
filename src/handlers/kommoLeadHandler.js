const { processarMensagem, mensagemBoasVindas, TEMPERATURA } = require('../chatbot/conversationEngine');
const { obterOuCriarSessao, salvarSessao } = require('../sessions/sessionManager');
const { adicionarMensagemBot } = require('../integrations/kommo');
const { notificarLeadQuente } = require('../integrations/notificacaoHumano');
const { agendarCicloFollowUp, cancelarFollowUp } = require('../followup/followUpScheduler');
const logger = require('../config/logger');
const { ETAPAS, PRODUTOS } = require('../chatbot/salesScript');

// Prefixo para identificar notas do bot (evita loop de resposta)
const BOT_MARKER = '[BOT]';

/**
 * Processa um novo lead criado no Kommo via tráfego pago.
 * Gera a mensagem inicial do bot e a adiciona como nota no lead.
 *
 * Fontes típicas: Facebook Lead Ads, Instagram Ads, Google Ads
 * integrados nativamente ao Kommo.
 *
 * @param {object} leadKommo - Objeto do lead conforme payload do webhook Kommo
 */
async function processarNovoLeadKommo(leadKommo) {
  const leadId = String(leadKommo.id);
  const nomeCompleto = leadKommo.name || '';
  const fonte = detectarFonte(leadKommo);

  // ID da sessão = prefixo "kommo_" + leadId
  const platformId = `kommo_${leadId}`;

  const sessao = obterOuCriarSessao(platformId, fonte);

  // Evita reprocessar lead que já tem sessão iniciada
  if (sessao.boasVindasEnviada) {
    logger.info('Kommo: lead já tem sessão ativa, ignorando duplicata', { platformId });
    return;
  }

  // Pré-preenche nome do lead a partir dos dados do formulário
  const nome = extrairPrimeiroNome(nomeCompleto);
  if (nome) {
    sessao.dadosLead = { ...sessao.dadosLead, nome };
  }

  // Gera mensagem de boas-vindas
  const msgBoasVindas = mensagemBoasVindas();
  sessao.boasVindasEnviada = true;
  salvarSessao(platformId, sessao);

  // Adiciona mensagem do bot como nota no Kommo
  await adicionarMensagemBot(leadId, msgBoasVindas, 'Primeira Mensagem');

  // Agenda ciclo de follow-up preventivo
  // (o ciclo será refinado conforme a qualificação avança)
  agendarCicloFollowUp(
    platformId,
    {
      nome,
      produtoRecomendado: PRODUTOS.TRIBO,
      perfil: 'A',
      objetivoEmocional: null,
    },
    TEMPERATURA.MORNO
  );

  logger.info('Kommo: novo lead de tráfego pago processado', { platformId, nome, fonte, leadId });
}

/**
 * Processa uma nova nota adicionada a um lead existente no Kommo.
 * Ignora notas criadas pelo próprio bot para evitar loop infinito.
 *
 * Uso típico: o vendedor digita "Lead disse: quero investir mas tenho dívidas"
 * como nota no lead, e o bot responde com a próxima mensagem do script.
 *
 * @param {object} nota - Objeto de nota conforme payload do webhook Kommo
 */
async function processarMensagemKommo(nota) {
  // Ignora notas do bot (marcadas com [BOT])
  const textoNota = nota.params?.text || nota.text || '';
  if (textoNota.startsWith(BOT_MARKER)) return;

  // Apenas notas vinculadas a leads (element_type = 2)
  const elementType = Number(nota.element_type);
  if (elementType !== 2) return;

  const leadId = String(nota.element_id);
  if (!leadId) return;

  const platformId = `kommo_${leadId}`;
  const sessao = obterOuCriarSessao(platformId, 'kommo');

  if (sessao.encerrada) {
    logger.info('Kommo: sessão encerrada, ignorando nota', { platformId });
    return;
  }

  logger.info('Kommo: processando nota como mensagem do lead', {
    platformId,
    leadId,
    preview: textoNota.substring(0, 60),
  });

  try {
    const sessaoAnterior = { ...sessao };
    const { resposta, sessaoAtualizada } = await processarMensagem(textoNota, sessao);

    // Adiciona resposta do bot como nota no Kommo
    await adicionarMensagemBot(leadId, resposta, 'Resposta');

    // Salva sessão atualizada
    salvarSessao(platformId, sessaoAtualizada);

    // Notifica Eduardo se lead ficou quente
    if (
      sessaoAtualizada.temperatura === TEMPERATURA.QUENTE &&
      sessaoAnterior.temperatura !== TEMPERATURA.QUENTE
    ) {
      await notificarLeadQuente(sessaoAtualizada, 'kommo').catch(() => {});
      cancelarFollowUp(platformId);
    }

    // Lead fechou → cancela follow-up
    if (
      sessaoAtualizada.etapa === ETAPAS.FECHAMENTO_TRIBO ||
      sessaoAtualizada.etapa === ETAPAS.FECHAMENTO_ORG_FIN
    ) {
      cancelarFollowUp(platformId);
      sessaoAtualizada.converteu = true;
      salvarSessao(platformId, sessaoAtualizada);
    }

    logger.info('Kommo: resposta gerada com sucesso', { platformId, leadId });
  } catch (error) {
    logger.error('Kommo: erro ao processar nota', { error: error.message, leadId });
    await adicionarMensagemBot(
      leadId,
      'Ops, tive um problema ao processar sua mensagem. Pode repetir? 😊',
      'Erro'
    ).catch(() => {});
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectarFonte(leadKommo) {
  const tags = Array.isArray(leadKommo.tags) ? leadKommo.tags : [];
  const tagNames = tags.map((t) => (t.name || '').toLowerCase());

  if (tagNames.some((n) => n.includes('facebook'))) return 'facebook_ads';
  if (tagNames.some((n) => n.includes('instagram'))) return 'instagram_ads';
  if (tagNames.some((n) => n.includes('google'))) return 'google_ads';

  // Tenta detectar pela pipeline_id ou custom fields se disponíveis
  return 'trafego_pago';
}

function extrairPrimeiroNome(nomeCompleto) {
  if (!nomeCompleto) return null;
  // Remove sufixos adicionados pelo nosso criarLead (ex: "João - Tribo do Investidor")
  const semSufixo = nomeCompleto.split(' - ')[0].trim();
  // Retorna apenas o primeiro nome para uso informal
  return semSufixo.split(' ')[0] || semSufixo || null;
}

module.exports = { processarNovoLeadKommo, processarMensagemKommo };
