import { describe, it, expect } from "vitest";
import { responder, gerarAlertas } from "../src/ia/regras.js";
import { sugerirCategoriaHint, aprenderCorrecao, sugerirCategoria } from "../src/ia/categorizacao.js";
import type { ContextoFinanceiro } from "../src/ia/regras.js";

const CTX_BASE: ContextoFinanceiro = {
  mes: 11, ano: 2026,
  totalReceitas: 300000,
  totalDespesas: 200000,
  saldoMes: 100000,
  topCategorias: [{ categoriaId: "cat-1", totalCentavos: 80000 }],
  orcamentos: [{ categoriaId: "cat-1", limiteCentavos: 100000, gastosCentavos: 80000, restanteCentavos: 20000 }],
  metas: [{ nome: "Viagem", alvoCentavos: 500000, atualCentavos: 250000, pct: 0.5 }],
  recorrentesProximos: [{ data: "2026-12-05", descricao: "Aluguel", valorCentavos: -120000 }],
};

describe("responder", () => {
  it("responde sobre saldo do mês", () => {
    const r = responder("quanto sobrou esse mês?", CTX_BASE);
    expect(r.texto).toContain("R$");
    expect(r.tipo).toBe("info");
  });

  it("responde sobre gastos", () => {
    const r = responder("quanto gastei?", CTX_BASE);
    expect(r.texto).toContain("R$");
  });

  it("responde sobre orçamentos OK", () => {
    const r = responder("como está meu orçamento?", CTX_BASE);
    expect(r.tipo).toBe("elogio");
  });

  it("alerta orçamento estourado", () => {
    const ctx: ContextoFinanceiro = {
      ...CTX_BASE,
      orcamentos: [{ categoriaId: "cat-1", limiteCentavos: 100000, gastosCentavos: 120000, restanteCentavos: -20000 }],
    };
    const r = responder("orçamento", ctx);
    expect(r.tipo).toBe("alerta");
  });

  it("responde sobre metas", () => {
    const r = responder("como está minha meta?", CTX_BASE);
    expect(r.texto).toContain("Viagem");
  });

  it("responde sobre recorrentes", () => {
    const r = responder("quais contas vencem em breve?", CTX_BASE);
    expect(r.texto).toContain("Aluguel");
    expect(r.texto).toContain("2026-12-05");
  });

  it("retorna dica para pergunta desconhecida", () => {
    const r = responder("qual o sentido da vida?", CTX_BASE);
    expect(r.tipo).toBe("dica");
  });
});

describe("gerarAlertas", () => {
  it("gera alerta de orçamento estourado", () => {
    const ctx: ContextoFinanceiro = {
      ...CTX_BASE,
      orcamentos: [{ categoriaId: "cat-1", limiteCentavos: 100000, gastosCentavos: 120000, restanteCentavos: -20000 }],
    };
    const alertas = gerarAlertas(ctx);
    expect(alertas.some((a) => a.tipo === "alerta")).toBe(true);
  });

  it("não gera alertas desnecessários", () => {
    const alertas = gerarAlertas(CTX_BASE);
    // saldo positivo, orçamento OK, recorrente em 2026-11-20 (> 7 dias de hoje em nov/2026)
    expect(alertas.filter((a) => a.tipo === "alerta")).toHaveLength(0);
  });
});

describe("categorização", () => {
  it("sugerirCategoriaHint reconhece padrões comuns", () => {
    expect(sugerirCategoriaHint("IFOOD*LANCHE")).toBe("Alimentação");
    expect(sugerirCategoriaHint("UBER TRIP")).toBe("Transporte");
    expect(sugerirCategoriaHint("NETFLIX.COM")).toBe("Lazer");
    expect(sugerirCategoriaHint("FARMACIA POPULAR")).toBe("Saúde");
    expect(sugerirCategoriaHint("xyz123")).toBeNull();
  });

  it("aprenderCorrecao e sugerirCategoria aplicam regra", () => {
    const regra = aprenderCorrecao("Padaria do Zé", "cat-alimentacao");
    expect(regra.padrao).toContain("padaria");
    const sugestao = sugerirCategoria("padaria central", [regra]);
    expect(sugestao).toBe("cat-alimentacao");
  });
});
