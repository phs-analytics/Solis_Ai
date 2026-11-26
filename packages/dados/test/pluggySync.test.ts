import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { inicializarSchema } from "../src/schema.js";
import { sincronizarPluggy } from "../src/pluggy/sincronizar.js";
import { saldoConta, listarContas } from "../src/repositorios/contas.js";
import { listarAtivosPluggy } from "../src/repositorios/investimentos.js";
import type { Banco } from "../src/vault.js";

type Param = string | number | null;

// SQLite real do Node com a mesma forma de API do expo-sqlite usada pelo Solis.
function bancoReal(): Banco {
  const db = new DatabaseSync(":memory:");
  return {
    execAsync: async (sql: string) => { db.exec(sql); },
    runAsync: async (sql: string, params: Param[] = []) => {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getAllAsync: async (sql: string, params: Param[] = []) => db.prepare(sql).all(...params),
    withTransactionAsync: async (fn: () => Promise<void>) => {
      db.exec("BEGIN");
      try { await fn(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  } as unknown as Banco;
}

const CRED = { clientId: "id", clientSecret: "s", itemIds: ["item1"] };

function apiFalsa(transacoes: object[], falharTransacoes = false, investimentos: object[] = []): typeof fetch {
  return (async (url: string) => {
    const corpo = url.endsWith("/auth")
      ? { apiKey: "k" }
      : url.includes("/investments")
        ? { results: investimentos, totalPages: 1 }
      : url.includes("/items/")
        ? { connector: { name: "Nubank" } }
      : url.endsWith("/auth")
      ? { apiKey: "k" }
      : url.includes("/accounts")
        ? { results: [{ id: "pc1", type: "BANK", name: "Conta Corrente", balance: 1000, currencyCode: "BRL", itemId: "item1" }], totalPages: 1 }
        : falharTransacoes ? null : { results: transacoes, next: null };
    if (corpo === null) return new Response("{}", { status: 500 });
    return new Response(JSON.stringify(corpo), { status: 200 });
  }) as unknown as typeof fetch;
}

const T1 = { id: "t1", date: "2026-11-10T00:00:00Z", description: "Mercado", amount: -120, type: "DEBIT", status: "POSTED", accountId: "pc1" };
const T2 = { id: "t2", date: "2026-11-11T00:00:00Z", description: "Salário", amount: 3000, type: "CREDIT", status: "POSTED", accountId: "pc1" };
const PEND = { id: "t3", date: "2026-11-12T00:00:00Z", description: "Pendente", amount: 10, type: "DEBIT", status: "PENDING", accountId: "pc1" };

describe("sincronização Meu Pluggy", () => {
  it("cria a conta, grava transações e bate o saldo com o banco", async () => {
    const banco = bancoReal();
    await inicializarSchema(banco);
    const r = await sincronizarPluggy(banco, CRED, { fetch: apiFalsa([T1, T2, PEND]), agora: new Date("2026-11-18T10:00:00Z") });
    expect(r).toEqual({ pulado: false, contas: 1, novos: 2, investimentos: 0 });
    const [conta] = await listarContas(banco);
    expect(conta!.nome).toBe("Conta Corrente");
    expect(await saldoConta(banco, conta!.id)).toBe(100000);
  });

  it("respeita a janela de 24h e não duplica ao buscar de novo", async () => {
    const banco = bancoReal();
    await inicializarSchema(banco);
    await sincronizarPluggy(banco, CRED, { fetch: apiFalsa([T1]), agora: new Date("2026-11-18T10:00:00Z") });
    const cedo = await sincronizarPluggy(banco, CRED, { fetch: apiFalsa([T1, T2]), agora: new Date("2026-11-18T20:00:00Z") });
    expect(cedo.pulado).toBe(true);
    const depois = await sincronizarPluggy(banco, CRED, { fetch: apiFalsa([T1, T2]), agora: new Date("2026-11-19T11:00:00Z") });
    expect(depois.novos).toBe(1);
    expect((await listarContas(banco)).length).toBe(1);
  });

  it("falha de rede não grava nada", async () => {
    const banco = bancoReal();
    await inicializarSchema(banco);
    await expect(sincronizarPluggy(banco, CRED, { fetch: apiFalsa([], true) })).rejects.toThrow();
    expect(await listarContas(banco)).toEqual([]);
  });

  it("grava investimentos com banco, valor de hoje e preço médio, sem duplicar", async () => {
    const banco = bancoReal();
    await inicializarSchema(banco);
    const cdb = { id: "i1", name: "CDB Nubank", code: null, type: "FIXED_INCOME", subtype: "CDB", balance: 864.1, amount: 870, amountOriginal: 800, quantity: null, issueDate: "2025-08-02T00:00:00Z", status: "ACTIVE" };
    const fii = { id: "i2", name: "Maxi Renda", code: "MXRF11", type: "EQUITY", subtype: "REAL_ESTATE_FUND", balance: 383.2, amount: 383.2, amountOriginal: 404.8, quantity: 40, status: "ACTIVE" };
    const r = await sincronizarPluggy(banco, CRED, { fetch: apiFalsa([], false, [cdb, fii]), agora: new Date("2026-11-18T10:00:00Z") });
    expect(r.investimentos).toBe(2);
    const lista = await listarAtivosPluggy(banco);
    expect(lista.map((a) => [a.ticker, a.tipo, a.bancoNome, a.valorAtualCentavos, a.precoMedioCentavos, a.quantidade])).toEqual([
      ["CDB Nubank", "renda_fixa", "Nubank", 86410, 80000, 1],
      ["MXRF11", "fii", "Nubank", 38320, 1012, 40],
    ]);
    expect(lista[0]!.dataAplicacao).toBe("2025-08-02");
    await sincronizarPluggy(banco, CRED, { forcar: true, fetch: apiFalsa([], false, [{ ...fii, status: "TOTAL_WITHDRAWAL" }, cdb]), agora: new Date("2026-11-19T10:00:00Z") });
    expect((await listarAtivosPluggy(banco)).map((a) => a.ticker)).toEqual(["CDB Nubank"]);
  });
});
