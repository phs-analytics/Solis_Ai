// Resumos de gastos para a tela inicial. Contas simples sobre os lançamentos do próprio aparelho.

export type Saida = { data: string; centavos: number; categoriaId?: string | null; tipo?: string };

const DIA = 86_400_000;
const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);
const somar = (iso: string, n: number) => new Date(Date.parse(iso) + n * DIA).toISOString().slice(0, 10);

/** Só despesas de verdade: valor negativo e que não seja transferência entre contas. */
const ehGasto = (l: Saida) => l.centavos < 0 && l.tipo !== "transferencia";

export type FatiaCategoria = { categoriaId: string | null; centavos: number; pct: number };

/**
 * Onde o dinheiro foi nos últimos `periodo` dias: as `top` maiores categorias e, se sobrar, uma fatia "outros"
 * (categoriaId = "outros"). Sem categoria vira `null`. Os pct somam 100.
 */
export function gastosPorCategoria(lancs: Saida[], hoje: string, periodo = 30, top = 4): FatiaCategoria[] {
  const de = somar(hoje, -periodo);
  const por = new Map<string | null, number>();
  for (const l of lancs) {
    if (!ehGasto(l) || l.data < de || l.data > hoje) continue;
    const k = l.categoriaId ?? null;
    por.set(k, (por.get(k) ?? 0) - l.centavos);
  }
  const total = [...por.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return [];
  const ordenado = [...por.entries()].sort((a, b) => b[1] - a[1]);
  const maiores = ordenado.slice(0, top);
  const resto = ordenado.slice(top).reduce((s, [, v]) => s + v, 0);
  const fatias = maiores.map(([categoriaId, centavos]) => ({ categoriaId, centavos, pct: Math.round((centavos / total) * 100) }));
  if (resto > 0) fatias.push({ categoriaId: "outros", centavos: resto, pct: 0 });
  // fecha em 100: o que sobra do arredondamento vai para a maior fatia
  const soma = fatias.reduce((s, f, i) => (f.categoriaId === "outros" ? s : s + f.pct), 0);
  const outros = fatias.find((f) => f.categoriaId === "outros");
  if (outros) outros.pct = Math.max(0, 100 - soma);
  else if (fatias.length) fatias[0]!.pct += 100 - soma;
  return fatias;
}

/** Gasto de cada um dos últimos `n` dias, do mais antigo ao de hoje (positivo, em centavos). */
export function gastosDiarios(lancs: Saida[], hoje: string, n = 7): { data: string; centavos: number }[] {
  const por = new Map<string, number>();
  for (const l of lancs) if (ehGasto(l)) por.set(l.data, (por.get(l.data) ?? 0) - l.centavos);
  return Array.from({ length: n }, (_, i) => {
    const data = somar(hoje, i - (n - 1));
    return { data, centavos: por.get(data) ?? 0 };
  });
}

/** Quantos dias faltam em relação ao ciclo mensal (0 a 1): 0 = acabou de passar, 1 = vence hoje. Para o anel das previsões. */
export function progressoCiclo(diasAte: number, ciclo = 30): number {
  return Math.min(1, Math.max(0, 1 - diasAte / ciclo));
}

