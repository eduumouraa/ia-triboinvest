require('dotenv').config();

module.exports = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-opus-4-6',
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
    triboDoInvestidor: {
      nome: 'Tribo do Investidor',
      descricao: 'Comunidade completa de investimentos',
      preco: 'R$ 97,00/mês (ou 12x R$ 97,00)',
      link: process.env.LINK_TRIBO_DO_INVESTIDOR || '',
    },
    organizacaoFinanceira: {
      nome: 'Organização Financeira e Negociação de Dívidas',
      descricao: 'Método para organizar as finanças e sair das dívidas de vez',
      preco: 'R$ 97,00 (pagamento único)',
      link: process.env.LINK_ORG_FINANCEIRA || '',
    },
  },
};
