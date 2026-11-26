import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { inicializarSchema } from "../src/schema.js";
import { adicionarLancamentoCartao, criarCartao, listarComprasCartoes, obterOuCriarFatura } from "../src/repositorios/cartoes.js";
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
    withTransactionAsync: async (fn: () => Promise<void>) => { db.exec("BEGIN"); try { await fn(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } },
  } as unknown as Banco;
}

describe("compras dos cartões", () => {
  it("separa por cartão, traz categoria e parcela e ignora o que é anterior à data", async () => {
    const b = bancoReal();
    await inicializarSchema(b);
    await b.runAsync("INSERT OR IGNORE INTO categorias (id, nome, icone, pai_id, tipo) VALUES ('cat_alimentacao', 'Alimentação', NULL, NULL, 'despesa')");
    const nu = await criarCartao(b, { nome: "Nubank", limiteCentavos: 300000, diaVencimento: 10, diaFechamento: 3 });
    const inter = await criarCartao(b, { nome: "Inter", limiteCentavos: 150000, diaVencimento: 15, diaFechamento: 8 });
    const fNu = await obterOuCriarFatura(b, nu.id, 11, 2026), fIn = await obterOuCriarFatura(b, inter.id, 11, 2026);
    await adicionarLancamentoCartao(b, { faturaId: fNu.id, descricao: "Mercado", valorCentavos: -5000, data: "2026-11-20", categoriaId: "cat_alimentacao", parcelaAtual: null, parcelasTotal: null });
    await adicionarLancamentoCartao(b, { faturaId: fNu.id, descricao: "Geladeira", valorCentavos: 30000, data: "2026-11-22", categoriaId: null, parcelaAtual: 2, parcelasTotal: 10 });
    await adicionarLancamentoCartao(b, { faturaId: fIn.id, descricao: "Antiga", valorCentavos: 900, data: "2026-09-01", categoriaId: null, parcelaAtual: null, parcelasTotal: null });

    const L = await listarComprasCartoes(b, "2026-10-01");
    expect(L.map((x) => x.descricao)).toEqual(["Geladeira", "Mercado"]);
    expect(L.every((x) => x.cartaoId === nu.id)).toBe(true);
    expect(L[0]!.parcela).toBe("2/10");
    expect(L[1]!.valorCentavos).toBe(5000);
    expect(L[1]!.categoriaNome).toBe("Alimentação");
  });
});
