/**
 * BANCO DE DADOS SQLite
 *
 * Substitui o NodeCache in-memory por persistência real.
 * Sessões e ciclos de follow-up sobrevivem a reinicializações do servidor.
 *
 * Equivalente Node.js ao SQLAlchemy (Python):
 * better-sqlite3 = driver síncrono, zero configuração, arquivo único.
 *
 * Tabelas:
 *   - sessoes      : estado de cada conversa ativa
 *   - followups    : ciclos de follow-up agendados
 *   - leads        : registro histórico de todos os leads (audit log)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'triboinvest.db');

// Garante que o diretório existe
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Performance: WAL mode para leituras e escritas concorrentes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS sessoes (
    id              TEXT PRIMARY KEY,
    platform_id     TEXT NOT NULL UNIQUE,
    fonte           TEXT NOT NULL DEFAULT 'desconhecido',
    etapa           TEXT NOT NULL DEFAULT 'boas_vindas',
    dados_lead      TEXT NOT NULL DEFAULT '{}',
    perfil          TEXT,
    temperatura     TEXT,
    pontuacao_temp  INTEGER DEFAULT 0,
    produto_rec     TEXT,
    objetivo_emo    TEXT,
    historico       TEXT NOT NULL DEFAULT '[]',
    temperos_usados TEXT NOT NULL DEFAULT '[]',
    kommo_lead_id   INTEGER,
    boas_vindas_ok  INTEGER NOT NULL DEFAULT 0,
    follow_up_ag    INTEGER NOT NULL DEFAULT 0,
    converteu       INTEGER NOT NULL DEFAULT 0,
    encerrada       INTEGER NOT NULL DEFAULT 0,
    inicio          TEXT NOT NULL,
    ultima_inter    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessoes_platform ON sessoes(platform_id);
  CREATE INDEX IF NOT EXISTS idx_sessoes_encerrada ON sessoes(encerrada);

  CREATE TABLE IF NOT EXISTS followups (
    id              TEXT PRIMARY KEY,
    platform_id     TEXT NOT NULL,
    dados_lead      TEXT NOT NULL DEFAULT '{}',
    perfil          TEXT,
    temperatura     TEXT,
    produto         TEXT,
    objetivo_emo    TEXT,
    agendamento_1   INTEGER,
    agendamento_2   INTEGER,
    agendamento_3   INTEGER,
    toques_feitos   TEXT NOT NULL DEFAULT '[]',
    encerrado       INTEGER NOT NULL DEFAULT 0,
    iniciado_em     TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_followups_platform ON followups(platform_id);
  CREATE INDEX IF NOT EXISTS idx_followups_encerrado ON followups(encerrado);

  CREATE TABLE IF NOT EXISTS leads_log (
    id              TEXT PRIMARY KEY,
    platform_id     TEXT NOT NULL,
    fonte           TEXT,
    perfil          TEXT,
    temperatura     TEXT,
    produto         TEXT,
    kommo_lead_id   INTEGER,
    converteu       INTEGER DEFAULT 0,
    criado_em       TEXT NOT NULL
  );
`);

logger.info('Banco SQLite inicializado', { path: DB_PATH });

module.exports = db;
