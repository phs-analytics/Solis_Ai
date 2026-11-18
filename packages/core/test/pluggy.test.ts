import { describe, expect, it, vi } from "vitest";
import {
  autenticarPluggy, listarContasPluggy, listarTransacoesPluggy, centavosTransacao, centavosSaldo, ErroPluggy,
} from "../src/pluggy/index.js";

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

describe("cliente Pluggy", () => {
  it("autentica com clientId e clientSecret e devolve a apiKey", async () => {
    const f = vi.fn(async () => resposta({ apiKey: "k1" }));
    expect(await autenticarPluggy("id", "segredo", f as typeof fetch)).toBe("k1");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.pluggy.ai/auth");
    expect(JSON.parse(init.body as string)).toEqual({ clientId: "id", clientSecret: "segredo" });
  });

  it("traduz 401 e 429 em mensagens simples", async () => {
    await expect(autenticarPluggy("a", "b", (async () => resposta({}, 401)) as typeof fetch)).rejects.toThrow(/inválidos/);
    await expect(autenticarPluggy("a", "b", (async () => resposta({}, 429)) as typeof fetch)).rejects.toBeInstanceOf(ErroPluggy);
  });

  it("pagina contas e envia X-API-KEY", async () => {
    const f = vi.fn(async (url: string) =>
      resposta(url.includes("page=1")
        ? { results: [{ id: "c1" }], totalPages: 2 }
        : { results: [{ id: "c2" }], totalPages: 2 }));
    const contas = await listarContasPluggy("k", "item", f as unknown as typeof fetch);
    expect(contas.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].headers).toEqual({ "X-API-KEY": "k" });
  });

  it("segue o cursor next das transações (cursor puro ou URL)", async () => {
    const f = vi.fn(async (url: string) => {
      if (!url.includes("after=")) return resposta({ results: [{ id: "t1" }], next: "cur2" });
      if (url.includes("after=cur2")) return resposta({ results: [{ id: "t2" }], next: "https://api.pluggy.ai/v2/transactions?after=cur3" });
      return resposta({ results: [{ id: "t3" }], next: null });
    });
    const ts = await listarTransacoesPluggy("k", "conta", "2026-08-01", f as unknown as typeof fetch);
    expect(ts.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(f.mock.calls[0]![0]).toContain("dateFrom=2026-08-01");
  });

  it("converte valores pelo type, não pelo sinal", () => {
    expect(centavosTransacao({ amount: 45.9, type: "DEBIT" })).toBe(-4590);
    expect(centavosTransacao({ amount: -45.9, type: "DEBIT" })).toBe(-4590);
    expect(centavosTransacao({ amount: 1500, type: "CREDIT" })).toBe(150000);
    expect(centavosSaldo({ balance: 300.1, type: "BANK" })).toBe(30010);
    expect(centavosSaldo({ balance: 820, type: "CREDIT" })).toBe(-82000);
  });
});
