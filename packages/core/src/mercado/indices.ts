/**
 * Índices econômicos brasileiros via APIs públicas do BCB e IBGE.
 * Nunca envia dados do usuário — apenas consultas de mercado.
 */

export type IndiceEconomico = {
  nome: string;
  valor: number;
  unidade: string;
  data: string;
};

const BCB_SERIES: Record<string, { id: number; nome: string; unidade: string }> = {
  selic: { id: 432, nome: "Selic (a.a.)", unidade: "% a.a." },
  cdi:   { id: 4389, nome: "CDI (a.a.)", unidade: "% a.a." },
};

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

export async function buscarSelic(): Promise<IndiceEconomico> {
  const s = BCB_SERIES.selic!;
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.id}/dados/ultimos/1?formato=json`;
  const res = await fetchComTimeout(url);
  if (!res.ok) throw new Error(`BCB HTTP ${res.status}`);
  const json = (await res.json()) as { data: string; valor: string }[];
  const ultimo = json[0];
  if (!ultimo) throw new Error("BCB: resposta vazia");
  return { nome: s.nome, valor: parseFloat(ultimo.valor), unidade: s.unidade, data: ultimo.data };
}

export async function buscarCDI(): Promise<IndiceEconomico> {
  const s = BCB_SERIES.cdi!;
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.id}/dados/ultimos/1?formato=json`;
  const res = await fetchComTimeout(url);
  if (!res.ok) throw new Error(`BCB HTTP ${res.status}`);
  const json = (await res.json()) as { data: string; valor: string }[];
  const ultimo = json[0];
  if (!ultimo) throw new Error("BCB: resposta vazia");
  return { nome: s.nome, valor: parseFloat(ultimo.valor), unidade: s.unidade, data: ultimo.data };
}

export async function buscarIPCA(): Promise<IndiceEconomico> {
  // IBGE: série 1737 — IPCA mensal (%)
  const url = "https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/-1/variaveis/2266?localidades=N1[all]";
  const res = await fetchComTimeout(url);
  if (!res.ok) throw new Error(`IBGE HTTP ${res.status}`);
  const json = (await res.json()) as {
    resultados: { series: { serie: Record<string, string> }[] }[];
  }[];
  const serie = json[0]?.resultados[0]?.series[0]?.serie;
  if (!serie) throw new Error("IBGE: resposta inesperada");
  const [periodo, valorStr] = Object.entries(serie)[0]!;
  const ano = periodo.slice(0, 4);
  const mes = periodo.slice(4, 6);
  return {
    nome: "IPCA (mensal)",
    valor: parseFloat(valorStr),
    unidade: "% a.m.",
    data: `${ano}-${mes}-01`,
  };
}

export async function buscarIndices(): Promise<IndiceEconomico[]> {
  const resultados = await Promise.allSettled([buscarSelic(), buscarCDI(), buscarIPCA()]);
  return resultados
    .filter((r): r is PromiseFulfilledResult<IndiceEconomico> => r.status === "fulfilled")
    .map((r) => r.value);
}
