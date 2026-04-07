/**
 * HANDLER DE OBJEÇÕES
 *
 * Detecta e classifica a objeção do lead com base no texto,
 * retorna o tipo de objeção para o salesScript gerar a resposta correta.
 *
 * Tipos de objeção mapeados:
 *   'caro'       → "tá caro", "não tenho dinheiro pra isso", "R$ 97 é muito"
 *   'pensar'     → "preciso pensar", "deixa eu ver", "vou falar com esposa"
 *   'tempo'      → "não tenho tempo", "muito corrido"
 *   'duvida'     → "tenho dúvida", "como funciona", "me explica melhor"
 *   'semDinheiro'→ "sem dinheiro", "apertado", "não posso agora"
 *   'desconfianca'→ "funciona mesmo?", "é golpe?", "vou pesquisar"
 *   null         → objeção não identificada (usar resposta genérica)
 */

const PADROES_OBJECAO = [
  {
    tipo: 'caro',
    padroes: [
      /\b(caro|custa|pagar|muito|elevado|não tenho esse|saig|sai caro|não vale|não compensa)\b/i,
      /r\$?\s*97.*(caro|muito|demais)/i,
    ],
  },
  {
    tipo: 'semDinheiro',
    padroes: [
      /\b(sem dinheiro|não tenho dinheiro|apertado|dinheiro curto|sem grana|sem condição|não posso pagar|endividado demais)\b/i,
      /\b(não sobra|não tem|impossível agora|inviável)\b/i,
    ],
  },
  {
    tipo: 'pensar',
    padroes: [
      /\b(pensar|refletir|ver|considerar|analisar|conversar com|falar com|decidir depois|depois|amanhã|semana que vem)\b/i,
      /\b(não sei|deixa eu|vou ver|preciso de tempo|não estou pronto)\b/i,
    ],
  },
  {
    tipo: 'tempo',
    padroes: [
      /\b(não tenho tempo|sem tempo|muito ocupado|corrido|agenda|trabalhando muito|cheio)\b/i,
    ],
  },
  {
    tipo: 'desconfianca',
    padroes: [
      /\b(funciona|golpe|fraude|scam|verdade|confiável|garantido|pesquisar|ver antes|checar|verificar|duvido)\b/i,
      /\b(já fui enganado|já passei por isso|não confio|como sei)\b/i,
    ],
  },
  {
    tipo: 'duvida',
    padroes: [
      /\b(dúvida|pergunta|como funciona|me explica|me conta|quero entender|não entendi|o que inclui|tem acesso|cancelo)\b/i,
    ],
  },
];

/**
 * Detecta o tipo de objeção na mensagem do lead.
 * @param {string} mensagem
 * @returns {string|null} tipo de objeção ou null
 */
function detectarObjecao(mensagem) {
  for (const { tipo, padroes } of PADROES_OBJECAO) {
    for (const padrao of padroes) {
      if (padrao.test(mensagem)) {
        return tipo;
      }
    }
  }
  return null;
}

/**
 * Verifica se a mensagem indica interesse positivo (quer fechar).
 */
function detectarInteressePositivo(mensagem) {
  const padroes = [
    /\b(sim|quero|quero entrar|me manda|manda o link|como faço|como compro|vou|topei|bora|fechado|feito|combinado)\b/i,
    /^(1|s|sim|ok|vai|yes|bora|topei|pode|manda|quero)[\s.!]*$/i,
  ];
  return padroes.some((p) => p.test(mensagem.trim()));
}

/**
 * Verifica se a mensagem é de recusa definitiva.
 */
function detectarRecusa(mensagem) {
  const padroes = [
    /\b(não quero|não tenho interesse|para|chega|não me mande|não quero mais|bloquear|tchau|até mais)\b/i,
    /^(n|não|nao|no|nunca)[\s.!]*$/i,
  ];
  return padroes.some((p) => p.test(mensagem.trim()));
}

/**
 * Gera resposta para pergunta de confiança/desconfiança sobre o produto.
 */
function responderDesconfianca(nome, produto) {
  const eProdutoTribo = produto === 'tribo_do_investidor';
  const nomeProduto = eProdutoTribo ? 'Tribo do Investidor' : 'Organização Financeira';

  return `${nome}, essa pergunta é super válida — e eu respeito muito quem questiona antes de decidir. 🙌

Deixa eu responder diretamente:

✅ A ${nomeProduto} é um produto real, do Lucas, que já ajudou centenas de pessoas.
✅ O pagamento é feito por uma plataforma segura (${eProdutoTribo ? 'checkout próprio Tribo Invest' : 'Eduzz — uma das maiores plataformas de pagamento do Brasil'}).
✅ A garantia de 7 dias é real — se não gostar, você pede o reembolso e recebe 100% de volta.

Não precisa confiar só na minha palavra. Você pode entrar, acessar tudo, e decidir depois de ver com seus próprios olhos.

O risco é zero. Literalmente. 🛡️

Quer que eu te mande o link agora?`;
}

module.exports = {
  detectarObjecao,
  detectarInteressePositivo,
  detectarRecusa,
  responderDesconfianca,
};
