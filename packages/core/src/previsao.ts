export interface Lancamento {
  desc: string;
  data: string; // ISO date, YYYY-MM-DD
  centavos: number;
}

const DIA = 86_400_000;

function maisUmMes(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number) as [number, number, number];
  // clamp to the month's last day (Jan 31 -> Feb 28)
  const ultimo = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

/**
 * Fixed entries (salary, streaming, tuition): the same description seen in 2+ different months.
 * Each one is expected again one month after its last occurrence; returns those due in (hoje, hoje+dias].
 */
export function preverProximos(historico: Lancamento[], hoje: string, dias = 5): Lancamento[] {
  const porDesc = new Map<string, Lancamento[]>();
  for (const l of historico) porDesc.set(l.desc, [...(porDesc.get(l.desc) ?? []), l]);

  const inicio = Date.parse(hoje);
  const fim = inicio + dias * DIA;
  const previstos: Lancamento[] = [];
  for (const itens of porDesc.values()) {
    if (new Set(itens.map((l) => l.data.slice(0, 7))).size < 2) continue;
    const ultimo = itens.reduce((a, b) => (a.data > b.data ? a : b));
    let data = maisUmMes(ultimo.data);
    while (Date.parse(data) <= inicio) data = maisUmMes(data);
    if (Date.parse(data) <= fim) previstos.push({ ...ultimo, data });
  }
  return previstos.sort((a, b) => a.data.localeCompare(b.data));
}
