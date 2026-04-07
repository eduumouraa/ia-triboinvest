/**
 * REPOSITÓRIO DE FOLLOW-UPS
 * Persistência dos ciclos de follow-up agendados no SQLite.
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const parse = (v) => (v ? JSON.parse(v) : null);
const stringify = (v) => JSON.stringify(v ?? []);

function rowToCiclo(row) {
  if (!row) return null;
  return {
    id: row.id,
    platformId: row.platform_id,
    dadosLead: parse(row.dados_lead) || {},
    perfil: row.perfil,
    temperatura: row.temperatura,
    produto: row.produto,
    objetivoEmocional: row.objetivo_emo,
    agendamentos: {
      1: row.agendamento_1,
      2: row.agendamento_2,
      3: row.agendamento_3,
    },
    toquesConcluidos: parse(row.toques_feitos) || [],
    encerrado: !!row.encerrado,
    iniciadoEm: row.iniciado_em,
  };
}

const stmtBuscar = db.prepare('SELECT * FROM followups WHERE platform_id = ? AND encerrado = 0');
const stmtInserir = db.prepare(`
  INSERT OR REPLACE INTO followups (
    id, platform_id, dados_lead, perfil, temperatura, produto, objetivo_emo,
    agendamento_1, agendamento_2, agendamento_3, toques_feitos, encerrado, iniciado_em
  ) VALUES (
    @id, @platform_id, @dados_lead, @perfil, @temperatura, @produto, @objetivo_emo,
    @ag1, @ag2, @ag3, @toques_feitos, @encerrado, @iniciado_em
  )
`);
const stmtAtualizar = db.prepare(`
  UPDATE followups SET toques_feitos = @toques_feitos, encerrado = @encerrado
  WHERE platform_id = @platform_id AND encerrado = 0
`);
const stmtEncerrar = db.prepare(`
  UPDATE followups SET encerrado = 1 WHERE platform_id = ? AND encerrado = 0
`);
const stmtPendentes = db.prepare('SELECT * FROM followups WHERE encerrado = 0');

function buscarCiclo(platformId) {
  return rowToCiclo(stmtBuscar.get(platformId));
}

function criarCiclo(platformId, dadosLead, perfil, temperatura, produto, objetivoEmocional) {
  const agora = Date.now();
  const DIAS = { 1: 3, 2: 7, 3: 14 };

  const ciclo = {
    id: uuidv4(),
    platformId,
    dadosLead,
    perfil,
    temperatura,
    produto,
    objetivoEmocional,
    agendamentos: {
      1: agora + DIAS[1] * 86400000,
      2: agora + DIAS[2] * 86400000,
      3: agora + DIAS[3] * 86400000,
    },
    toquesConcluidos: [],
    encerrado: false,
    iniciadoEm: new Date().toISOString(),
  };

  stmtInserir.run({
    id: ciclo.id,
    platform_id: ciclo.platformId,
    dados_lead: JSON.stringify(ciclo.dadosLead),
    perfil: ciclo.perfil,
    temperatura: ciclo.temperatura,
    produto: ciclo.produto,
    objetivo_emo: ciclo.objetivoEmocional,
    ag1: ciclo.agendamentos[1],
    ag2: ciclo.agendamentos[2],
    ag3: ciclo.agendamentos[3],
    toques_feitos: '[]',
    encerrado: 0,
    iniciado_em: ciclo.iniciadoEm,
  });

  return ciclo;
}

function marcarToqueConcluido(platformId, toque, toquesConcluidos) {
  stmtAtualizar.run({
    toques_feitos: JSON.stringify(toquesConcluidos),
    encerrado: toque === 3 ? 1 : 0,
    platform_id: platformId,
  });
}

function encerrarCiclo(platformId) {
  stmtEncerrar.run(platformId);
}

function listarPendentes() {
  return stmtPendentes.all().map(rowToCiclo);
}

module.exports = {
  buscarCiclo,
  criarCiclo,
  marcarToqueConcluido,
  encerrarCiclo,
  listarPendentes,
};
