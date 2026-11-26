/**
 * Mercado via brapi.dev, API v2 (docs: https://brapi.dev/docs).
 * - Lista/busca de ativos (`/api/v2/tickers`): não exige chave. Serve para busca, "Em alta" e preço do dia.
 * - Histórico (`/api/v2/stocks/historical`): exige chave, exceto os ativos de teste. Plano grátis: até 3 meses.
 * PRIVACIDADE: o que sai do aparelho é só o texto buscado ou o código do ativo (ex.: PETR4).
 */

type Fetch = typeof fetch;

export type TipoMercado = "acao" | "fii" | "etf" | "outro";

export type AtivoMercado = {
  codigo: string;
  nome: string;
  tipo: TipoMercado;
  setor: string | null;
  preco: number | null; // em reais
  variacaoDia: number | null; // percentual
  volume: number | null;
  valorMercado: number | null;
  logo: string | null;
};

export type PontoHistorico = { data: string; preco: number }; // data AAAA-MM-DD, preço em reais

export type OrdemMercado = "volume" | "sobe" | "cai";

const BASE = "https://brapi.dev/api/v2";
const TIMEOUT_MS = 10000;
/** Ativos que a brapi libera sem chave (docs: "Free tickers without token"). */
export const ATIVOS_SEM_CHAVE = ["PETR4", "MGLU3", "VALE3", "ITUB4", "MXRF11", "HGLG11"];

export class ErroMercado extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function chamar<T>(f: Fetch, caminho: string, chave?: string | null): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let r: Response;
  try {
    r = await f(`${BASE}${caminho}`, { signal: ctrl.signal, headers: chave ? { Authorization: `Bearer ${chave}` } : {} });
  } catch {
    throw new ErroMercado("Sem conexão para buscar cotações.", 0);
  } finally {
    clearTimeout(timer);
  }
  if (r.status === 401) throw new ErroMercado("Chave da brapi ausente ou inválida.", 401);
  if (r.status === 403) throw new ErroMercado("Seu plano da brapi não inclui esse dado.", 403);
  if (r.status === 429) throw new ErroMercado("Limite de consultas da brapi atingido. Tente mais tarde.", 429);
  if (!r.ok) throw new ErroMercado(`A brapi respondeu com erro ${r.status}.`, r.status);
  return (await r.json()) as T;
}

type TickerV2 = {
  symbol: string;
  name?: string | null;
  longName?: string | null;
  subType?: string | null;
  sector?: string | null;
  logoUrl?: string | null;
  quote?: { lastPrice?: number | null; changePercent?: number | null; volume?: number | null; marketCap?: number | null } | null;
};

function tipoDe(subType: string | null | undefined): TipoMercado {
  const s = (subType ?? "").toLowerCase();
  if (s === "fii") return "fii";
  if (s === "etf") return "etf";
  if (s === "stock" || s === "unit") return "acao";
  return "outro";
}

export function paraAtivoMercado(t: TickerV2): AtivoMercado {
  return {
    codigo: t.symbol,
    nome: t.name || t.longName || t.symbol,
    tipo: tipoDe(t.subType),
    setor: t.sector ?? null,
    preco: t.quote?.lastPrice ?? null,
    variacaoDia: t.quote?.changePercent ?? null,
    volume: t.quote?.volume ?? null,
    valorMercado: t.quote?.marketCap ?? null,
    logo: t.logoUrl ?? null,
  };
}

/** Busca por nome ou código (ex.: "vale"). Sem chave. */
export async function buscarAtivosMercado(texto: string, f: Fetch = fetch): Promise<AtivoMercado[]> {
  const q = new URLSearchParams({ search: texto.trim(), limit: "15" });
  const r = await chamar<{ results?: TickerV2[]; tickers?: TickerV2[] }>(f, `/tickers?${q}`);
  return (r.results ?? r.tickers ?? []).map(paraAtivoMercado);
}

/** "Em alta": igual para todo mundo, pelo movimento do dia na B3. Não usa o perfil da pessoa. */
export async function listarEmAlta(ordem: OrdemMercado, f: Fetch = fetch): Promise<AtivoMercado[]> {
  const q = new URLSearchParams({ limit: "10", sortBy: ordem === "volume" ? "volume" : "change", sortOrder: ordem === "cai" ? "asc" : "desc" });
  const r = await chamar<{ results?: TickerV2[]; tickers?: TickerV2[] }>(f, `/tickers?${q}`);
  return (r.results ?? r.tickers ?? []).map(paraAtivoMercado);
}

/** Preço do dia de um código exato, pela lista (sem chave). */
export async function cotacaoDoDia(codigo: string, f: Fetch = fetch): Promise<AtivoMercado | null> {
  const lista = await buscarAtivosMercado(codigo, f);
  return lista.find((a) => a.codigo.toUpperCase() === codigo.toUpperCase()) ?? null;
}

export type PeriodoHistorico = "5d" | "1mo" | "3mo";

/**
 * Histórico diário. A doc não fixa o envelope da resposta; aceita `results[0]` ou `data[0]`
 * e o campo `historicalDataPrice` com `date` em segundos (unix) e `close`.
 */
export async function buscarHistorico(codigo: string, periodo: PeriodoHistorico, chave: string | null, f: Fetch = fetch): Promise<PontoHistorico[]> {
  const q = new URLSearchParams({ symbols: codigo, range: periodo, interval: "1d", sortOrder: "asc" });
  const r = await chamar<Record<string, unknown>>(f, `/stocks/historical?${q}`, chave);
  return lerHistorico(r);
}

export function lerHistorico(r: Record<string, unknown>): PontoHistorico[] {
  const lista = (r.results ?? r.data) as unknown;
  const item = Array.isArray(lista) ? lista[0] : lista;
  const precos = (item as { historicalDataPrice?: { date: number; close: number | null }[] } | undefined)?.historicalDataPrice ?? [];
  return precos
    .filter((p) => typeof p.close === "number")
    .map((p) => ({ data: new Date(p.date * 1000).toISOString().slice(0, 10), preco: p.close as number }))
    .sort((a, b) => a.data.localeCompare(b.data));
}
