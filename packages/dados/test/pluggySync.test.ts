import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { inicializarSchema } from "../src/schema.js";
import { sincronizarPluggy } from "../src/pluggy/sincronizar.js";
import { saldoConta, listarContas } from "../src/repositorios/contas.js";
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

function apiFalsa(transacoes: object[], falharTransacoes = false): typeof fetch {
  return (async (url: string) => {
    const corpo = url.endsWith("/auth")
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
    expect(r).toEqual({ pulado: false, contas: 1, novos: 2 });
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
});
