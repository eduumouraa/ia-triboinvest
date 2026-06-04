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

  [ETAPAS.BOAS_VINDAS]: () => {
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia!' : hora < 18 ? 'Boa tarde!' : 'Boa noite!';
    return `${saudacao}

Aqui é Edu, do time da Tribo Invest.

Vi que você interagiu no grupo sobre a Masterclass de hoje e queria entender melhor seu momento.

Hoje, você quer aprender a investir do zero ou já investe e sente falta de uma direção mais clara?`;
  },

  [ETAPAS.FECHAMENTO]: () => {
    const link = process.env.LINK_PLANO_EUROPA || 'https://pay.hotmart.com/Y105795773S?off=0f638afj&bid=1780536748790';
    return `Perfeito 🙏

Acredito que o acompanhamento pode agregar muito no seu processo.

Vou te passar agora as informações para você garantir sua entrada.

👉 *${link}*

Qualquer dúvida sobre o pagamento ou acesso, pode me chamar aqui. Estou por aqui. 💪`;
  },

};

module.exports = { ETAPAS, PRODUTOS, MENSAGENS, proximaEtapa, rotearProduto };
