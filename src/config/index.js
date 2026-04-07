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
      descricao: 'Comunidade ativa de investimentos liderada pelo Lucas',
      preco: '12x R$ 97,00',
      precoAnual: 'R$ 997,00/ano',
      ancoragem: 'R$ 3,23 por dia — menos que um café',
      garantia: '7 dias com devolução integral',
      // Link real de compra — override via .env
      link: process.env.LINK_TRIBO_DO_INVESTIDOR || 'https://triboinvest.com.br/tribo-do-investidor/',
    },
    organizacaoFinanceira: {
      nome: 'Organização Financeira e Negociação de Dívidas',
      descricao: 'Método completo para organizar finanças e sair das dívidas',
      preco: 'R$ 97,00 (pagamento único)',
      ancoragem: 'menos do que um boleto de cartão em atraso',
      garantia: '7 dias com devolução integral',
      // Link real de compra — override via .env
      link: process.env.LINK_ORG_FINANCEIRA || 'https://chk.eduzz.com/8WPNOBJN0P',
    },
  },
};
