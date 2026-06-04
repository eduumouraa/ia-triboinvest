/**
 * CICLO DE FOLLOW-UP — PLANO EUROPA | TRIBO INVEST
 *
 * Perfil A (Iniciante)  → Segurança, Medo, Acompanhamento
 * Perfil B (Investidor) → Evolução, Clareza, Consistência
 * Perfil C (Alto Valor) → Exclusividade, Alta Performance
 *
 * Cada perfil tem mensagens de D+3, D+7 e D+14 distintas.
 * Tom: natural, sem pressão — igual ao script do Edu humano.
 */

const { PERFIL } = require('../chatbot/leadProfiles');

// ─── PERFIL A — INICIANTE ─────────────────────────────────────────────────────

const CAMINHO_A = {
  toque1: (nome) => {
    const saudacao = nome ? `Fala, ${nome}!` : 'Fala!';
    return `${saudacao} 👋

Passando pra contar de uma aluna nossa que, como você, queria começar a investir mas tinha medo de errar.

Ela entrou no acompanhamento sem saber nada. Hoje ela já sabe onde alocar, acompanha a própria carteira e toma decisões com muito mais clareza.

Fica aqui se quiser retomar a conversa. Estou por aqui. 🙏`;
  },

  toque2: (nome) => {
    const saudacao = nome ? `${nome}, ` : '';
    return `${saudacao}uma pergunta rápida e honesta 👇

O que mais te trava hoje em relação a começar a investir:

Medo de errar, falta de um caminho claro, ou falta de acompanhamento?

A maioria das pessoas que entram no Plano Europa sentia exatamente isso antes. Me conta qual é o seu — sem compromisso.`;
  },

  toque3: (nome) => {
    const saudacao = nome ? `${nome}, ` : '';
    return `${saudacao}passando pra deixar o contato em aberto.

Se quiser entender melhor como funciona o acompanhamento ou tiver qualquer dúvida, é só me chamar aqui. Sem pressa.

Boa sorte na sua jornada de qualquer forma 🙏`;
  },

  respostaAoBloqueio: {
    medo: (nome) => {
      const saudacao = nome ? `${nome}, ` : '';
      return `${saudacao}o medo é completamente normal — e é exatamente por isso que o acompanhamento existe.

Você não vai caminhar sozinho. Tem aulas ao vivo, suporte para dúvidas e carteiras montadas na prática para te dar direção.

O maior risco é não começar. 💙`;
    },

    passo_a_passo: (nome) => {
      const saudacao = nome ? `${nome}, ` : '';
      return `${saudacao}esse é o ponto mais comum — e foi exatamente pra isso que o Plano Europa foi criado.

Você começa do absoluto zero, no seu ritmo, com aulas gravadas e suporte direto pra tirar dúvidas.

Posso te contar como é a primeira semana dentro do acompanhamento? 👇`;
    },
  },
};

// ─── PERFIL B — INVESTIDOR ────────────────────────────────────────────────────

const CAMINHO_B = {
  toque1: (nome) => {
    const saudacao = nome ? `Fala, ${nome}!` : 'Fala!';
    return `${saudacao} 👋

Na última aula ao vivo do Plano Europa, analisamos uma oportunidade que apareceu em screener. Um aluno que estava ao vivo evitou uma queda de 15% numa posição só por ter o contexto certo — em tempo real.

Como estão seus aportes hoje? Conseguindo manter a consistência? 📊`;
  },

  toque2: (nome) => {
    const saudacao = nome ? `${nome}, ` : '';
    return `${saudacao}lembro que você falava sobre querer mais clareza e consistência nos investimentos.

O que te impediu de dar esse próximo passo com o acompanhamento?

Pergunto porque quem já investe tem um perfil muito específico — e o Plano Europa foi estruturado justamente pra quem já tem base mas quer parar de tomar decisão sozinho.`;
  },

  toque3: (nome) => {
    const saudacao = nome ? `${nome}, ` : '';
    return `${saudacao}aviso por aqui que o contato fica em aberto.

Se quiser entender melhor como o acompanhamento funciona na prática ou tiver qualquer dúvida, é só me chamar.

Bons investimentos 📈`;
  },

  respostaAoBloqueio: {
    tempo: (nome) => {
      const saudacao = nome ? `${nome}, ` : '';
      return `${saudacao}entendo — quem já investe tem o tempo ainda mais disputado.

O acompanhamento foi pensado pra isso: aulas gravadas pra assistir quando quiser e carteiras montadas na prática pra você não precisar gastar horas pesquisando do zero.

Quantas horas você dedica hoje às suas análises? Com esse tempo, a diferença pode ser grande. 🎯`;
    },

    valor: (nome) => {
      const saudacao = nome ? `${nome}, ` : '';
      return `${saudacao}faz sentido avaliar o custo-benefício.

Coloca na balança: o custo do acompanhamento vs o custo de uma decisão errada por falta de contexto.

O Plano Europa não é gasto — é uma ferramenta de trabalho pra quem investe. 💡`;
    },
  },
};

// ─── PERFIL C — ALTO VALOR ────────────────────────────────────────────────────

const CAMINHO_C = {
  toque1: (nome) => {
    const saudacao = nome ? `${nome}, ` : '';
    return `${saudacao}acabei de lembrar de você.

Tivemos uma sessão ao vivo recente onde analisamos uma estrutura de operação com retorno projetado bem acima do CDI.

Esse tipo de análise chega primeiro pra quem está ativo no acompanhamento.

Posso te contar mais detalhes sobre como funciona? 🎯`;
  },

  toque2: (nome) => {
    const saudacao = nome ? `${nome}, ` : '';
    return `${saudacao}pergunta direta:

O que te fez pausar a decisão de entrar no acompanhamento?

Geralmente é uma dessas:
— Ainda avaliando se entrega o nível que precisa
— Momento financeiro
— Quer mais informação antes de decidir

Qual o seu caso? Dependendo, posso te mostrar algo mais específico. 🔍`;
  },

  toque3: (nome) => {
    const saudacao = nome ? `${nome}, ` : '';
    return `${saudacao}deixando o contato em aberto.

Se quiser entender melhor como funciona antes de decidir, é só me chamar aqui. Sem compromisso.

Estou por aqui. 🙏`;
  },
};

// ─── SELETOR POR PERFIL ───────────────────────────────────────────────────────

function gerarMensagemFollowUp(toque, perfil, nome) {
  const caminhos = {
    [PERFIL.A]: CAMINHO_A,
    [PERFIL.B]: CAMINHO_B,
    [PERFIL.C]: CAMINHO_C,
  };

  const caminho = caminhos[perfil] || CAMINHO_A;
  const fn = caminho[`toque${toque}`];

  if (!fn) return null;
  return fn(nome);
}

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

module.exports = {
  gerarMensagemFollowUp,
  gerarRespostaAoBloqueio,
  // Exports legados para compatibilidade
  gerarToque1: (nome) => gerarMensagemFollowUp(1, PERFIL.A, nome),
  gerarToque2: (nome) => gerarMensagemFollowUp(2, PERFIL.A, nome),
  gerarToque3: (nome) => gerarMensagemFollowUp(3, PERFIL.A, nome),
};
