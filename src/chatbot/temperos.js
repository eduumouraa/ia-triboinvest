/**
 * TEMPEROS DE FECHAMENTO
 *
 * Estratégias de persuasão que a IA injeta naturalmente durante a conversa
 * para aumentar a taxa de conversão sem forçar a venda.
 *
 * 1. Ancoragem   → Valor percebido muito maior que o preço pedido
 * 2. Reciprocidade → Material gratuito cria "dívida de gratidão"
 * 3. Garantia    → Risco zero, decisão de compra mais fácil
 * 4. Curiosidade → Loops abertos que trazem o lead de volta
 */

const { PRODUTOS } = require('./salesScript');

// ─── 1. ANCORAGEM ────────────────────────────────────────────────────────────

/**
 * Compara o preço com algo do cotidiano para reduzir a percepção de custo.
 */
function gerarAncoragem(produto) {
  if (produto === PRODUTOS.TRIBO) {
    return {
      tipo: 'ancoragem',
      mensagem:
        'Só pra você ter uma noção: 12x R$ 97 dá R$ 3,23 por dia — menos que um café expresso. ' +
        'Por esse valor você tem acesso a mentorias, análises e uma comunidade inteira de investidores. ' +
        'O custo de não aprender pode ser muito maior que isso. 😉',
    };
  }

  return {
    tipo: 'ancoragem',
    mensagem:
      'R$ 97 no pagamento único. Menos do que uma consulta com um assessor financeiro ou a multa de um boleto em atraso. ' +
        'E esse é o método que pode te livrar de centenas (ou milhares) de reais em juros. ' +
        'O retorno começa logo no primeiro mês. 💡',
  };
}

// ─── 2. RECIPROCIDADE ────────────────────────────────────────────────────────

/**
 * Oferece conteúdo gratuito para criar reciprocidade antes do fechamento.
 */
function gerarReciprocidade(nome, produto) {
  if (produto === PRODUTOS.TRIBO) {
    return {
      tipo: 'reciprocidade',
      mensagem:
        `${nome}, quero te dar algo antes de qualquer decisão. ` +
        'Temos uma aula gratuita do Lucas sobre como montar uma carteira de investimentos do zero — ' +
        'sem precisar ser especialista. Posso te enviar o link? É sem compromisso. 🎁',
      material: 'aula_gratuita_tribo',
    };
  }

  return {
    tipo: 'reciprocidade',
    mensagem:
      `${nome}, independente de qualquer coisa, quero te enviar um material que o Lucas preparou: ` +
      'um guia rápido com os 3 primeiros passos para sair das dívidas. ' +
      'É grátis, sem compromisso. Posso mandar? 📄',
    material: 'guia_gratuito_org_fin',
  };
}

// ─── 3. GARANTIA ─────────────────────────────────────────────────────────────

/**
 * Reforça a garantia para eliminar o medo de errar.
 */
function gerarGarantia(nome, produto) {
  const nomeProduto =
    produto === PRODUTOS.TRIBO ? 'Tribo do Investidor' : 'Organização Financeira';

  return {
    tipo: 'garantia',
    mensagem:
      `${nome}, antes de qualquer decisão, uma coisa importante: ` +
      `a ${nomeProduto} tem garantia incondicional de 7 dias. ` +
      'Você entra, acessa tudo, participa de mentorias — e se por qualquer motivo não gostar, ' +
      'a gente devolve 100% do seu dinheiro. Sem pergunta, sem burocracia. ' +
      'O risco é completamente nosso. 🛡️',
  };
}

// ─── 4. CURIOSIDADE / LOOPS ───────────────────────────────────────────────────

/**
 * Cria um loop de curiosidade que traz o lead de volta amanhã.
 */
function gerarCuriosidade(nome, produto) {
  const ganchos = produto === PRODUTOS.TRIBO
    ? [
        `${nome}, amanhã teremos uma mentoria ao vivo onde o Lucas vai analisar uma oportunidade nova em Cripto e FIIs que poucos estão de olho. Quer participar? 👀`,
        `${nome}, o Lucas vai revelar amanhã na comunidade o ativo que está na sua carteira pessoal agora. Quero te contar quando sair — posso? 🔍`,
        `${nome}, essa semana a Tribo está com uma thread exclusiva sobre como viver de renda passiva com menos de R$ 1.000 investidos por mês. Curioso(a)? 📊`,
      ]
    : [
        `${nome}, o Lucas preparou um estudo de caso novo: um aluno que negociou R$ 30.000 de dívida com 70% de desconto. Amanhã conto como ele fez — posso? 📖`,
        `${nome}, semana que vem vou compartilhar um script de negociação de dívidas que nossa comunidade usa. Salvo pra te enviar quando sair? 💬`,
      ];

  const gancho = ganchos[Math.floor(Math.random() * ganchos.length)];
  return { tipo: 'curiosidade', mensagem: gancho };
}

// ─── SELETOR INTELIGENTE ──────────────────────────────────────────────────────

/**
 * Escolhe o tempero mais adequado para o momento da conversa.
 * @param {string} nome
 * @param {string} produto
 * @param {string} etapa - Etapa atual do funil
 * @param {string[]} temperosJaUsados - Quais temperos já foram usados nessa sessão
 */
function selecionarTempero(nome, produto, etapa, temperosJaUsados = []) {
  const disponiveis = ['ancoragem', 'reciprocidade', 'garantia', 'curiosidade'].filter(
    (t) => !temperosJaUsados.includes(t)
  );

  if (disponiveis.length === 0) return null;

  // Lógica de prioridade por etapa
  const prioridade = {
    situacao_financeira: 'reciprocidade', // Cedo no funil → dar antes de pedir
    experiencia: 'curiosidade',           // Engajar quem ainda está pesando
    renda: 'ancoragem',                   // Antes da oferta → ancorar o valor
    oferta_tribo: 'garantia',             // Na hora da oferta → eliminar medo
    oferta_org_fin: 'garantia',
    fechamento: 'ancoragem',
  };

  const preferido = prioridade[etapa];
  const escolhido = preferido && disponiveis.includes(preferido) ? preferido : disponiveis[0];

  switch (escolhido) {
    case 'ancoragem':     return gerarAncoragem(produto);
    case 'reciprocidade': return gerarReciprocidade(nome, produto);
    case 'garantia':      return gerarGarantia(nome, produto);
    case 'curiosidade':   return gerarCuriosidade(nome, produto);
    default:              return null;
  }
}

module.exports = {
  gerarAncoragem,
  gerarReciprocidade,
  gerarGarantia,
  gerarCuriosidade,
  selecionarTempero,
};
