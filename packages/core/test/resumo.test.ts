import { describe, it, expect } from "vitest";
import { gastosDiarios, gastosPorCategoria, progressoCiclo } from "../src/resumo.js";

const HOJE = "2026-11-23";

describe("gastosPorCategoria", () => {
  const L = [
    { data: "2026-11-20", centavos: -30000, categoriaId: "cat_alimentacao" },
    { data: "2026-11-10", centavos: -10000, categoriaId: "cat_alimentacao" },
    { data: "2026-11-15", centavos: -40000, categoriaId: "cat_moradia" },
    { data: "2026-11-05", centavos: -20000, categoriaId: "cat_lazer" },
    { data: "2026-11-02", centavos: -5000, categoriaId: "cat_saude" },
    { data: "2026-11-01", centavos: -3000, categoriaId: "cat_transporte" },
    { data: "2026-11-01", centavos: -2000, categoriaId: null },
    { data: "2026-11-20", centavos: 280000, categoriaId: "cat_salario" }, // receita: fora
    { data: "2026-11-18", centavos: -99999, categoriaId: "x", tipo: "transferencia" }, // transferência: fora
    { data: "2026-08-01", centavos: -50000, categoriaId: "cat_lazer" }, // fora dos 30 dias
  ];

  it("ordena, limita ao top e junta o resto em 'outros'", () => {
    const r = gastosPorCategoria(L, HOJE);
    expect(r.map((f) => f.categoriaId)).toEqual(["cat_alimentacao", "cat_moradia", "cat_lazer", "cat_saude", "outros"]);
    expect(r[0]!.centavos).toBe(40000);
    expect(r[4]!.centavos).toBe(5000);
  });

  it("as porcentagens fecham em 100 e ignoram receitas e transferências", () => {
    const r = gastosPorCategoria(L, HOJE);
    expect(r.reduce((s, f) => s + f.pct, 0)).toBe(100);
    expect(r.some((f) => f.categoriaId === "cat_salario" || f.categoriaId === "x")).toBe(false);
  });

  it("sem gastos devolve lista vazia", () => {
    expect(gastosPorCategoria([{ data: HOJE, centavos: 1000 }], HOJE)).toEqual([]);
  });

  it("com poucas categorias não cria 'outros'", () => {
    const r = gastosPorCategoria([L[0]!, L[2]!, { data: "2026-11-21", centavos: -5000, categoriaId: "cat_lazer" }], HOJE);
    expect(r.map((f) => f.categoriaId)).toEqual(["cat_moradia", "cat_alimentacao", "cat_lazer"]);
    expect(r.reduce((s, f) => s + f.pct, 0)).toBe(100);
  });
});

describe("gastosDiarios", () => {
  it("devolve os últimos 7 dias, do mais antigo ao de hoje, com zero nos dias sem gasto", () => {
    const r = gastosDiarios([
      { data: "2026-11-23", centavos: -1500 }, { data: "2026-11-23", centavos: -500 },
      { data: "2026-11-20", centavos: -3000 }, { data: "2026-11-21", centavos: 9000 },
      { data: "2026-11-10", centavos: -7000 },
    ], HOJE);
    expect(r.length).toBe(7);
    expect(r[0]!.data).toBe("2026-11-17");
    expect(r[6]).toEqual({ data: "2026-11-23", centavos: 2000 });
    expect(r[3]!.centavos).toBe(3000);
    expect(r[4]!.centavos).toBe(0);
  });
});

describe("progressoCiclo", () => {
  it("vai de 0 (longe) a 1 (vence hoje) e não passa dos limites", () => {
    expect(progressoCiclo(30)).toBe(0);
    expect(progressoCiclo(15)).toBe(0.5);
    expect(progressoCiclo(0)).toBe(1);
    expect(progressoCiclo(-3)).toBe(1);
    expect(progressoCiclo(60)).toBe(0);
  });
});
