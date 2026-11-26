/**
 * Criação e migração do schema do banco Solis.
 * Versão atual: 1. Adicione migrações em ordem; nunca altere as existentes.
 */

import type { Banco } from "./vault.js";

export const VERSAO_SCHEMA = 7;

export async function inicializarSchema(banco: Banco): Promise<void> {
  await banco.withTransactionAsync(async () => {
    await banco.execAsync(`
      CREATE TABLE IF NOT EXISTS _migracoes (
        versao    INTEGER PRIMARY KEY,
        aplicada_em TEXT NOT NULL
      );
    `);

    const rows = await banco.getAllAsync<{ versao: number }>(
      "SELECT versao FROM _migracoes ORDER BY versao DESC LIMIT 1"
    );
    const versaoAtual = rows[0]?.versao ?? 0;

    if (versaoAtual < 1) await migrar_v1(banco);
    if (versaoAtual < 2) await migrar_v2(banco);
    if (versaoAtual < 3) await migrar_v3(banco);
    if (versaoAtual < 4) await migrar_v4(banco);
    if (versaoAtual < 5) await migrar_v5(banco);
    if (versaoAtual < 6) await migrar_v6(banco);
    if (versaoAtual < 7) await migrar_v7(banco);
  });
}

// ── Migração v1 ───────────────────────────────────────────────────────────

async function migrar_v1(banco: Banco): Promise<void> {
  await banco.execAsync(`
    CREATE TABLE IF NOT EXISTS contas (
      id          TEXT PRIMARY KEY,
      nome        TEXT NOT NULL,
      tipo        TEXT NOT NULL CHECK(tipo IN ('corrente','poupanca','dinheiro','outro')),
      saldo_inicial_centavos INTEGER NOT NULL DEFAULT 0,
      moeda       TEXT NOT NULL DEFAULT 'BRL',
      ativo       INTEGER NOT NULL DEFAULT 1,
      criado_em   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id      TEXT PRIMARY KEY,
      nome    TEXT NOT NULL,
      icone   TEXT,
      pai_id  TEXT REFERENCES categorias(id),
      tipo    TEXT NOT NULL CHECK(tipo IN ('receita','despesa','transferencia'))
    );

    CREATE TABLE IF NOT EXISTS lancamentos (
      id              TEXT PRIMARY KEY,
      conta_id        TEXT NOT NULL REFERENCES contas(id),
      valor_centavos  INTEGER NOT NULL,
      descricao       TEXT NOT NULL DEFAULT '',
      categoria_id    TEXT REFERENCES categorias(id),
      data            TEXT NOT NULL,
      tipo            TEXT NOT NULL CHECK(tipo IN ('receita','despesa','transferencia')),
      recorrente      INTEGER NOT NULL DEFAULT 0,
      criado_em       TEXT NOT NULL,
      atualizado_em   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    -- Registra data/hora e versão dos termos aceitos (ponto 22 da lista de conformidade)
    CREATE TABLE IF NOT EXISTS consentimento (
      id            INTEGER PRIMARY KEY CHECK(id = 1),
      versao_termos TEXT NOT NULL,
      aceito_em     TEXT NOT NULL,
      hash_termos   TEXT NOT NULL
    );

    INSERT INTO _migracoes (versao, aplicada_em)
    VALUES (1, datetime('now'));
  `);
}

// ── Migração v2 ───────────────────────────────────────────────────────────

async function migrar_v2(banco: Banco): Promise<void> {
  await banco.execAsync(`
    CREATE TABLE IF NOT EXISTS cartoes (
      id          TEXT PRIMARY KEY,
      nome        TEXT NOT NULL,
      limite_centavos INTEGER NOT NULL DEFAULT 0,
      dia_vencimento  INTEGER NOT NULL CHECK(dia_vencimento BETWEEN 1 AND 31),
      dia_fechamento  INTEGER NOT NULL CHECK(dia_fechamento BETWEEN 1 AND 31),
      ativo       INTEGER NOT NULL DEFAULT 1,
      criado_em   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faturas (
      id          TEXT PRIMARY KEY,
      cartao_id   TEXT NOT NULL REFERENCES cartoes(id),
      mes         INTEGER NOT NULL,
      ano         INTEGER NOT NULL,
      pago        INTEGER NOT NULL DEFAULT 0,
      pago_em     TEXT
    );

    CREATE TABLE IF NOT EXISTS lancamentos_cartao (
      id          TEXT PRIMARY KEY,
      fatura_id   TEXT NOT NULL REFERENCES faturas(id),
      descricao   TEXT NOT NULL DEFAULT '',
      valor_centavos INTEGER NOT NULL,
      data        TEXT NOT NULL,
      categoria_id TEXT REFERENCES categorias(id),
      parcela_atual INTEGER,
      parcelas_total INTEGER
    );

    CREATE TABLE IF NOT EXISTS orcamentos (
      id              TEXT PRIMARY KEY,
      categoria_id    TEXT NOT NULL REFERENCES categorias(id),
      limite_centavos INTEGER NOT NULL,
      mes             INTEGER NOT NULL,
      ano             INTEGER NOT NULL,
      UNIQUE(categoria_id, mes, ano)
    );

    CREATE TABLE IF NOT EXISTS recorrentes (
      id              TEXT PRIMARY KEY,
      descricao       TEXT NOT NULL,
      valor_centavos  INTEGER NOT NULL,
      tipo            TEXT NOT NULL CHECK(tipo IN ('receita','despesa')),
      categoria_id    TEXT REFERENCES categorias(id),
      conta_id        TEXT NOT NULL REFERENCES contas(id),
      dia_mes         INTEGER NOT NULL CHECK(dia_mes BETWEEN 1 AND 31),
      ativo           INTEGER NOT NULL DEFAULT 1,
      criado_em       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metas (
      id              TEXT PRIMARY KEY,
      nome            TEXT NOT NULL,
      icone           TEXT,
      alvo_centavos   INTEGER NOT NULL,
      atual_centavos  INTEGER NOT NULL DEFAULT 0,
      prazo           TEXT,
      concluida       INTEGER NOT NULL DEFAULT 0,
      criado_em       TEXT NOT NULL
    );

    INSERT INTO _migracoes (versao, aplicada_em)
    VALUES (2, datetime('now'));
  `);
}

// ── Migração v3 ───────────────────────────────────────────────────────────

async function migrar_v3(banco: Banco): Promise<void> {
  await banco.execAsync(`
    CREATE TABLE IF NOT EXISTS ativos (
      id              TEXT PRIMARY KEY,
      ticker          TEXT NOT NULL,
      nome            TEXT NOT NULL,
      tipo            TEXT NOT NULL CHECK(tipo IN ('acao','fii','etf','renda_fixa','cripto','outro')),
      quantidade      REAL NOT NULL DEFAULT 0,
      preco_medio_centavos INTEGER NOT NULL DEFAULT 0,
      moeda           TEXT NOT NULL DEFAULT 'BRL',
      ativo           INTEGER NOT NULL DEFAULT 1,
      criado_em       TEXT NOT NULL,
      atualizado_em   TEXT NOT NULL
    );

    INSERT INTO _migracoes (versao, aplicada_em)
    VALUES (3, datetime('now'));
  `);
}

// ── Migração v4: id de origem externa (Meu Pluggy), para buscar de novo sem duplicar ──

async function migrar_v4(banco: Banco): Promise<void> {
  await banco.execAsync(`
    ALTER TABLE contas ADD COLUMN externo_id TEXT;
    ALTER TABLE lancamentos ADD COLUMN externo_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_externo ON contas(externo_id) WHERE externo_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lancamentos_externo ON lancamentos(externo_id) WHERE externo_id IS NOT NULL;

    INSERT INTO _migracoes (versao, aplicada_em)
    VALUES (4, datetime('now'));
  `);
}

// ── Migração v5: histórico de depósitos e retiradas dos cofrinhos (metas) ──

async function migrar_v5(banco: Banco): Promise<void> {
  await banco.execAsync(`
    CREATE TABLE IF NOT EXISTS metas_movimentos (
      id              TEXT PRIMARY KEY,
      meta_id         TEXT NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
      valor_centavos  INTEGER NOT NULL,
      criado_em       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_metas_mov_data ON metas_movimentos(criado_em);

    INSERT INTO _migracoes (versao, aplicada_em)
    VALUES (5, datetime('now'));
  `);
}

// ── Migração v6: cor personalizada, banco vinculado e descrição nas metas ──

async function migrar_v6(banco: Banco): Promise<void> {
  await banco.execAsync(`
    ALTER TABLE metas ADD COLUMN cor TEXT;
    ALTER TABLE metas ADD COLUMN banco_nome TEXT;
    ALTER TABLE metas ADD COLUMN descricao TEXT;
    ALTER TABLE metas_movimentos ADD COLUMN descricao TEXT;

    INSERT INTO _migracoes (versao, aplicada_em)
    VALUES (6, datetime('now'));
  `);
}

// ── Migração v7: investimentos vindos do Meu Pluggy e cofrinhos sincronizados do banco ──

async function migrar_v7(banco: Banco): Promise<void> {
  await banco.execAsync(`
    ALTER TABLE ativos ADD COLUMN externo_id TEXT;
    ALTER TABLE ativos ADD COLUMN banco_nome TEXT;
    ALTER TABLE ativos ADD COLUMN valor_atual_centavos INTEGER;
    ALTER TABLE ativos ADD COLUMN data_aplicacao TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ativos_externo ON ativos(externo_id) WHERE externo_id IS NOT NULL;
    ALTER TABLE metas ADD COLUMN externo_id TEXT;

    INSERT INTO _migracoes (versao, aplicada_em)
    VALUES (7, datetime('now'));
  `);
}
