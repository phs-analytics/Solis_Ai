import { describe, expect, it } from "vitest";
import { analisarSemana, textoAnalise } from "../src/ia/semana.js";

const HOJE = "2026-11-24";

describe("análise da semana", () => {
  it("compara as duas semanas, acha o maior gasto e a categoria que caiu", () => {
    const r = analisarSemana([
      { data: "2026-11-24", centavos: -6000, categoria: "Alimentação", tipo: "despesa" },
      { data: "2026-11-20", centavos: -2000, categoria: "Transporte", tipo: "despesa" },
      { data: "2026-11-18", centavos: 300000, categoria: "Renda", tipo: "receita" },
      { data: "2026-11-15", centavos: -10000, categoria: "Lazer", tipo: "despesa" },
      { data: "2026-11-14", centavos: -6000, categoria: "Alimentação", tipo: "despesa" },
      { data: "2026-11-22", centavos: -50000, categoria: "Outros", tipo: "transferencia" },
    ], [{ nome: "Viagem", atualCentavos: 1000, alvoCentavos: 10000 }], HOJE);
    expect(r.gastos).toBe(8000);
    expect(r.anterior).toBe(16000);
    expect(r.variacaoPct).toBe(-50);
    expect(r.topo[0]).toEqual({ nome: "Alimentação", centavos: 6000, pct: 75 });
    expect(r.economizou?.nome).toBe("Lazer");
    expect(r.atencao.join(" ")).toMatch(/Viagem está em 10%/);
    expect(textoAnalise(r)).toMatch(/Não é recomendação de investimento/);
  });

  it("sem semana anterior não inventa variação", () => {
    const r = analisarSemana([{ data: HOJE, centavos: -500, categoria: "Lazer", tipo: "despesa" }], [], HOJE);
    expect(r.variacaoPct).toBeNull();
    expect(r.sugestoes.length).toBeGreaterThan(0);
  });
});
