import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { inicializarSchema } from "../src/schema.js";
import { criarConta } from "../src/repositorios/contas.js";
import { criarLancamento } from "../src/repositorios/lancamentos.js";
import { criarMeta, depositar } from "../src/repositorios/metas.js";
import { montarPainel, gerarRelatorioSemana, lerUltimoRelatorio } from "../src/painel.js";
import type { Banco } from "../src/vault.js";

type Param = string | number | null;
function bancoReal(): Banco {
  const db = new DatabaseSync(":memory:");
  return {
    execAsync: async (sql: string) => { db.exec(sql); },
    runAsync: async (sql: string, params: Param[] = []) => {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getAllAsync: async (sql: string, params: Param[] = []) => db.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, params: Param[] = []) => db.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (fn: () => Promise<void>) => {
      db.exec("BEGIN");
      try { await fn(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  } as unknown as Banco;
}

describe("painel das últimas 24 h", () => {
  it("separa movimentos por conta, registra cofrinhos e ignora o que é antigo", async () => {
    const b = bancoReal();
    await inicializarSchema(b);
    const conta = await criarConta(b, { nome: "Nubank", tipo: "corrente", saldoInicialCentavos: 10000, moeda: "BRL" });
    await criarLancamento(b, { contaId: conta.id, valorCentavos: -1250, descricao: "Padaria", categoriaId: null, data: "2026-11-24", tipo: "despesa", recorrente: false });
    await b.runAsync("UPDATE lancamentos SET criado_em = ?", ["2020-01-01T00:00:00.000Z"]);
    await criarLancamento(b, { contaId: conta.id, valorCentavos: 15000, descricao: "Pix", categoriaId: null, data: "2026-11-24", tipo: "receita", recorrente: false });
    const meta = await criarMeta(b, { nome: "Viagem", icone: null, cor: null, bancNome: null, descricao: null, alvoCentavos: 100000, prazo: null });
    await depositar(b, meta.id, 8000);

    const p = await montarPainel(b);
    expect(p.contas[0]!.mov24.map((m) => m.descricao)).toEqual(["Pix"]);
    expect(p.cofrinhos?.totalCentavos).toBe(8000);
    expect(p.cofrinhos?.mov24[0]).toMatchObject({ meta: "Viagem", centavos: 8000, descricao: "Guardado" });
    expect(p.cartoes).toEqual([]);

    const r = await gerarRelatorioSemana(b);
    expect((await lerUltimoRelatorio(b))?.geradoEm).toBe(r.geradoEm);
  });
});
