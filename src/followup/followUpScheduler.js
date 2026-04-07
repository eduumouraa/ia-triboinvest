/**
 * AGENDADOR DE FOLLOW-UP — CICLO DE 14 DIAS
 *
 * Controla quando cada toque deve ser enviado:
 *   Toque 1 → Dia 3  (Prova Social)
 *   Toque 2 → Dia 7  (Dor vs. Desejo)
 *   Toque 3 → Dia 14 (Escassez e FOMO)
 *
 * Usa NodeCache para persistência em memória.
 * Em produção com múltiplas instâncias, substituir por Bull/BullMQ com Redis.
 */

const NodeCache = require('node-cache');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { gerarToque1, gerarToque2, gerarToque3 } = require('./followUpMessages');
const { PRODUTOS } = require('../chatbot/salesScript');

// Cache de follow-ups agendados (TTL de 20 dias)
const followUpCache = new NodeCache({ stdTTL: 1728000, checkperiod: 3600 });

const TOQUES = { TOQUE_1: 1, TOQUE_2: 2, TOQUE_3: 3 };
const DIAS_POR_TOQUE = { [TOQUES.TOQUE_1]: 3, [TOQUES.TOQUE_2]: 7, [TOQUES.TOQUE_3]: 14 };

// Intervalo de verificação: a cada 1 hora
const INTERVALO_CHECK_MS = 60 * 60 * 1000;

let checkInterval = null;
let envioCallback = null; // Função fornecida pela aplicação para enviar a mensagem

/**
 * Inicializa o agendador com uma função de envio de mensagens.
 * @param {Function} fnEnviar - async (platformId, texto) => void
 */
function iniciarAgendador(fnEnviar) {
  envioCallback = fnEnviar;
  checkInterval = setInterval(verificarFollowUpsPendentes, INTERVALO_CHECK_MS);
  logger.info('Agendador de follow-up iniciado', { intervalo: '1h' });
}

function pararAgendador() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('Agendador de follow-up parado');
  }
}

/**
 * Agenda o ciclo completo de follow-up para um lead que não fechou.
 * Deve ser chamado assim que o lead termina a conversa sem comprar.
 *
 * @param {string} platformId - ID na plataforma (Instagram sender ID, etc.)
 * @param {object} dadosLead - Nome, produto recomendado, etc.
 * @param {string} temperatura - 'morno' | 'frio'
 */
function agendarCicloFollowUp(platformId, dadosLead, temperatura) {
  const chave = `followup:${platformId}`;

  // Não duplicar agendamento
  if (followUpCache.get(chave)) {
    logger.info('Follow-up já agendado para este lead', { platformId });
    return;
  }

  const agora = Date.now();
  const ciclo = {
    id: uuidv4(),
    platformId,
    dadosLead,
    temperatura,
    produto: dadosLead.produtoRecomendado || PRODUTOS.NENHUM,
    toqueAtual: TOQUES.TOQUE_1,
    agendamentos: {
      [TOQUES.TOQUE_1]: agora + DIAS_POR_TOQUE[TOQUES.TOQUE_1] * 24 * 60 * 60 * 1000,
      [TOQUES.TOQUE_2]: agora + DIAS_POR_TOQUE[TOQUES.TOQUE_2] * 24 * 60 * 60 * 1000,
      [TOQUES.TOQUE_3]: agora + DIAS_POR_TOQUE[TOQUES.TOQUE_3] * 24 * 60 * 60 * 1000,
    },
    toquesConcluidos: [],
    iniciadoEm: new Date().toISOString(),
    encerrado: false,
  };

  followUpCache.set(chave, ciclo);
  logger.info('Ciclo de follow-up agendado', {
    platformId,
    nome: dadosLead.nome,
    temperatura,
    toque1: new Date(ciclo.agendamentos[TOQUES.TOQUE_1]).toLocaleDateString('pt-BR'),
    toque2: new Date(ciclo.agendamentos[TOQUES.TOQUE_2]).toLocaleDateString('pt-BR'),
    toque3: new Date(ciclo.agendamentos[TOQUES.TOQUE_3]).toLocaleDateString('pt-BR'),
  });
}

/**
 * Cancela o follow-up quando o lead fecha a compra.
 */
function cancelarFollowUp(platformId) {
  const chave = `followup:${platformId}`;
  const ciclo = followUpCache.get(chave);
  if (ciclo) {
    ciclo.encerrado = true;
    followUpCache.set(chave, ciclo);
    logger.info('Follow-up cancelado — lead convertido', { platformId });
  }
}

/**
 * Verifica todos os follow-ups pendentes e envia os que estão no prazo.
 * Executado pelo intervalo periódico.
 */
async function verificarFollowUpsPendentes() {
  const chaves = followUpCache.keys().filter((k) => k.startsWith('followup:'));
  const agora = Date.now();

  for (const chave of chaves) {
    const ciclo = followUpCache.get(chave);
    if (!ciclo || ciclo.encerrado) continue;

    for (const [toque, timestamp] of Object.entries(ciclo.agendamentos)) {
      const toqueNum = Number(toque);
      if (ciclo.toquesConcluidos.includes(toqueNum)) continue;
      if (agora < timestamp) continue;

      // É hora de enviar este toque
      await enviarToque(ciclo, toqueNum, chave);
      break; // Um toque por verificação
    }
  }
}

async function enviarToque(ciclo, toqueNum, chave) {
  if (!envioCallback) {
    logger.error('Função de envio não configurada no agendador');
    return;
  }

  const { platformId, dadosLead, produto } = ciclo;
  const nome = dadosLead.nome || 'amigo(a)';

  let mensagem;
  try {
    switch (toqueNum) {
      case TOQUES.TOQUE_1:
        mensagem = gerarToque1(nome, produto, ciclo.toquesConcluidos.length);
        break;
      case TOQUES.TOQUE_2:
        mensagem = gerarToque2(nome, produto);
        break;
      case TOQUES.TOQUE_3:
        mensagem = gerarToque3(nome, produto);
        break;
      default:
        return;
    }

    await envioCallback(platformId, mensagem);

    // Atualiza o ciclo
    ciclo.toquesConcluidos.push(toqueNum);
    if (toqueNum === TOQUES.TOQUE_3) {
      ciclo.encerrado = true;
    }
    followUpCache.set(chave, ciclo);

    logger.info(`Toque ${toqueNum} enviado`, {
      platformId,
      nome,
      encerrado: ciclo.encerrado,
    });
  } catch (error) {
    logger.error(`Erro ao enviar toque ${toqueNum}`, { error: error.message, platformId });
  }
}

/**
 * Retorna todos os ciclos ativos (para monitoramento).
 */
function ciclosAtivos() {
  return followUpCache
    .keys()
    .filter((k) => k.startsWith('followup:'))
    .map((k) => {
      const ciclo = followUpCache.get(k);
      return {
        platformId: ciclo.platformId,
        nome: ciclo.dadosLead?.nome,
        temperatura: ciclo.temperatura,
        produto: ciclo.produto,
        toqueAtual: ciclo.toqueAtual,
        toquesConcluidos: ciclo.toquesConcluidos,
        encerrado: ciclo.encerrado,
        iniciadoEm: ciclo.iniciadoEm,
      };
    });
}

module.exports = {
  iniciarAgendador,
  pararAgendador,
  agendarCicloFollowUp,
  cancelarFollowUp,
  ciclosAtivos,
  TOQUES,
};
