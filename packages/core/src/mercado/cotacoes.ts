/**
 * Cotações de ativos brasileiros e internacionais via brapi.dev (gratuito, sem chave).
 * Apenas leitura de mercado — nenhum dado do usuário é enviado.
 */

export type Cotacao = {
  ticker: string;
  nome: string;
  preco: number;
  variacao: number;    // percentual no dia
  variacaoAbs: number; // valor absoluto no dia
  moeda: string;
  atualizadoEm: string;
};

const BASE = "https://brapi.dev/api/quote";
const TIMEOUT_MS = 8000;

async function fetchComTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

type BrapiResultado = {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketChange: number;
  currency: string;
  regularMarketTime: number;
};

export async function buscarCotacoes(tickers: string[]): Promise<Cotacao[]> {
  if (tickers.length === 0) return [];
  const lista = tickers.map((t) => t.toUpperCase()).join(",");
  const url = `${BASE}/${lista}?fundamental=false`;
  const res = await fetchComTimeout(url);
  if (!res.ok) throw new Error(`brapi HTTP ${res.status}`);
  const json = (await res.json()) as { results?: BrapiResultado[] };
  return (json.results ?? []).map((r) => ({
    ticker: r.symbol,
    nome: r.shortName,
    preco: r.regularMarketPrice,
    variacao: r.regularMarketChangePercent,
    variacaoAbs: r.regularMarketChange,
    moeda: r.currency,
    atualizadoEm: new Date(r.regularMarketTime * 1000).toISOString(),
  }));
}

export async function buscarCotacao(ticker: string): Promise<Cotacao | null> {
  const lista = await buscarCotacoes([ticker]);
  return lista[0] ?? null;
}
