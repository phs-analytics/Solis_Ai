/**
 * Cliente da API Pluggy para uso pessoal (Meu Pluggy). Roda no próprio aparelho:
 * o app chama api.pluggy.ai direto e grava o resultado só no banco local.
 * Docs: https://docs.pluggy.ai/en/reference
 */

const BASE = "https://api.pluggy.ai";
const TIMEOUT_MS = 15000;

export type Fetch = typeof fetch;

export class ErroPluggy extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type ContaPluggy = {
  id: string;
  type: "BANK" | "CREDIT";
  subtype?: string;
  name: string;
  marketingName?: string | null;
  number?: string;
  balance: number;
  currencyCode: string;
  itemId: string;
};

export type TransacaoPluggy = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  status?: string;
  accountId: string;
};

async function chamar<T>(f: Fetch, caminho: string, init: RequestInit = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let r: Response;
  try {
    r = await f(`${BASE}${caminho}`, { ...init, signal: ctrl.signal });
  } catch {
    throw new ErroPluggy("Sem conexão com a Pluggy. Confira a internet.", 0);
  } finally {
    clearTimeout(timer);
  }
  if (r.status === 401 || r.status === 403) throw new ErroPluggy("Client ID ou Client Secret inválidos.", r.status);
  if (r.status === 404) throw new ErroPluggy("Item não encontrado. Confira o itemId no painel do Meu Pluggy.", 404);
  if (r.status === 429) throw new ErroPluggy("Muitas requisições. Tente de novo em 1 minuto.", 429);
  if (!r.ok) throw new ErroPluggy(`A Pluggy respondeu com erro ${r.status}.`, r.status);
  return (await r.json()) as T;
}

/** Troca Client ID + Secret por uma apiKey (vale 2 horas). */
export async function autenticarPluggy(clientId: string, clientSecret: string, f: Fetch = fetch): Promise<string> {
  const { apiKey } = await chamar<{ apiKey: string }>(f, "/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  return apiKey;
}

export async function listarContasPluggy(apiKey: string, itemId: string, f: Fetch = fetch): Promise<ContaPluggy[]> {
  const contas: ContaPluggy[] = [];
  for (let page = 1; ; page++) {
    const q = new URLSearchParams({ itemId, page: String(page), pageSize: "500" });
    const r = await chamar<{ results: ContaPluggy[]; totalPages: number }>(f, `/accounts?${q}`, {
      headers: { "X-API-KEY": apiKey },
    });
    contas.push(...r.results);
    if (page >= r.totalPages) return contas;
  }
}

/** Transações de uma conta desde `dataDe` (AAAA-MM-DD), paginando pelo cursor `next`. */
export async function listarTransacoesPluggy(
  apiKey: string, accountId: string, dataDe: string, f: Fetch = fetch
): Promise<TransacaoPluggy[]> {
  const todas: TransacaoPluggy[] = [];
  let after: string | null = null;
  // Limite de páginas evita laço infinito se a API devolver sempre o mesmo cursor.
  for (let i = 0; i < 200; i++) {
    const q = new URLSearchParams({ accountId, dateFrom: dataDe });
    if (after) q.set("after", after);
    const r = await chamar<{ results: TransacaoPluggy[]; next: string | null }>(f, `/v2/transactions?${q}`, {
      headers: { "X-API-KEY": apiKey },
    });
    todas.push(...r.results);
    if (!r.next) return todas;
    // shortcut: a doc não fixa o formato de `next`; aceita cursor puro ou URL com ?after=
    const proximo: string = r.next.startsWith("http") ? (new URL(r.next).searchParams.get("after") ?? "") : r.next;
    if (!proximo || proximo === after) return todas;
    after = proximo;
  }
  return todas;
}

/** Investimento do GET /investments (docs.pluggy.ai/reference/investments-list). Muitos campos podem vir null. */
export type InvestimentoPluggy = {
  id: string;
  name: string;
  code?: string | null;
  type: "FIXED_INCOME" | "SECURITY" | "MUTUAL_FUND" | "EQUITY" | "ETF" | "COE" | "OTHER";
  subtype?: string | null;
  balance: number;
  amount: number;
  amountOriginal?: number | null;
  quantity?: number | null;
  date?: string | null;
  issueDate?: string | null;
  status?: "ACTIVE" | "PENDING" | "TOTAL_WITHDRAWAL" | null;
};

export async function listarInvestimentosPluggy(apiKey: string, itemId: string, f: Fetch = fetch): Promise<InvestimentoPluggy[]> {
  const todos: InvestimentoPluggy[] = [];
  for (let page = 1; page <= 50; page++) {
    const q = new URLSearchParams({ itemId, page: String(page), pageSize: "500" });
    const r = await chamar<{ results: InvestimentoPluggy[]; totalPages: number }>(f, `/investments?${q}`, {
      headers: { "X-API-KEY": apiKey },
    });
    todos.push(...r.results);
    if (page >= (r.totalPages || 1)) break;
  }
  return todos;
}

/** Nome do banco do item (connector.name), para mostrar de onde veio cada investimento. */
export async function nomeBancoPluggy(apiKey: string, itemId: string, f: Fetch = fetch): Promise<string | null> {
  try {
    const r = await chamar<{ connector?: { name?: string | null } | null }>(f, `/items/${encodeURIComponent(itemId)}`, {
      headers: { "X-API-KEY": apiKey },
    });
    return r.connector?.name ?? null;
  } catch {
    return null;
  }
}

/** Classe do Solis (CHECK da tabela ativos) a partir do tipo/subtipo da Pluggy. */
export function tipoAtivoPluggy(i: Pick<InvestimentoPluggy, "type" | "subtype">): "acao" | "fii" | "etf" | "renda_fixa" | "cripto" | "outro" {
  if (i.type === "FIXED_INCOME") return "renda_fixa";
  if (i.type === "ETF" || i.subtype === "ETF_FUND") return "etf";
  if (i.type === "EQUITY") return i.subtype === "REAL_ESTATE_FUND" ? "fii" : "acao";
  return "outro";
}

/** Valor em centavos com o sinal do Solis: saída negativa, entrada positiva. */
export function centavosTransacao(t: Pick<TransacaoPluggy, "amount" | "type">): number {
  const c = Math.round(Math.abs(t.amount) * 100);
  return t.type === "DEBIT" ? -c : c;
}

/** Saldo atual em centavos. No cartão, o saldo da Pluggy é o valor usado: vira dívida (negativo). */
export function centavosSaldo(c: Pick<ContaPluggy, "balance" | "type">): number {
  const v = Math.round(c.balance * 100);
  return c.type === "CREDIT" ? -Math.abs(v) : v;
}
