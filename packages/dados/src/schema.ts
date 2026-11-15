/**
 * Criação e migração do schema do banco Solis.
 * Versão atual: 1. Adicione migrações em ordem; nunca altere as existentes.
 */

import type { Banco } from "./vault.js";

export const VERSAO_SCHEMA = 1;

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
