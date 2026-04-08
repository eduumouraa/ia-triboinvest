const axios = require('axios');
const config = require('../config');
const logger = require('../config/logger');
const { PRODUTOS } = require('../chatbot/salesScript');

const headers = () => ({
  Authorization: `Bearer ${config.kommo.accessToken}`,
  'Content-Type': 'application/json',
});

/**
 * Cria ou atualiza um lead no Kommo CRM.
 * @param {object} dadosLead - Dados coletados pelo chatbot
 * @param {string} fonte - Origem: 'instagram', 'whatsapp', 'landing_page'
 * @param {string} produto - Produto recomendado (PRODUTOS.TRIBO | PRODUTOS.ORG_FIN | PRODUTOS.NENHUM)
 * @returns {Promise<number>} ID do lead criado no Kommo
 */
async function criarLead(dadosLead, fonte, produto) {
  const { nome, objetivo, temDividas, experiencia, renda } = dadosLead;

  const nomeProduto = produto === PRODUTOS.TRIBO
    ? config.produtos.triboDoInvestidor.nome
    : produto === PRODUTOS.ORG_FIN
      ? config.produtos.organizacaoFinanceira.nome
      : 'Não qualificado';

  const stageId = produto === PRODUTOS.TRIBO
    ? config.kommo.stages.qualificadoTribo
    : produto === PRODUTOS.ORG_FIN
      ? config.kommo.stages.qualificadoOrgFin
      : config.kommo.stages.naoQualificado;

  const payload = [
    {
      name: `${nome || 'Lead sem nome'} - ${nomeProduto}`,
      pipeline_id: Number(config.kommo.pipelineId),
      status_id: Number(stageId) || undefined,
      tags: [
        { name: fonte },
        { name: produto },
        produto !== PRODUTOS.NENHUM ? { name: 'qualificado' } : { name: 'nao_qualificado' },
      ].filter(Boolean),
      custom_fields_values: montarCamposPersonalizados({
        objetivo,
        temDividas,
        experiencia,
        renda,
        fonte,
        produto: nomeProduto,
      }),
    },
  ];

  try {
    const response = await axios.post(
      `${config.kommo.baseUrl}/api/v4/leads`,
      payload,
      { headers: headers() }
    );
    const leadCriado = response.data._embedded.leads[0];
    logger.info('Lead criado no Kommo', { kommoLeadId: leadCriado.id, nome, produto });
    return leadCriado.id;
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    logger.error('Erro ao criar lead no Kommo', { detalhe, dadosLead });
    throw error;
  }
}

/**
 * Cria o contato associado ao lead no Kommo.
 * @param {string} leadId - ID do lead no Kommo
 * @param {object} dadosLead - Dados do contato
 * @param {string} platformId - ID do usuário na plataforma (Instagram ID, etc.)
 */
async function criarContato(leadId, dadosLead, platformId) {
  const { nome } = dadosLead;

  const payload = [
    {
      name: nome || 'Lead sem nome',
      custom_fields_values: [
        {
          field_code: 'INSTAGRAM',
          values: [{ value: platformId }],
        },
      ],
    },
  ];

  try {
    const response = await axios.post(
      `${config.kommo.baseUrl}/api/v4/contacts`,
      payload,
      { headers: headers() }
    );
    const contato = response.data._embedded.contacts[0];

    // Vincula contato ao lead
    await axios.patch(
      `${config.kommo.baseUrl}/api/v4/leads/${leadId}`,
      { _embedded: { contacts: [{ id: contato.id }] } },
      { headers: headers() }
    );

    logger.info('Contato criado e vinculado no Kommo', { leadId, contatoId: contato.id });
    return contato.id;
  } catch (error) {
    logger.error('Erro ao criar contato no Kommo', { error: error.message, leadId });
    // Não lança erro pois o lead já foi criado
  }
}

/**
 * Adiciona nota com o histórico da conversa ao lead no Kommo.
 */
async function adicionarNota(leadId, historicoConversa) {
  const resumo = formatarHistoricoParaNota(historicoConversa);

  try {
    await axios.post(
      `${config.kommo.baseUrl}/api/v4/leads/${leadId}/notes`,
      [{ note_type: 'common', params: { text: resumo } }],
      { headers: headers() }
    );
    logger.info('Nota adicionada ao lead no Kommo', { leadId });
  } catch (error) {
    logger.error('Erro ao adicionar nota no Kommo', { error: error.message, leadId });
  }
}

/**
 * Atualiza o estágio do lead no pipeline do Kommo.
 */
async function atualizarEstagio(leadId, estagio) {
  const stageId = config.kommo.stages[estagio];
  if (!stageId) return;

  try {
    await axios.patch(
      `${config.kommo.baseUrl}/api/v4/leads/${leadId}`,
      { status_id: Number(stageId) },
      { headers: headers() }
    );
    logger.info('Estágio do lead atualizado no Kommo', { leadId, estagio });
  } catch (error) {
    logger.error('Erro ao atualizar estágio no Kommo', { error: error.message, leadId });
  }
}

// --- Helpers ---

function montarCamposPersonalizados({ objetivo, temDividas, experiencia, renda, fonte, produto }) {
  const campos = [];

  const mapaObjetivo = {
    investir: 'Começar a investir',
    sair_dividas: 'Sair das dívidas',
    aprender: 'Aprender mais sobre investimentos',
    entender: 'Entender finanças',
  };

  const mapaRenda = {
    ate_2k: 'Até R$2.000',
    '2k_5k': 'R$2.000 a R$5.000',
    '5k_10k': 'R$5.000 a R$10.000',
    acima_10k: 'Acima de R$10.000',
  };

  // Adicione os IDs reais dos campos personalizados do seu Kommo abaixo
  // Você pode criar campos em Configurações > Campos no Kommo
  if (objetivo) campos.push({ field_code: 'CF_OBJETIVO', values: [{ value: mapaObjetivo[objetivo] || objetivo }] });
  if (temDividas !== undefined) campos.push({ field_code: 'CF_TEM_DIVIDAS', values: [{ value: temDividas ? 'Sim' : 'Não' }] });
  if (experiencia) campos.push({ field_code: 'CF_EXPERIENCIA', values: [{ value: experiencia }] });
  if (renda) campos.push({ field_code: 'CF_RENDA', values: [{ value: mapaRenda[renda] || renda }] });
  if (fonte) campos.push({ field_code: 'CF_FONTE', values: [{ value: fonte }] });
  if (produto) campos.push({ field_code: 'CF_PRODUTO_INDICADO', values: [{ value: produto }] });

  return campos;
}

function formatarHistoricoParaNota(historico) {
  if (!historico || historico.length === 0) return 'Sem histórico de conversa disponível.';

  return historico
    .filter((h) => h.role === 'user' || h.role === 'assistant')
    .map((h) => `[${h.role === 'user' ? 'LEAD' : 'BOT'}]: ${String(h.content).substring(0, 300)}`)
    .join('\n')
    .substring(0, 3000); // Limite de caracteres do Kommo
}

/**
 * Adiciona uma mensagem do bot como nota interna no lead do Kommo.
 * O prefixo [BOT] identifica notas geradas pelo agente, evitando loop de respostas.
 *
 * @param {string} leadId - ID do lead no Kommo
 * @param {string} mensagem - Texto gerado pelo agente de IA
 * @param {string} [prefixo] - Rótulo opcional (ex: 'Primeira Mensagem', 'Resposta')
 */
async function adicionarMensagemBot(leadId, mensagem, prefixo = 'Bot') {
  const texto = `[BOT] ${prefixo}:\n\n${mensagem}`;

  try {
    await axios.post(
      `${config.kommo.baseUrl}/api/v4/leads/${leadId}/notes`,
      [{ note_type: 'common', params: { text: texto } }],
      { headers: headers() }
    );
    logger.info('Mensagem do bot adicionada ao lead no Kommo', { leadId, prefixo });
  } catch (error) {
    logger.error('Erro ao adicionar mensagem do bot no Kommo', { error: error.message, leadId });
    throw error;
  }
}

/**
 * Busca os dados de um lead no Kommo pelo ID.
 * @param {string} leadId
 * @returns {Promise<object>} Dados do lead
 */
async function buscarLead(leadId) {
  try {
    const response = await axios.get(
      `${config.kommo.baseUrl}/api/v4/leads/${leadId}`,
      { headers: headers() }
    );
    return response.data;
  } catch (error) {
    logger.error('Erro ao buscar lead no Kommo', { error: error.message, leadId });
    throw error;
  }
}

module.exports = { criarLead, criarContato, adicionarNota, atualizarEstagio, adicionarMensagemBot, buscarLead };
