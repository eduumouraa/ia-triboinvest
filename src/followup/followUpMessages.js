/**
 * CICLO DE PERSUASÃO — FOLLOW-UP 14 DIAS
 *
 * Toque 1 (Dia 3)  → Gatilho da Prova Social
 * Toque 2 (Dia 7)  → Gatilho da Dor vs. Desejo
 * Toque 3 (Dia 14) → Gatilho da Escassez e FOMO
 *
 * Regras inegociáveis:
 * - Nunca pressionar — follow-up é condução, nunca cobrança
 * - Nunca perguntar "Decidiu?" — usar gatilhos de valor
 * - Linguagem natural, curta e direta
 * - Sempre chamar pelo nome
 */

const { PRODUTOS } = require('../chatbot/salesScript');

// ─── PROVAS SOCIAIS (variações para evitar repetição) ───────────────────────

const PROVAS_SOCIAIS_TRIBO = [
  {
    historia: 'a Carla, professora de São Paulo, que em 6 meses montou sua carteira de FIIs e hoje recebe R$ 380 de renda passiva todo mês sem precisar vender nada',
    resultado: 'R$ 380/mês de renda passiva em 6 meses',
  },
  {
    historia: 'o Marcos, que era completamente iniciante e em 3 meses já tinha R$ 5.000 investidos com consistência, pagando menos de um cafezinho por dia na comunidade',
    resultado: 'R$ 5.000 investidos em 3 meses partindo do zero',
  },
  {
    historia: 'a Juliana, mãe de 2 filhos, que começou com R$ 200/mês e hoje tem mais de R$ 20.000 investidos — ela disse que o maior ganho foi a confiança pra tomar decisões sozinha',
    resultado: 'R$ 20.000 acumulados com consistência',
  },
];

const PROVAS_SOCIAIS_ORG_FIN = [
  {
    historia: 'o Rafael, que tinha R$ 18.000 de dívida no cartão e em 8 meses quitou tudo usando o método do curso — hoje está investindo pela primeira vez na vida',
    resultado: 'R$ 18.000 de dívida quitados em 8 meses',
  },
  {
    historia: 'a Fernanda, que estava no cheque especial há 2 anos e em 4 meses reorganizou tudo, negoiciou uma dívida com 60% de desconto e ficou no positivo',
    resultado: 'Saiu do cheque especial e negociou 60% de desconto',
  },
  {
    historia: 'o João, que achava que nunca ia conseguir investir por causa das dívidas — depois do curso, em 6 meses zerou o cartão e fez o primeiro aporte de R$ 500',
    resultado: 'Zerou as dívidas e começou a investir',
  },
];

// ─── BLOQUEIOS COMUNS ────────────────────────────────────────────────────────

const BLOQUEIOS = {
  tempo: 'falta de tempo para aprender',
  dinheiro: 'dinheiro apertado no momento',
  confianca: 'insegurança de não entender o suficiente',
  prioridade: 'outras prioridades na vida agora',
};

// ─── GERADOR DE MENSAGENS ────────────────────────────────────────────────────

/**
 * Toque 1 — Dia 3: Prova Social de Resultado
 * Faz o lead se enxergar no resultado de alguém que estava na mesma situação.
 */
function gerarToque1(nome, produto, indiceProva = 0) {
  const provas = produto === PRODUTOS.TRIBO ? PROVAS_SOCIAIS_TRIBO : PROVAS_SOCIAIS_ORG_FIN;
  const prova = provas[indiceProva % provas.length];

  const nomeProduto = produto === PRODUTOS.TRIBO ? 'Tribo do Investidor' : 'Organização Financeira';

  return `Oi ${nome}! 👋

Vi o resultado de ${prova.historia} e lembrei da nossa conversa.

Pra quem estava exatamente onde você está hoje, a diferença foi tomar uma decisão — mesmo com dúvida.

Se tiver curiosidade pra entender como isso aconteceu, me avisa que te conto mais. 😊`;
}

/**
 * Toque 2 — Dia 7: Dor vs. Desejo
 * Faz o lead verbalizar o bloqueio real. A IA mostra que entende a dor melhor que ele.
 */
function gerarToque2(nome, produto) {
  const contexto = produto === PRODUTOS.TRIBO
    ? 'sua meta de começar a investir com segurança'
    : 'seu plano de organizar as finanças e sair das dívidas';

  return `${nome}, uma pergunta honesta 👇

O que te fez pausar ${contexto}?

Na maioria das vezes é uma dessas três coisas:

1️⃣ Falta de tempo pra aprender
2️⃣ Dinheiro apertado no momento
3️⃣ Insegurança de não saber o suficiente

Qual o seu caso? Pergunto porque dependendo da resposta posso te ajudar de um jeito diferente — sem te empurrar pra nada.`;
}

/**
 * Toque 3 — Dia 14: Escassez e FOMO
 * Encerra o ciclo e gera urgência de decisão. Retira a oferta da mesa.
 */
function gerarToque3(nome, produto) {
  const nomeProduto = produto === PRODUTOS.TRIBO
    ? 'Tribo do Investidor'
    : 'Organização Financeira';

  return `${nome}, passando pra fechar nosso atendimento por aqui.

Entendo que pode não ser o momento certo pra você agora — tudo bem, cada um tem o seu tempo.

Só queria avisar que as condições que te apresentei não consigo garantir por muito mais tempo. O Lucas avalia periodicamente o acesso e os valores da ${nomeProduto}.

Se mudar de ideia, me manda uma mensagem e verifico os valores vigentes naquela época.

Muito obrigado pelo nosso papo e boa sorte na sua jornada financeira! 🙏`;
}

/**
 * Resposta ao bloqueio revelado no Toque 2.
 * Personaliza a resposta de acordo com o obstáculo do lead.
 */
function gerarRespostaAoBloqueio(nome, bloqueio, produto) {
  const nomeProduto = produto === PRODUTOS.TRIBO ? 'Tribo do Investidor' : 'Organização Financeira';

  const respostas = {
    tempo: `${nome}, esse é o mais comum — e tem solução! 😊

A comunidade foi feita pra quem tem rotina cheia. São vídeos curtos, resumos práticos e você acompanha no seu ritmo — não tem prova, não tem cronograma rígido.

Inclusive quem tem menos tempo pra errar é quem mais precisa de um caminho certo. Faz sentido?`,

    dinheiro: `${nome}, entendo completamente essa situação.

Só pra te dar uma perspectiva: R$ 97 dividido em 30 dias dá R$ 3,23 por dia — menos que um café. E o retorno de uma única decisão certa de investimento pode ser várias vezes esse valor.

Mas se o momento financeiro realmente não permite, respeito isso. Quando estiver pronto, é só me chamar. 💙`,

    confianca: `${nome}, sabe qual é a boa notícia? Você não precisa saber nada pra começar.

A ${nomeProduto} foi desenhada exatamente pra quem sente essa insegurança. O Lucas parte do zero, linguagem simples, sem enrolação.

E tem uma garantia de 7 dias: se entrar, assistir e achar que não é pra você, devolvo cada centavo sem burocracia. O risco é todo nosso. 💪`,

    prioridade: `${nome}, completamente válido. Cada fase da vida tem seu momento.

Só deixa eu te perguntar uma coisa: daqui a 1 ano, você quer estar exatamente onde está hoje em relação às suas finanças?

Se não, talvez esse seja o momento — mesmo imperfeito. Mas decida você, sem pressão. 😊`,
  };

  return respostas[bloqueio] || `${nome}, obrigado pela honestidade! Me conta mais pra eu entender melhor como posso ajudar. 😊`;
}

module.exports = {
  gerarToque1,
  gerarToque2,
  gerarToque3,
  gerarRespostaAoBloqueio,
  PROVAS_SOCIAIS_TRIBO,
  PROVAS_SOCIAIS_ORG_FIN,
};
