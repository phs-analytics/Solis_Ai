import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarConta, listarContas, saldoConta } from "../src/repositorios/contas.js";
import { criarLancamento, listarLancamentos, resumoMes } from "../src/repositorios/lancamentos.js";
import { garantirCategoriasPadrao, listarCategorias } from "../src/repositorios/categorias.js";
import type { Banco } from "../src/vault.js";

// Banco em memória: tabela simulada via Map
function criarBancoMock(): Banco {
  const contas: Record<string, unknown>[] = [];
  const lancamentos: Record<string, unknown>[] = [];
  const categorias: Record<string, unknown>[] = [];

  function tabela(sql: string) {
    if (sql.includes("FROM contas")) return contas;
    if (sql.includes("FROM lancamentos")) return lancamentos;
    if (sql.includes("FROM categorias")) return categorias;
    return [];
  }

  return {
    runAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      const p = (params ?? []) as unknown[];
      if (sql.startsWith("INSERT INTO contas")) {
        contas.push({ id: p[0], nome: p[1], tipo: p[2], saldo_inicial_centavos: p[3], moeda: p[4], ativo: 1, criado_em: p[5] });
      } else if (sql.startsWith("INSERT INTO lancamentos")) {
        lancamentos.push({ id: p[0], conta_id: p[1], valor_centavos: p[2], descricao: p[3], categoria_id: p[4], data: p[5], tipo: p[6], recorrente: p[7], criado_em: p[8], atualizado_em: p[9] });
      } else if (sql.startsWith("INSERT OR IGNORE INTO categorias")) {
        const existe = categorias.find((c) => c.id === p[0]);
        if (!existe) categorias.push({ id: p[0], nome: p[1], icone: p[2], pai_id: p[3], tipo: p[4] });
      }
    }),
    getAllAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      const p = (params ?? []) as unknown[];
      const rows = tabela(sql);

      if (sql.includes("WHERE ativo = 1")) return rows.filter((r) => r.ativo === 1);
      if (sql.includes("saldo_inicial_centavos FROM contas WHERE id")) {
        return rows.filter((r) => r.id === p[0]).map((r) => ({ saldo_inicial_centavos: r.saldo_inicial_centavos }));
      }
      if (sql.includes("SUM(valor_centavos)") && sql.includes("conta_id")) {
        const soma = (lancamentos as Array<{ conta_id: unknown; valor_centavos: number }>)
          .filter((l) => l.conta_id === p[0])
          .reduce((acc, l) => acc + l.valor_centavos, 0);
        return [{ total: soma }];
      }
      if (sql.includes("tipo = ?") && sql.includes("FROM categorias")) {
        return rows.filter((r) => r.tipo === p[0]);
      }
      if (sql.includes("FROM categorias")) return rows;
      if (sql.includes("BETWEEN") && sql.includes("GROUP BY tipo")) {
        const grupos: Record<string, number> = {};
        for (const l of lancamentos as Array<{ tipo: string; valor_centavos: number; data: string }>) {
          grupos[l.tipo] = (grupos[l.tipo] ?? 0) + l.valor_centavos;
        }
        return Object.entries(grupos).map(([tipo, total]) => ({ tipo, total }));
      }
      if (sql.includes("LIKE")) {
        const termo = String(p[0]).replace(/%/g, "");
        return lancamentos.filter((l) => String(l.descricao).includes(termo));
      }
      return rows;
    }),
  } as unknown as Banco;
}

describe("repositório de contas", () => {
  let banco: Banco;
  beforeEach(() => { banco = criarBancoMock(); });

  it("cria e lista conta", async () => {
    await criarConta(banco, { nome: "Nubank", tipo: "corrente", saldoInicialCentavos: 10000, moeda: "BRL" });
    const lista = await listarContas(banco);
    expect(lista).toHaveLength(1);
    expect(lista[0]!.nome).toBe("Nubank");
  });

  it("calcula saldo com lançamentos", async () => {
    const conta = await criarConta(banco, { nome: "Carteira", tipo: "dinheiro", saldoInicialCentavos: 5000, moeda: "BRL" });
    await criarLancamento(banco, { contaId: conta.id, valorCentavos: -2000, descricao: "Mercado", categoriaId: null, data: "2026-11-15", tipo: "despesa", recorrente: false });
    const saldo = await saldoConta(banco, conta.id);
    expect(saldo).toBe(3000);
  });
});

describe("repositório de lançamentos", () => {
  let banco: Banco;
  beforeEach(() => { banco = criarBancoMock(); });

  it("cria lançamento e retorna na listagem", async () => {
    const conta = await criarConta(banco, { nome: "C", tipo: "corrente", saldoInicialCentavos: 0, moeda: "BRL" });
    await criarLancamento(banco, { contaId: conta.id, valorCentavos: 100000, descricao: "Salário", categoriaId: null, data: "2026-11-01", tipo: "receita", recorrente: false });
    const lista = await listarLancamentos(banco);
    expect(lista).toHaveLength(1);
    expect(lista[0]!.descricao).toBe("Salário");
  });

  it("busca por texto", async () => {
    const conta = await criarConta(banco, { nome: "C", tipo: "corrente", saldoInicialCentavos: 0, moeda: "BRL" });
    await criarLancamento(banco, { contaId: conta.id, valorCentavos: -500, descricao: "Uber", categoriaId: null, data: "2026-11-10", tipo: "despesa", recorrente: false });
    await criarLancamento(banco, { contaId: conta.id, valorCentavos: -300, descricao: "Mercado", categoriaId: null, data: "2026-11-11", tipo: "despesa", recorrente: false });
    const resultado = await listarLancamentos(banco, { busca: "Uber" });
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.descricao).toBe("Uber");
  });
});

describe("repositório de categorias", () => {
  let banco: Banco;
  beforeEach(() => { banco = criarBancoMock(); });

  it("garante categorias padrão e lista", async () => {
    await garantirCategoriasPadrao(banco);
    const despesas = await listarCategorias(banco, "despesa");
    expect(despesas.length).toBeGreaterThan(0);
    expect(despesas.every((c) => c.tipo === "despesa")).toBe(true);
  });
});
