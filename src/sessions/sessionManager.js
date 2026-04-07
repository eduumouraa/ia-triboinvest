/**
 * SESSION MANAGER
 * Agora usa SQLite via sessaoRepository para persistência real.
 * API pública mantida igual para não quebrar o restante do código.
 */

const repo = require('../database/sessaoRepository');
const logger = require('../config/logger');

function obterOuCriarSessao(platformId, fonte = 'desconhecido') {
  let sessao = repo.buscarSessao(platformId);

  if (!sessao) {
    sessao = repo.criarSessao(platformId, fonte);
    logger.info('Nova sessão criada', { leadId: sessao.leadId, fonte, platformId });
  }

  return sessao;
}

function salvarSessao(platformId, sessaoAtualizada) {
  repo.salvarSessao(sessaoAtualizada);
}

function sessoesAtivas() {
  return repo.listarSessoesAtivas().map((s) => ({
    leadId: s.leadId,
    etapa: s.etapa,
    perfil: s.perfil,
    temperatura: s.temperatura,
    fonte: s.fonte,
    inicio: s.inicio,
    ultimaInteracao: s.ultimaInteracao,
    encerrada: s.encerrada,
  }));
}

module.exports = { obterOuCriarSessao, salvarSessao, sessoesAtivas };
