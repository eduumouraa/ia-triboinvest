/**
 * AGENDADOR DE FOLLOW-UP — CICLO 14 DIAS POR PERFIL
 *
 * Agora com persistência em SQLite: ciclos sobrevivem a reinicializações.
 * Verificação a cada 1 hora.
 * Cada toque usa a mensagem correta para o perfil do lead (A, B ou C).
 */

const logger = require('../config/logger');
const { gerarMensagemFollowUp } = require('./followUpMessages');
const followUpRepo = require('../database/followUpRepository');

const INTERVALO_CHECK_MS = 60 * 60 * 1000; // 1 hora

let checkInterval = null;
let envioCallback = null;

// ─── API Pública ──────────────────────────────────────────────────────────────

function iniciarAgendador(fnEnviar) {
  envioCallback = fnEnviar;
  checkInterval = setInterval(verificarFollowUpsPendentes, INTERVALO_CHECK_MS);
  logger.info('Agendador de follow-up iniciado', { intervalo: '1h', persistencia: 'SQLite' });

  // Verifica imediatamente ao iniciar (catch-up de mensagens perdidas)
  verificarFollowUpsPendentes();
}

function pararAgendador() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

/**
 * Agenda ciclo completo de follow-up para um lead que não converteu.
 * Ignora se já existe ciclo ativo para o mesmo lead.
 */
function agendarCicloFollowUp(platformId, dadosLead, temperatura) {
  const existente = followUpRepo.buscarCiclo(platformId);
  if (existente) {
    logger.info('Follow-up já existe para este lead', { platformId });
    return;
  }

  const ciclo = followUpRepo.criarCiclo(
    platformId,
    dadosLead,
    dadosLead.perfil || 'iniciante',
    temperatura,
    dadosLead.produtoRecomendado,
    dadosLead.objetivoEmocional
  );

  logger.info('Ciclo de follow-up criado no banco', {
    platformId,
    nome: dadosLead.nome,
    perfil: ciclo.perfil,
    temperatura,
    toque1: new Date(ciclo.agendamentos[1]).toLocaleDateString('pt-BR'),
    toque2: new Date(ciclo.agendamentos[2]).toLocaleDateString('pt-BR'),
    toque3: new Date(ciclo.agendamentos[3]).toLocaleDateString('pt-BR'),
  });
}

function cancelarFollowUp(platformId) {
  followUpRepo.encerrarCiclo(platformId);
  logger.info('Follow-up cancelado', { platformId });
}

function ciclosAtivos() {
  return followUpRepo.listarPendentes().map((c) => ({
    platformId: c.platformId,
    nome: c.dadosLead?.nome,
    perfil: c.perfil,
    temperatura: c.temperatura,
    produto: c.produto,
    toquesConcluidos: c.toquesConcluidos,
    encerrado: c.encerrado,
    iniciadoEm: c.iniciadoEm,
  }));
}

// ─── Lógica de disparo ────────────────────────────────────────────────────────

async function verificarFollowUpsPendentes() {
  const ciclos = followUpRepo.listarPendentes();
  const agora = Date.now();

  for (const ciclo of ciclos) {
    for (const toque of [1, 2, 3]) {
      if (ciclo.toquesConcluidos.includes(toque)) continue;
      if (!ciclo.agendamentos[toque] || agora < ciclo.agendamentos[toque]) continue;

      await enviarToque(ciclo, toque);
      break; // Um toque por ciclo por verificação
    }
  }
}

async function enviarToque(ciclo, toqueNum) {
  if (!envioCallback) {
    logger.error('Função de envio não configurada no agendador');
    return;
  }

  const { platformId, dadosLead, perfil, produto, objetivoEmocional } = ciclo;
  const nome = dadosLead.nome || 'amigo(a)';

  try {
    const mensagem = gerarMensagemFollowUp(toqueNum, perfil, nome, objetivoEmocional, produto);

    if (!mensagem) {
      logger.warn('Mensagem de follow-up não gerada', { toqueNum, perfil, platformId });
      return;
    }

    await envioCallback(platformId, mensagem);

    const toquesConcluidos = [...ciclo.toquesConcluidos, toqueNum];
    followUpRepo.marcarToqueConcluido(platformId, toqueNum, toquesConcluidos);

    logger.info(`Follow-up Toque ${toqueNum} enviado`, {
      platformId,
      nome,
      perfil,
      encerrado: toqueNum === 3,
    });
  } catch (error) {
    logger.error(`Erro ao enviar toque ${toqueNum}`, { error: error.message, platformId });
  }
}

module.exports = {
  iniciarAgendador,
  pararAgendador,
  agendarCicloFollowUp,
  cancelarFollowUp,
  ciclosAtivos,
};
