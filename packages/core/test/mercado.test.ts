import { describe, it, expect, vi, beforeEach } from "vitest";
import { buscarSelic, buscarIPCA, buscarIndices } from "../src/mercado/indices.js";
import { buscarCotacoes } from "../src/mercado/cotacoes.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => mockFetch.mockReset());

describe("buscarSelic", () => {
  it("retorna valor e data do BCB", async () => {
    mockFetch.mockReturnValueOnce(mockOk([{ data: "15/11/2026", valor: "12.25" }]));
    const r = await buscarSelic();
    expect(r.valor).toBe(12.25);
    expect(r.data).toBe("15/11/2026");
    expect(r.unidade).toContain("%");
  });
});

describe("buscarIPCA", () => {
  it("retorna valor mensal do IBGE", async () => {
    mockFetch.mockReturnValueOnce(
      mockOk([{
        resultados: [{ series: [{ serie: { "202610": "0.56" } }] }],
      }])
    );
    const r = await buscarIPCA();
    expect(r.valor).toBe(0.56);
    expect(r.data).toBe("2026-10-01");
  });
});

describe("buscarIndices", () => {
  it("retorna apenas os que tiverem sucesso", async () => {
    mockFetch
      .mockReturnValueOnce(mockOk([{ data: "15/11/2026", valor: "12.25" }]))
      .mockReturnValueOnce(Promise.reject(new Error("offline")))
      .mockReturnValueOnce(mockOk([{ resultados: [{ series: [{ serie: { "202610": "0.56" } }] }] }]));
    const lista = await buscarIndices();
    expect(lista.length).toBeGreaterThanOrEqual(1);
  });
});

describe("buscarCotacoes", () => {
  it("mapeia resultado da brapi", async () => {
    mockFetch.mockReturnValueOnce(mockOk({
      results: [{
        symbol: "PETR4",
        shortName: "PETROBRAS PN",
        regularMarketPrice: 38.50,
        regularMarketChangePercent: 1.23,
        regularMarketChange: 0.47,
        currency: "BRL",
        regularMarketTime: 1700000000,
      }],
    }));
    const lista = await buscarCotacoes(["PETR4"]);
    expect(lista).toHaveLength(1);
    expect(lista[0]!.ticker).toBe("PETR4");
    expect(lista[0]!.preco).toBe(38.50);
    expect(lista[0]!.variacao).toBe(1.23);
  });

  it("retorna [] para lista vazia", async () => {
    expect(await buscarCotacoes([])).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
