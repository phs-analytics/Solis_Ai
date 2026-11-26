import { describe, expect, it, vi } from "vitest";
import { buscarAtivosMercado, listarEmAlta, lerHistorico, buscarHistorico, ErroMercado } from "../src/mercado/brapi.js";
import { tipoAtivoPluggy } from "../src/pluggy/index.js";

const resp = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

describe("brapi v2", () => {
  it("busca por nome sem chave e converte o formato v2", async () => {
    const f = vi.fn(async () => resp({ results: [{ symbol: "VALE3", name: "Vale", subType: "stock", sector: "Mineração", quote: { lastPrice: 58.9, changePercent: 0.84, volume: 1, marketCap: 2 } }] }));
    const [a] = await buscarAtivosMercado(" vale ", f as unknown as typeof fetch);
    expect(a).toMatchObject({ codigo: "VALE3", tipo: "acao", preco: 58.9, variacaoDia: 0.84 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v2/tickers?search=vale");
    expect(init.headers).toEqual({});
  });

  it("Em alta ordena por volume ou variação, igual para todos", async () => {
    const f = vi.fn(async () => resp({ results: [] }));
    await listarEmAlta("cai", f as unknown as typeof fetch);
    expect((f.mock.calls[0] as unknown as [string])[0]).toContain("sortBy=change&sortOrder=asc");
  });

  it("histórico manda a chave e lê results ou data", async () => {
    expect(lerHistorico({ data: [{ historicalDataPrice: [{ date: 1763942400, close: 10 }, { date: 1763856000, close: 9 }] }] }))
      .toEqual([{ data: "2025-11-23", preco: 9 }, { data: "2025-11-24", preco: 10 }]);
    const f = vi.fn(async () => resp({ results: [{ historicalDataPrice: [] }] }));
    await buscarHistorico("PETR4", "1mo", "minha-chave", f as unknown as typeof fetch);
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toEqual({ Authorization: "Bearer minha-chave" });
    await expect(buscarHistorico("X", "1mo", null, (async () => resp({}, 401)) as typeof fetch)).rejects.toBeInstanceOf(ErroMercado);
  });

  it("classe do Solis a partir do tipo da Pluggy", () => {
    expect(tipoAtivoPluggy({ type: "FIXED_INCOME", subtype: "CDB" })).toBe("renda_fixa");
    expect(tipoAtivoPluggy({ type: "EQUITY", subtype: "REAL_ESTATE_FUND" })).toBe("fii");
    expect(tipoAtivoPluggy({ type: "EQUITY", subtype: "STOCK" })).toBe("acao");
    expect(tipoAtivoPluggy({ type: "MUTUAL_FUND", subtype: "ETF_FUND" })).toBe("etf");
    expect(tipoAtivoPluggy({ type: "SECURITY", subtype: "PGBL" })).toBe("outro");
  });
});
