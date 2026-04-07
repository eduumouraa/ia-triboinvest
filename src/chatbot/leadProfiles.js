/**
 * CLASSIFICADOR DE PERFIL DE LEAD
 *
 * Perfil A — Iniciante
 *   Drivers: Segurança, Medo, Comunidade
 *   Linguagem: Acolhedora, passo a passo, sem jargão
 *   Produto principal: Tribo do Investidor (entrada) + Org. Financeira (se tiver dívidas)
 *
 * Perfil B — Investidor
 *   Drivers: Evolução, Análise, Consistência
 *   Linguagem: Técnica, direta, baseada em dados e resultados
 *   Produto principal: Tribo do Investidor (aprofundamento)
 *
 * Perfil C — SCP/SPE (Alto Potencial)
 *   Drivers: Oportunidade, Alta Performance, Exclusividade
 *   Linguagem: Premium, exclusiva, baseada em acesso diferenciado
 *   Produto principal: Tribo do Investidor → ponte para SCP/SPE
 */

const PERFIL = {
  A: 'iniciante',
  B: 'investidor',
  C: 'scp_spe',
};

// ─── Sinais de detecção por perfil ───────────────────────────────────────────

const SINAIS_INICIANTE = [
  /\b(nunca investi|começar|começando|primeiro|não sei|medo|perder|não entendo|iniciante|poupança|aprender do zero)\b/i,
  /\b(quero aprender|onde começo|por onde começo|não tenho experiência|tenho medo)\b/i,
];

const SINAIS_INVESTIDOR = [
  /\b(já invisto|carteira|ação|ações|fii|fundo|tesouro|renda variável|análise|aportes|consistência|diversificação)\b/i,
  /\b(B3|bolsa|dividendos|yield|DY|P\/L|valuation|swing trade|buy and hold|position)\b/i,
  /\b(já tenho|minha carteira|meus investimentos|melhorar os resultados|evoluir|crescer)\b/i,
];

const SINAIS_SCP_SPE = [
  /\b(SCP|SPE|sociedade de propósito|leilão|incorporação|projeto|grande aporte|alto rendimento|alta rentabilidade)\b/i,
  /\b(tenho capital|tenho dinheiro para|acima de 50|acima de 100|100 mil|200 mil|patrimônio|imóvel|terreno)\b/i,
  /\b(investidor qualificado|acreditado|renda alta|renda acima)\b/i,
];

// Objetivos que revelam o motor emocional do lead (usados na personalização)
const OBJETIVOS_EMOCIONAIS = {
  aposentadoria: ['aposentadoria', 'aposentar', 'me aposentar', 'parar de trabalhar'],
  familia: ['família', 'filhos', 'filho', 'filha', 'esposa', 'marido', 'deixar para os filhos'],
  liberdade: ['liberdade', 'livre', 'viajar', 'trabalhar menos', 'tempo livre', 'sair do emprego'],
  seguranca: ['segurança', 'seguro', 'tranquilidade', 'reserva', 'emergência', 'proteção'],
  crescimento: ['crescer', 'patrimônio', 'rico', 'independência financeira', 'renda passiva'],
  dividas: ['dívida', 'dívidas', 'negativado', 'spc', 'serasa', 'cartão', 'juros'],
};

/**
 * Classifica o perfil do lead com base nos dados coletados e no histórico de mensagens.
 * @param {object} dadosLead
 * @param {Array} historico
 * @returns {{ perfil: string, objetivoEmocional: string|null, confianca: number }}
 */
function classificarPerfil(dadosLead, historico = []) {
  const { experiencia, renda, objetivo } = dadosLead;
  let pontos = { [PERFIL.A]: 0, [PERFIL.B]: 0, [PERFIL.C]: 0 };

  // ── Dados estruturados ──
  if (experiencia === 'iniciante') pontos[PERFIL.A] += 4;
  if (experiencia === 'basico') pontos[PERFIL.A] += 2;
  if (experiencia === 'intermediario') pontos[PERFIL.B] += 3;
  if (experiencia === 'avancado') pontos[PERFIL.B] += 3;
  if (objetivo === 'sair_dividas') pontos[PERFIL.A] += 2;
  if (objetivo === 'investir') pontos[PERFIL.A] += 1;
  if (objetivo === 'aprender') pontos[PERFIL.B] += 2;
  if (renda === 'acima_10k') { pontos[PERFIL.B] += 1; pontos[PERFIL.C] += 2; }
  if (renda === '5k_10k') pontos[PERFIL.B] += 1;

  // ── Análise textual do histórico ──
  const textosLead = historico
    .filter((h) => h.role === 'user')
    .map((h) => String(h.content))
    .join(' ');

  for (const padrao of SINAIS_INICIANTE) {
    if (padrao.test(textosLead)) pontos[PERFIL.A] += 3;
  }
  for (const padrao of SINAIS_INVESTIDOR) {
    if (padrao.test(textosLead)) pontos[PERFIL.B] += 3;
  }
  for (const padrao of SINAIS_SCP_SPE) {
    if (padrao.test(textosLead)) pontos[PERFIL.C] += 5;
  }

  // ── Determina perfil vencedor ──
  const perfilFinal = Object.entries(pontos).sort((a, b) => b[1] - a[1])[0];
  const confianca = Math.min(100, perfilFinal[1] * 10);

  // ── Detecta objetivo emocional ──
  const objetivoEmocional = detectarObjetivoEmocional(textosLead);

  return {
    perfil: perfilFinal[0],
    objetivoEmocional,
    confianca,
    pontosDetalhados: pontos,
  };
}

/**
 * Detecta o motor emocional por trás da decisão de investir.
 * Usado para personalizar mensagens: "lembrei da sua meta de aposentadoria..."
 */
function detectarObjetivoEmocional(texto) {
  for (const [objetivo, palavras] of Object.entries(OBJETIVOS_EMOCIONAIS)) {
    if (palavras.some((p) => texto.toLowerCase().includes(p))) {
      return objetivo;
    }
  }
  return null;
}

/**
 * Retorna o texto humanizado do objetivo emocional para usar em mensagens.
 */
function textoObjetivoEmocional(objetivoEmocional) {
  const textos = {
    aposentadoria: 'sua aposentadoria tranquila',
    familia: 'o futuro da sua família',
    liberdade: 'sua liberdade financeira',
    seguranca: 'sua segurança financeira',
    crescimento: 'sua independência financeira',
    dividas: 'sair das dívidas de vez',
  };
  return textos[objetivoEmocional] || 'seus objetivos financeiros';
}

/**
 * Retorna a linguagem e os drivers de cada perfil (usados no prompt do Claude).
 */
function contextoPerfil(perfil) {
  const contextos = {
    [PERFIL.A]: {
      tom: 'acolhedor, seguro e encorajador. Como um amigo experiente que tira o medo sem julgamento.',
      drivers: 'Segurança, Comunidade, Passo a Passo, Medo de Errar',
      evitar: 'termos técnicos, jargões de mercado, complexidade desnecessária',
      foco: 'mostrar que qualquer pessoa consegue começar, mesmo do zero',
    },
    [PERFIL.B]: {
      tom: 'direto, técnico e baseado em dados. Como um colega investidor experiente.',
      drivers: 'Evolução, Análise, Consistência, Resultados Mensuráveis',
      evitar: 'explicações básicas demais, tratar como iniciante',
      foco: 'mostrar o nível de análise e oportunidades que a Tribo oferece vs fazer sozinho',
    },
    [PERFIL.C]: {
      tom: 'premium, exclusivo e baseado em oportunidade única. Tom de acesso diferenciado.',
      drivers: 'Alta Performance, Exclusividade, Oportunidade, Rentabilidade Acima da Média',
      evitar: 'linguagem genérica, ofertas de massa',
      foco: 'posicionar a Tribo como porta de entrada para projetos SCP/SPE de alto potencial',
    },
  };
  return contextos[perfil] || contextos[PERFIL.A];
}

module.exports = {
  PERFIL,
  classificarPerfil,
  detectarObjetivoEmocional,
  textoObjetivoEmocional,
  contextoPerfil,
};
