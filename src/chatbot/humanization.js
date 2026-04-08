/**
 * MÓDULO DE HUMANIZAÇÃO
 *
 * "Pulo do Gato" da IA vendedora:
 *
 * 1. DELAY REALISTA: A IA nunca responde instantaneamente.
 *    Simula tempo de leitura + digitação: 1 a 3 minutos.
 *    Configurable via env HUMANIZATION_DELAY_MIN / HUMANIZATION_DELAY_MAX.
 *
 * 2. AFINIDADE: Injeta referências ao objetivo emocional do lead nas mensagens
 *    (ex: "aposentadoria", "segurança da família", "liberdade financeira")
 *    para criar sensação de que a IA "lembrou" do que ele disse.
 *
 * 3. NUNCA COBRAR: Remove automaticamente frases proibidas do output.
 *    Não usa "E aí, decidiu?", "Vai comprar?", "Fechou?" etc.
 */

const logger = require('../config/logger');

// ─── 1. Delay realista ────────────────────────────────────────────────────────

const DELAY_MIN_MS = (Number(process.env.HUMANIZATION_DELAY_MIN) || 60) * 1000;   // default: 60s
const DELAY_MAX_MS = (Number(process.env.HUMANIZATION_DELAY_MAX) || 180) * 1000;  // default: 180s

/**
 * Retorna um delay aleatório entre o mínimo e máximo configurados.
 * Usado pelo webhook antes de enviar a resposta ao lead.
 */
function calcularDelay() {
  return Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;
}

/**
 * Aguarda o delay de humanização (simula tempo de leitura + digitação).
 * Skipa em: desenvolvimento, simulação, e canal ManyChat (timeout de 10s).
 */
async function aguardarDelay() {
  const skipHumanization =
    process.env.NODE_ENV !== 'production' ||
    process.env.HUMANIZATION_FORCE === 'false' ||
    process.env._SKIP_HUMANIZATION === 'true';

  if (skipHumanization) return;

  const ms = calcularDelay();
  logger.debug('Humanização: aguardando delay', { segundos: Math.round(ms / 1000) });
  await sleep(ms);
}

// ─── 2. Referência ao objetivo emocional (Afinidade) ─────────────────────────

const FRASES_AFINIDADE = {
  aposentadoria: [
    'pensando na sua aposentadoria tranquila',
    'sobre a sua meta de se aposentar com segurança',
    'no que você me falou sobre aposentadoria',
  ],
  familia: [
    'pensando no futuro que você quer construir pra sua família',
    'sobre proteger quem você ama',
    'na segurança que você quer dar pra sua família',
  ],
  liberdade: [
    'pensando na sua liberdade financeira',
    'sobre sair do ciclo de trabalho por obrigação',
    'na sua meta de ter mais tempo e liberdade',
  ],
  seguranca: [
    'pensando na sua segurança financeira',
    'sobre ter aquela tranquilidade que uma reserva traz',
    'na paz de saber que está protegido',
  ],
  crescimento: [
    'pensando no seu crescimento patrimonial',
    'sobre sua independência financeira',
    'na renda passiva que você quer construir',
  ],
  dividas: [
    'pensando em como você pode virar esse jogo das dívidas',
    'sobre o alívio de ficar no positivo de vez',
    'na liberdade de não dever pra ninguém',
  ],
};

/**
 * Gera uma frase de afinidade personalizada para o objetivo emocional do lead.
 * Usada no começo de follow-ups para criar a sensação de que a IA "lembrou".
 *
 * Exemplo: "Fiquei pensando na sua aposentadoria tranquila..."
 */
function gerarFraseAfinidade(objetivoEmocional) {
  if (!objetivoEmocional) return null;

  const opcoes = FRASES_AFINIDADE[objetivoEmocional];
  if (!opcoes || opcoes.length === 0) return null;

  const frase = opcoes[Math.floor(Math.random() * opcoes.length)];
  return `Fiquei ${frase}...`;
}

// ─── 3. Filtro anti-cobrança ──────────────────────────────────────────────────

// Padrões proibidos — a IA nunca deve usar estas frases
const FRASES_PROIBIDAS = [
  /e aí[,.]?\s*(decidiu|vai comprar|fechou|vai entrar|já entrou)\??/gi,
  /decidiu\s*(já|sobre|entrar|comprar)\??/gi,
  /vai\s*(comprar|fechar|entrar|pagar)\s*hoje\??/gi,
  /o que\s*(você\s*)?(achou|decidiu)\??/gi,
  /ficou\s*(com|em)\s*dúvida\s*de\s*(entrar|comprar)\??/gi,
  /já\s*(pensou|decidiu)\s*(sobre)?\s*entrar\??/gi,
];

const SUBSTITUICOES = [
  'Tem alguma dúvida que posso responder? 😊',
  'Me avisa se quiser saber mais sobre alguma parte específica.',
  'Fique à vontade pra me perguntar qualquer coisa.',
  '',
];

/**
 * Remove frases de cobrança do output da IA e substitui por loops de valor.
 */
function filtrarFrasesProibidas(texto) {
  let resultado = texto;
  let modificado = false;

  for (const padrao of FRASES_PROIBIDAS) {
    if (padrao.test(resultado)) {
      const substituto = SUBSTITUICOES[Math.floor(Math.random() * SUBSTITUICOES.length)];
      resultado = resultado.replace(padrao, substituto);
      modificado = true;
    }
  }

  if (modificado) {
    logger.debug('Frase proibida filtrada da resposta da IA');
  }

  return resultado.trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  calcularDelay,
  aguardarDelay,
  gerarFraseAfinidade,
  filtrarFrasesProibidas,
  sleep,
};
