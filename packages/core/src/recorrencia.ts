// Detecta gastos e entradas fixas (assinaturas, contas, salário) no histórico do próprio aparelho.
// Nada sai do celular: é só uma conta sobre os lançamentos já gravados.

export type Ocorrencia = {
  desc: string;
  data: string; // AAAA-MM-DD
  centavos: number; // negativo = saída
  categoriaId?: string | null;
  contaId?: string | null;
};

export type Previsao = {
  chave: string;
  desc: string;
  dataPrevista: string;
  diasAte: number; // negativo = já passou da data e ainda não foi lançado
  centavos: number; // estimativa (média), com o sinal do último lançamento
  categoriaId: string | null;
  contaId: string | null;
  ocorrencias: number;
};

const DIA = 86_400_000;
const MESES = /\b(jan(eiro)?|fev(ereiro)?|mar(co)?|abr(il)?|mai(o)?|jun(ho)?|jul(ho)?|ago(sto)?|set(embro)?|out(ubro)?|nov(embro)?|dez(embro)?)\b/g;

/** "Spotify  Premium 11/2026", "SPOTIFY PREMIUM (3/12)" e "spotify premium" viram a mesma chave. */
export function normalizarDescricao(desc: string): string {
  return desc
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bparcela\b/g, " ")
    .replace(MESES, " ")
    .replace(/[0-9]+/g, " ")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);

function maisUmMes(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const ultimo = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

/**
 * Lançamentos que se repetem mês a mês nos últimos 90 dias:
 * - mesma descrição normalizada em pelo menos 2 meses diferentes;
 * - intervalo entre as ocorrências de 25 a 35 dias (descarta gastos soltos, como vários Uber no mês);
 * - valor estável, até 20% de diferença da média.
 * A próxima data é um mês depois da última. Entra se cair entre 7 dias atrás (ainda não lançado) e daqui a 30 dias,
 * e se não foi lançado nos últimos 7 dias (aí já está pago neste ciclo).
 */
export function detectarRecorrentes(historico: Ocorrencia[], hoje: string, janelaDias = 30): Previsao[] {
  const inicio = Date.parse(hoje) - 92 * DIA;
  const grupos = new Map<string, Ocorrencia[]>();
  for (const o of historico) {
    if (Date.parse(o.data) < inicio || o.data > hoje) continue;
    const chave = normalizarDescricao(o.desc);
    if (chave.length < 2) continue;
    grupos.set(chave, [...(grupos.get(chave) ?? []), o]);
  }

  const previsoes: Previsao[] = [];
  for (const [chave, itens] of grupos) {
    itens.sort((a, b) => a.data.localeCompare(b.data));
    if (new Set(itens.map((o) => o.data.slice(0, 7))).size < 2) continue;
    const intervalos = itens.slice(1).map((o, i) => dias(itens[i]!.data, o.data));
    if (!intervalos.every((d) => d >= 25 && d <= 35)) continue;
    const valores = itens.map((o) => Math.abs(o.centavos));
    const media = valores.reduce((s, v) => s + v, 0) / valores.length;
    if (valores.some((v) => Math.abs(v - media) > media * 0.2)) continue;

    const ultimo = itens[itens.length - 1]!;
    if (dias(ultimo.data, hoje) <= 7) continue; // lançado há poucos dias: já está pago neste ciclo
    const dataPrevista = maisUmMes(ultimo.data);
    const diasAte = dias(hoje, dataPrevista);
    if (diasAte < -7 || diasAte > janelaDias) continue;
    previsoes.push({
      chave, desc: ultimo.desc, dataPrevista, diasAte,
      centavos: Math.sign(ultimo.centavos || -1) * Math.round(media),
      categoriaId: ultimo.categoriaId ?? null, contaId: ultimo.contaId ?? null, ocorrencias: itens.length,
    });
  }
  return previsoes.sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
}

/** Há pelo menos 2 meses de histórico? (abaixo disso a Home mostra a dica em vez das previsões) */
export function temHistoricoSuficiente(historico: Pick<Ocorrencia, "data">[], hoje: string): boolean {
  if (historico.length === 0) return false;
  const maisAntigo = historico.reduce((m, o) => (o.data < m ? o.data : m), hoje);
  return dias(maisAntigo, hoje) >= 56;
}

export type PeriodoSaldo = "7D" | "1M" | "3M" | "6M" | "1A";
export const DIAS_PERIODO: Record<PeriodoSaldo, number> = { "7D": 7, "1M": 30, "3M": 90, "6M": 180, "1A": 365 };

/**
 * Saldo de cada dia do período, andando para trás a partir do saldo de hoje.
 * Transferências entre contas próprias somam zero e não mexem no total.
 * Devolve no máximo `maxPontos` pontos (amostrados) e a variação do período em %.
 */
export function serieSaldo(
  saldoHoje: number, lancamentos: Pick<Ocorrencia, "data" | "centavos">[], hoje: string, periodo: PeriodoSaldo, maxPontos = 40,
): { pontos: number[]; variacaoPct: number | null } {
  const n = DIAS_PERIODO[periodo];
  const porDia = new Map<string, number>();
  for (const l of lancamentos) porDia.set(l.data, (porDia.get(l.data) ?? 0) + l.centavos);
  const serie: number[] = [];
  let saldo = saldoHoje;
  const base = Date.parse(hoje);
  for (let i = 0; i <= n; i++) {
    const d = new Date(base - i * DIA).toISOString().slice(0, 10);
    serie.push(saldo);
    saldo -= porDia.get(d) ?? 0; // saldo do fim do dia anterior
  }
  serie.reverse();
  const passo = Math.max(1, Math.ceil(serie.length / maxPontos));
  const pontos = serie.filter((_, i) => i % passo === 0 || i === serie.length - 1);
  const ini = serie[0]!, fim = serie[serie.length - 1]!;
  return { pontos, variacaoPct: ini === 0 ? null : ((fim - ini) / Math.abs(ini)) * 100 };
}
