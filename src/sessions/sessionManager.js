const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { ETAPAS } = require('../chatbot/salesScript');

// Cache em memória com TTL de 24h
// Em produção, troque por Redis para persistência entre reinicializações
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

/**
 * Cria ou recupera a sessão de um lead pelo ID da plataforma (ex: Instagram sender ID).
 * @param {string} platformId - ID único do usuário na plataforma (Instagram, WhatsApp, etc.)
 * @param {string} fonte - Origem do lead: 'instagram', 'whatsapp', 'landing_page', 'trafego_pago'
 */
function obterOuCriarSessao(platformId, fonte = 'desconhecido') {
  const chave = `sessao:${platformId}`;
  let sessao = cache.get(chave);

  if (!sessao) {
    sessao = criarNovaSessao(platformId, fonte);
    cache.set(chave, sessao);
    logger.info('Nova sessão criada', { leadId: sessao.leadId, fonte, platformId });
  }

  return sessao;
}

/**
 * Salva o estado atualizado da sessão.
 */
function salvarSessao(platformId, sessaoAtualizada) {
  const chave = `sessao:${platformId}`;
  cache.set(chave, sessaoAtualizada);
}

/**
 * Encerra e remove a sessão (usado após lead ir para o CRM).
 */
function encerrarSessao(platformId) {
  const chave = `sessao:${platformId}`;
  cache.del(chave);
  logger.info('Sessão encerrada', { platformId });
}

/**
 * Retorna todas as sessões ativas (útil para monitoramento).
 */
function sessoesAtivas() {
  const chaves = cache.keys().filter((k) => k.startsWith('sessao:'));
  return chaves.map((chave) => {
    const sessao = cache.get(chave);
    return {
      leadId: sessao.leadId,
      etapa: sessao.etapa,
      fonte: sessao.fonte,
      inicio: sessao.inicio,
      ultimaInteracao: sessao.ultimaInteracao,
      encerrada: sessao.encerrada,
    };
  });
}

function criarNovaSessao(platformId, fonte) {
  return {
    leadId: uuidv4(),
    platformId,
    fonte,
    etapa: ETAPAS.BOAS_VINDAS,
    dadosLead: {},
    produtoRecomendado: null,
    historico: [],
    kommoLeadId: null,
    inicio: new Date().toISOString(),
    ultimaInteracao: new Date().toISOString(),
    encerrada: false,
    boasVindasEnviada: false,
  };
}

module.exports = {
  obterOuCriarSessao,
  salvarSessao,
  encerrarSessao,
  sessoesAtivas,
};
