require('dotenv').config();

module.exports = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5-20251001',
  },

  meta: {
    accessToken: process.env.META_ACCESS_TOKEN,
    verifyToken: process.env.META_VERIFY_TOKEN,
    appSecret: process.env.META_APP_SECRET,
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    graphApiUrl: 'https://graph.facebook.com/v19.0',
  },

  kommo: {
    baseUrl: process.env.KOMMO_BASE_URL,
    accessToken: process.env.KOMMO_ACCESS_TOKEN,
    pipelineId: process.env.KOMMO_PIPELINE_ID,
    stages: {
      novoLead: process.env.KOMMO_STAGE_NOVO_LEAD,
      qualificadoTribo: process.env.KOMMO_STAGE_QUALIFICADO_TRIBO,
      qualificadoOrgFin: process.env.KOMMO_STAGE_QUALIFICADO_ORG_FIN,
      naoQualificado: process.env.KOMMO_STAGE_NAO_QUALIFICADO,
    },
  },

  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    url: process.env.SERVER_URL,
  },

  produtos: {
    planoEuropa: {
      nome: 'Plano Europa',
      descricao: 'Acompanhamento completo de investimentos da Tribo Invest',
      preco: process.env.PRECO_PLANO_EUROPA || 'R$ 97,00/mês',
      garantia: process.env.GARANTIA_PLANO_EUROPA || '7 dias com devolução integral',
      link: process.env.LINK_PLANO_EUROPA || 'https://pay.hotmart.com/Y105795773S?off=0f638afj&bid=1780536748790',
    },
  },
};
