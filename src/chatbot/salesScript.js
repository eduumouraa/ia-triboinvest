/**
 * SCRIPT DE VENDAS — TRIBO INVEST
 * Produto: Plano Europa
 *
 * FLUXO:
 * BOAS_VINDAS → APRESENTACAO → PROPOSTA → [OBJECAO] → FECHAMENTO → ENCERRADO
 *
 * Princípio: construir VALOR antes de mostrar PREÇO.
 */

const ETAPAS = {
  BOAS_VINDAS: 'boas_vindas',
  APRESENTACAO: 'apresentacao',
  PROPOSTA: 'proposta',
  OBJECAO: 'objecao',
  FECHAMENTO: 'fechamento',
  ENCERRADO: 'encerrado',
};

const PRODUTOS = {
  PLANO_EUROPA: 'plano_europa',
  NENHUM: 'nao_qualificado',
};

function rotearProduto() {
  return PRODUTOS.PLANO_EUROPA;
}

function proximaEtapa(etapaAtual) {
  switch (etapaAtual) {
    case ETAPAS.BOAS_VINDAS:    return { etapa: ETAPAS.APRESENTACAO };
    case ETAPAS.APRESENTACAO:   return { etapa: ETAPAS.PROPOSTA };
    case ETAPAS.PROPOSTA:       return { etapa: ETAPAS.FECHAMENTO };
    case ETAPAS.OBJECAO:        return { etapa: ETAPAS.FECHAMENTO };
    case ETAPAS.FECHAMENTO:     return { etapa: ETAPAS.ENCERRADO };
    default:                    return { etapa: ETAPAS.ENCERRADO };
  }
}

// ─── MENSAGENS FIXAS ──────────────────────────────────────────────────────────

const MENSAGENS = {

  [ETAPAS.BOAS_VINDAS]: () =>
`Oi! Vi que você demonstrou interesse na Masterclass de hoje da Tribo Invest.

Antes de qualquer coisa, me conta:

1️⃣ Quero aprender a investir do zero
2️⃣ Já invisto, mas sinto falta de direção

Qual das duas opções mais te representa hoje?`,

  [ETAPAS.FECHAMENTO]: () => {
    const link = process.env.LINK_PLANO_EUROPA || 'https://pay.hotmart.com/Y105795773S?off=0f638afj&bid=1780536748790';
    return `Que ótimo! Acredito que o Plano Europa vai agregar muito no seu processo. 🙏

🌎 Segue o link da oferta:
${link}

Faz o pagamento e me manda o comprovante por aqui.`;
  },

};

module.exports = { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa, rotearProduto };
