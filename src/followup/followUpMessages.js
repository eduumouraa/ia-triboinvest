/**
 * CICLO DE PERSUASÃO — 3 CAMINHOS POR PERFIL
 *
 * Perfil A (Iniciante)  → Segurança, Medo, Comunidade
 * Perfil B (Investidor) → Evolução, Análise, Consistência
 * Perfil C (SCP/SPE)    → Oportunidade, Exclusividade, Alta Performance
 *
 * Cada perfil tem mensagens de D+3, D+7 e D+14 completamente distintas.
 * O objetivo emocional do lead (aposentadoria, família, liberdade...) é injetado
 * para criar afinidade e mostrar que a IA "lembra" do que ele disse.
 */

const { PERFIL, textoObjetivoEmocional } = require('../chatbot/leadProfiles');
const { PRODUTOS } = require('../chatbot/salesScript');

// ─── PERFIL A — INICIANTE ─────────────────────────────────────────────────────

const CAMINHO_A = {
  toque1: (nome, objetivoEmocional) => {
    const objetivo = textoObjetivoEmocional(objetivoEmocional);
    return `Oi ${nome}! 👋

Vi esse depoimento de uma aluna que, como você, tinha medo de perder dinheiro.

Ela começou com R$ 100 — sem saber nada — e hoje já tem a reserva de emergência dela montada e faz aportes todo mês com tranquilidade.

Lembrei da nossa conversa sobre ${objetivo}. Às vezes a gente só precisa do ambiente certo pra dar o primeiro passo sem medo. 😊`;
  },

  toque2: (nome, objetivoEmocional) => {
    const objetivo = textoObjetivoEmocional(objetivoEmocional);
    return `${nome}, uma pergunta rápida e honesta 👇

O que mais te trava hoje em relação a ${objetivo}:

1️⃣ O medo de errar e perder dinheiro sozinho
2️⃣ Falta de um passo a passo claro pra começar
3️⃣ Não saber em quem confiar

A maioria dos membros da Tribo sentia exatamente isso antes de entrar. Me conta qual é o seu — sem compromisso.`;
  },

  toque3: (nome) => {
    return `${nome}, passando pra um aviso importante.

Notei que ainda não é o seu momento de priorizar seus investimentos — e tudo bem, respeito isso.

Vou encerrar o seu atendimento por aqui para focar nos membros que vão entrar na próxima mentoria.

Se mudar de ideia e quiser retomar a conversa, é só me avisar. Boa sorte na sua jornada! 🙏`;
  },

  respostaAoBloqueio: {
    medo: (nome) => `${nome}, o medo é completamente normal — e é exatamente por isso que a Tribo existe.

Você não vai errar sozinho. Tem o Lucas te guiando, a comunidade te apoiando e os 7 dias de garantia pra testar sem nenhum risco.

O maior erro é deixar o dinheiro parado enquanto a inflação come aos poucos. Isso é uma certeza. Perder investindo da forma certa é muito mais improvável do que parece. 💙`,

    passo_a_passo: (nome) => `${nome}, esse é o ponto mais comum — e a boa notícia é que foi exatamente pra isso que a Tribo foi criada.

O Lucas começa do absoluto zero. Você assiste no ritmo que quiser, sem cronograma e sem pressa. Em 30 minutos de conteúdo, você já vai ter clareza do que ninguém te ensinou na escola.

Posso te mostrar como funciona a primeira semana? 👇`,
  },
};

// ─── PERFIL B — INVESTIDOR ────────────────────────────────────────────────────

const CAMINHO_B = {
  toque1: (nome, objetivoEmocional) => {
    const objetivo = textoObjetivoEmocional(objetivoEmocional);
    return `Fala ${nome}! 👋

Olha o que aconteceu na última mentoria ao vivo da Tribo:

O Lucas fez uma análise ao vivo de um papel que estava aparecendo como oportunidade em screeners. Um aluno evitou uma queda de 15% nessa posição por estar ao vivo com a gente — em tempo real, com contexto que o noticiário não dava.

Pensei em você e no seu objetivo de ${objetivo}.

Como estão suas análises hoje? Está conseguindo manter a consistência nos aportes? 📊`;
  },

  toque2: (nome, objetivoEmocional) => {
    const objetivo = textoObjetivoEmocional(objetivoEmocional);
    return `${nome}, lembro que você comentou que buscava mais consistência e clareza pra evoluir em direção a ${objetivo}.

O que te impediu de dar esse próximo passo com a Tribo esta semana?

Pergunto porque quem já investe tem um perfil muito específico — e o Lucas estruturou as mentorias justamente pra quem já tem base mas quer parar de tomar decisão sozinho e no escuro.`;
  },

  toque3: (nome) => {
    return `${nome}, aviso importante aqui.

Vou liberar a sua vaga para outro investidor que está na lista de espera.

Amanhã teremos análise ao vivo de novas oportunidades que o Lucas identificou essa semana — e não consigo garantir sua entrada depois com o valor atual.

Se quiser retomar antes disso, me avisa agora. Depois fica mais difícil. 📈`;
  },

  respostaAoBloqueio: {
    tempo: (nome) => `${nome}, entendo — quem já investe tem o tempo ainda mais disputado.

A Tribo foi pensada pra isso: mentorias gravadas pra assistir quando quiser, resumos dos calls ao vivo e análises em texto. Você não precisa estar em todo lugar, só nos que importam pra sua carteira.

Pergunta direta: quantas horas por mês você dedica hoje às suas análises? Com esse tempo, a diferença de resultado pode ser grande. 🎯`,

    valor: (nome) => `${nome}, faz sentido avaliar o custo-benefício.

Coloca na balança: R$ 97/mês vs o custo de uma única decisão errada por falta de contexto. Quantos papéis você já evitou ou ficou de fora por não ter informação rápida o suficiente?

A Tribo não é gasto — é uma ferramenta de trabalho pro investidor. 💡`,
  },
};

// ─── PERFIL C — SCP / SPE ─────────────────────────────────────────────────────

const CAMINHO_C = {
  explicacao: (nome) => {
    return `${nome}, SCP e SPE são modelos onde você investe em projetos específicos junto com o grupo — como leilões judiciais, incorporações imobiliárias ou operações estruturadas.

É para quem busca rentabilidade acima da média do mercado tradicional, com projetos que não estão disponíveis para o investidor comum.

A Tribo do Investidor é a base pra você entender como esses grandes projetos funcionam, a lógica por trás das operações e como identificar as melhores oportunidades quando elas aparecem.

Faz sentido começar por aqui antes de entrar em um projeto de alto ticket? 🎯`;
  },

  toque1: (nome, objetivoEmocional) => {
    const objetivo = textoObjetivoEmocional(objetivoEmocional);
    return `${nome}, acabei de lembrar de você.

Semana passada a Tribo teve uma sessão fechada onde o Lucas apresentou a estrutura de uma operação SCP que está sendo analisada pelo grupo. Retorno projetado bem acima do CDI, com prazo definido.

Esse tipo de oportunidade chega primeiro para quem está ativo na comunidade — não tem divulgação pública.

Você mencionou ${objetivo}. Esse formato pode se encaixar bem no que você busca. Posso te contar mais detalhes?`;
  },

  toque2: (nome) => {
    return `${nome}, pergunta direta:

O que te fez pausar a decisão de entrar na Tribo sendo que você claramente tem o perfil e o interesse para projetos de maior envergadura?

Geralmente é uma dessas:
1️⃣ Ainda avaliando se a comunidade entrega o nível que precisa
2️⃣ Momento financeiro
3️⃣ Quer mais informação antes de decidir

Qual o seu caso? Dependendo, posso te mostrar algo mais específico. 🔍`;
  },

  toque3: (nome) => {
    return `${nome}, aviso final por aqui.

Temos um grupo seleto de membros que participam das análises de projetos SCP/SPE quando eles chegam — e as vagas são limitadas por design.

Não consigo garantir que a próxima oportunidade vai esperar sua decisão.

Se tiver interesse em entender melhor antes que isso feche, me avisa agora. 🔐`;
  },
};

// ─── SELETOR POR PERFIL ───────────────────────────────────────────────────────

/**
 * Retorna a mensagem correta para o toque e perfil do lead.
 * @param {number} toque - 1, 2 ou 3
 * @param {string} perfil - PERFIL.A | PERFIL.B | PERFIL.C
 * @param {string} nome
 * @param {string} objetivoEmocional
 * @param {string} produto
 */
function gerarMensagemFollowUp(toque, perfil, nome, objetivoEmocional, produto) {
  const caminhos = {
    [PERFIL.A]: CAMINHO_A,
    [PERFIL.B]: CAMINHO_B,
    [PERFIL.C]: CAMINHO_C,
  };

  const caminho = caminhos[perfil] || CAMINHO_A;
  const fn = caminho[`toque${toque}`];

  if (!fn) return null;
  return fn(nome, objetivoEmocional, produto);
}

/**
 * Retorna resposta personalizada ao bloqueio revelado pelo lead no Toque 2.
 * @param {string} perfil
 * @param {string} bloqueio - 'tempo' | 'dinheiro' | 'medo' | 'passo_a_passo' | 'valor'
 * @param {string} nome
 */
function gerarRespostaAoBloqueio(perfil, bloqueio, nome) {
  const caminhos = {
    [PERFIL.A]: CAMINHO_A,
    [PERFIL.B]: CAMINHO_B,
  };

  const caminho = caminhos[perfil];
  if (!caminho?.respostaAoBloqueio) return null;

  const fn = caminho.respostaAoBloqueio[bloqueio];
  return fn ? fn(nome) : null;
}

/**
 * Retorna a explicação de SCP/SPE para leads Perfil C.
 */
function gerarExplicacaoScpSpe(nome) {
  return CAMINHO_C.explicacao(nome);
}

module.exports = {
  gerarMensagemFollowUp,
  gerarRespostaAoBloqueio,
  gerarExplicacaoScpSpe,
  // Exports legados para compatibilidade
  gerarToque1: (nome, produto, idx) => gerarMensagemFollowUp(1, PERFIL.A, nome, null, produto),
  gerarToque2: (nome, produto) => gerarMensagemFollowUp(2, PERFIL.A, nome, null, produto),
  gerarToque3: (nome, produto) => gerarMensagemFollowUp(3, PERFIL.A, nome, null, produto),
};
