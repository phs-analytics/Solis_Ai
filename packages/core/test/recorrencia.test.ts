import { describe, it, expect } from "vitest";
import { detectarRecorrentes, normalizarDescricao, serieSaldo, temHistoricoSuficiente } from "../src/recorrencia.js";

const HOJE = "2026-11-23";

describe("normalizarDescricao", () => {
  it("tira acentos, caixa, números de parcela e mês", () => {
    expect(normalizarDescricao("Spotify  Premium 11/2026")).toBe("spotify premium");
    expect(normalizarDescricao("SPOTIFY PREMIUM (3/12)")).toBe("spotify premium");
    expect(normalizarDescricao("Academia Novembro")).toBe("academia");
    expect(normalizarDescricao("Água e Luz")).toBe("agua e luz");
  });
});

describe("detectarRecorrentes", () => {
  const H = [
    { desc: "Spotify Premium", data: "2026-09-26", centavos: -2190, categoriaId: "cat_lazer", contaId: "nu" },
    { desc: "SPOTIFY PREMIUM", data: "2026-10-26", centavos: -2190, categoriaId: "cat_lazer", contaId: "nu" },
    { desc: "Netflix", data: "2026-10-02", centavos: -5590 },
    { desc: "Netflix", data: "2026-11-02", centavos: -5590 },
    { desc: "Academia", data: "2026-09-10", centavos: -9900 },
    { desc: "Academia", data: "2026-10-10", centavos: -9900 },
    { desc: "Academia", data: "2026-11-10", centavos: -9900 },
    { desc: "Uber", data: "2026-11-01", centavos: -2100 },
    { desc: "Uber", data: "2026-11-05", centavos: -1800 },
    { desc: "Uber", data: "2026-10-03", centavos: -2500 },
    { desc: "Mercado", data: "2026-10-20", centavos: -30000 },
    { desc: "Mercado", data: "2026-11-19", centavos: -9000 },
  ];

  it("acha o que se repete todo mês e diz quando vem", () => {
    const r = detectarRecorrentes(H, HOJE);
    expect(r.map((p) => [p.desc, p.dataPrevista, p.diasAte])).toEqual([
      ["Academia", "2026-12-10", 17],
      ["Netflix", "2026-12-02", 9],
      ["SPOTIFY PREMIUM", "2026-11-26", 3],
    ].sort((a, b) => String(a[1]).localeCompare(String(b[1]))));
  });

  it("estima pela média e mantém categoria e conta do último", () => {
    const sp = detectarRecorrentes(H, HOJE).find((p) => p.chave === "spotify premium")!;
    expect(sp.centavos).toBe(-2190);
    expect(sp.categoriaId).toBe("cat_lazer");
    expect(sp.contaId).toBe("nu");
  });

  it("descarta gastos soltos (intervalo curto) e valores que mudam muito", () => {
    const chaves = detectarRecorrentes(H, HOJE).map((p) => p.chave);
    expect(chaves).not.toContain("uber");
    expect(chaves).not.toContain("mercado");
  });

  it("ignora o que tem mais de 3 meses e o que está fora da janela", () => {
    const antigo = [{ desc: "Revista", data: "2026-06-01", centavos: -1000 }, { desc: "Revista", data: "2026-07-01", centavos: -1000 }];
    expect(detectarRecorrentes(antigo, HOJE)).toEqual([]);
  });

  it("some da lista quando acabou de ser lançado (já pago neste ciclo)", () => {
    const pago = [...H, { desc: "Spotify Premium", data: "2026-11-22", centavos: -2190 }];
    expect(detectarRecorrentes(pago, HOJE).map((p) => p.chave)).not.toContain("spotify premium");
  });

  it("mantém um item atrasado até 7 dias, se ainda não foi lançado", () => {
    const r = detectarRecorrentes([{ desc: "Internet", data: "2026-09-20", centavos: -9990 }, { desc: "Internet", data: "2026-10-20", centavos: -9990 }], HOJE);
    expect(r[0]!.diasAte).toBe(-3);
  });
});

describe("temHistoricoSuficiente", () => {
  it("pede uns 2 meses de histórico", () => {
    expect(temHistoricoSuficiente([], HOJE)).toBe(false);
    expect(temHistoricoSuficiente([{ data: "2026-11-01" }], HOJE)).toBe(false);
    expect(temHistoricoSuficiente([{ data: "2026-09-20" }], HOJE)).toBe(true);
  });
});

describe("serieSaldo", () => {
  it("reconstrói o saldo dia a dia para trás e calcula a variação", () => {
    const l = [{ data: "2026-11-23", centavos: -1000 }, { data: "2026-11-20", centavos: 5000 }];
    const { pontos, variacaoPct } = serieSaldo(10000, l, HOJE, "7D");
    expect(pontos.length).toBe(8);
    expect(pontos[pontos.length - 1]).toBe(10000);
    expect(pontos[0]).toBe(6000); // antes da entrada de 50 e da saída de 10
    expect(variacaoPct).toBeCloseTo(66.67, 1);
  });

  it("limita a quantidade de pontos e mantém o último", () => {
    const { pontos } = serieSaldo(100, [], HOJE, "1A", 40);
    expect(pontos.length).toBeLessThanOrEqual(41);
    expect(pontos[pontos.length - 1]).toBe(100);
  });

  it("sem saldo no início, não inventa variação", () => {
    expect(serieSaldo(500, [{ data: "2026-11-20", centavos: 500 }], HOJE, "7D").variacaoPct).toBeNull();
  });
});
