/**
 * REPOSITÓRIO DE SESSÕES
 *
 * Camada de acesso ao banco para leitura e escrita de sessões.
 * Abstrai o SQLite para o restante da aplicação.
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { ETAPAS } = require('../chatbot/salesScript');

// ─── Helpers de serialização ──────────────────────────────────────────────────

const parse = (v) => (v ? JSON.parse(v) : null);
const stringify = (v) => JSON.stringify(v ?? null);

function rowToSessao(row) {
  if (!row) return null;
  return {
    leadId: row.id,
    platformId: row.platform_id,
    fonte: row.fonte,
    etapa: row.etapa,
    dadosLead: parse(row.dados_lead) || {},
    perfil: row.perfil,
    temperatura: row.temperatura,
    pontuacaoTemperatura: row.pontuacao_temp,
    produtoRecomendado: row.produto_rec,
    objetivoEmocional: row.objetivo_emo,
    historico: parse(row.historico) || [],
    temperosUsados: parse(row.temperos_usados) || [],
    kommoLeadId: row.kommo_lead_id,
    boasVindasEnviada: !!row.boas_vindas_ok,
    followUpAgendado: !!row.follow_up_ag,
    converteu: !!row.converteu,
    encerrada: !!row.encerrada,
    inicio: row.inicio,
    ultimaInteracao: row.ultima_inter,
  };
}

function sessaoToRow(sessao) {
  return {
    id: sessao.leadId,
    platform_id: sessao.platformId,
    fonte: sessao.fonte || 'desconhecido',
    etapa: sessao.etapa || ETAPAS.BOAS_VINDAS,
    dados_lead: stringify(sessao.dadosLead),
    perfil: sessao.perfil || null,
    temperatura: sessao.temperatura || null,
    pontuacao_temp: sessao.pontuacaoTemperatura || 0,
    produto_rec: sessao.produtoRecomendado || null,
    objetivo_emo: sessao.objetivoEmocional || null,
    historico: stringify(sessao.historico),
    temperos_usados: stringify(sessao.temperosUsados),
    kommo_lead_id: sessao.kommoLeadId || null,
    boas_vindas_ok: sessao.boasVindasEnviada ? 1 : 0,
    follow_up_ag: sessao.followUpAgendado ? 1 : 0,
    converteu: sessao.converteu ? 1 : 0,
    encerrada: sessao.encerrada ? 1 : 0,
    inicio: sessao.inicio || new Date().toISOString(),
    ultima_inter: sessao.ultimaInteracao || new Date().toISOString(),
  };
}

// ─── Queries preparadas ───────────────────────────────────────────────────────

const stmtBuscar = db.prepare('SELECT * FROM sessoes WHERE platform_id = ?');
const stmtInserir = db.prepare(`
  INSERT INTO sessoes (
    id, platform_id, fonte, etapa, dados_lead, perfil, temperatura, pontuacao_temp,
    produto_rec, objetivo_emo, historico, temperos_usados, kommo_lead_id,
    boas_vindas_ok, follow_up_ag, converteu, encerrada, inicio, ultima_inter
  ) VALUES (
    @id, @platform_id, @fonte, @etapa, @dados_lead, @perfil, @temperatura, @pontuacao_temp,
    @produto_rec, @objetivo_emo, @historico, @temperos_usados, @kommo_lead_id,
    @boas_vindas_ok, @follow_up_ag, @converteu, @encerrada, @inicio, @ultima_inter
  )
`);
const stmtAtualizar = db.prepare(`
  UPDATE sessoes SET
    etapa = @etapa, dados_lead = @dados_lead, perfil = @perfil,
    temperatura = @temperatura, pontuacao_temp = @pontuacao_temp,
    produto_rec = @produto_rec, objetivo_emo = @objetivo_emo,
    historico = @historico, temperos_usados = @temperos_usados,
    kommo_lead_id = @kommo_lead_id, boas_vindas_ok = @boas_vindas_ok,
    follow_up_ag = @follow_up_ag, converteu = @converteu,
    encerrada = @encerrada, ultima_inter = @ultima_inter
  WHERE platform_id = @platform_id
`);
const stmtListarAtivas = db.prepare('SELECT * FROM sessoes WHERE encerrada = 0');

// ─── API Pública ──────────────────────────────────────────────────────────────

function buscarSessao(platformId) {
  return rowToSessao(stmtBuscar.get(platformId));
}

function criarSessao(platformId, fonte) {
  const sessao = {
    leadId: uuidv4(),
    platformId,
    fonte,
    etapa: ETAPAS.BOAS_VINDAS,
    dadosLead: {},
    perfil: null,
    temperatura: null,
    pontuacaoTemperatura: 0,
    produtoRecomendado: null,
    objetivoEmocional: null,
    historico: [],
    temperosUsados: [],
    kommoLeadId: null,
    boasVindasEnviada: false,
    followUpAgendado: false,
    converteu: false,
    encerrada: false,
    inicio: new Date().toISOString(),
    ultimaInteracao: new Date().toISOString(),
  };
  stmtInserir.run(sessaoToRow(sessao));
  return sessao;
}

function salvarSessao(sessao) {
  sessao.ultimaInteracao = new Date().toISOString();
  stmtAtualizar.run(sessaoToRow(sessao));
}

function listarSessoesAtivas() {
  return stmtListarAtivas.all().map(rowToSessao);
}

/**
 * Registra o lead no log histórico (audit trail).
 */
function registrarLeadLog(sessao) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO leads_log (id, platform_id, fonte, perfil, temperatura, produto, kommo_lead_id, converteu, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    sessao.leadId,
    sessao.platformId,
    sessao.fonte,
    sessao.perfil,
    sessao.temperatura,
    sessao.produtoRecomendado,
    sessao.kommoLeadId,
    sessao.converteu ? 1 : 0,
    sessao.inicio
  );
}

module.exports = { buscarSessao, criarSessao, salvarSessao, listarSessoesAtivas, registrarLeadLog };
