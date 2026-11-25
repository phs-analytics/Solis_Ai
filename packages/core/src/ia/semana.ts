/** Análise dos últimos 7 dias que o Solis AI imprime no recibo. Só informação: nunca recomenda investimento. */

export type MovSemana = { data: string; centavos: number; categoria: string; tipo: "receita" | "despesa" | "transferencia" };
export type MetaSemana = { nome: string; atualCentavos: number; alvoCentavos: number };

export type AnaliseSemana = {
  geradoEm: string;
  de: string;
  ate: string;
  gastos: number;
  anterior: number;
  /** null quando a semana anterior não tem gasto para comparar. */
  variacaoPct: number | null;
  topo: { nome: string; centavos: number; pct: number }[];
  economizou: { nome: string; centavos: number } | null;
  metas: { nome: string; pct: number }[];
  positivos: string[];
  atencao: string[];
  sugestoes: string[];
};

const DIA = 86_400_000;
const dias = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA);
const menos = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) - n * DIA).toISOString().slice(0, 10);
export const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function porCategoria(movs: MovSemana[], hoje: string, inicio: number) {
  const g = new Map<string, number>();
  let total = 0;
  for (const m of movs) {
    const d = dias(m.data, hoje);
    if (m.tipo === "transferencia" || m.centavos >= 0 || d < inicio || d > inicio + 6) continue;
    g.set(m.categoria, (g.get(m.categoria) ?? 0) - m.centavos);
    total -= m.centavos;
  }
  return { g, total };
}

export function analisarSemana(movs: MovSemana[], metas: MetaSemana[], hoje: string, agora = new Date()): AnaliseSemana {
  const a = porCategoria(movs, hoje, 0);
  const b = porCategoria(movs, hoje, 7);
  const variacaoPct = b.total > 0 ? Math.round(((a.total - b.total) / b.total) * 100) : null;
  const topo = [...a.g].sort((x, y) => y[1] - x[1]).slice(0, 3)
    .map(([nome, centavos]) => ({ nome, centavos, pct: a.total ? Math.round((centavos / a.total) * 100) : 0 }));
  const queda = [...b.g].map(([nome, v]) => ({ nome, centavos: v - (a.g.get(nome) ?? 0) })).filter((x) => x.centavos > 0)
    .sort((x, y) => y.centavos - x.centavos)[0] ?? null;
  const ms = metas.map((m) => ({ nome: m.nome, pct: m.alvoCentavos > 0 ? Math.min(100, Math.round((m.atualCentavos / m.alvoCentavos) * 100)) : 0 }));
  const lenta = [...ms].sort((x, y) => x.pct - y.pct)[0];

  const positivos: string[] = [], atencao: string[] = [], sugestoes: string[] = [];
  if (a.total === 0) positivos.push("Nenhum gasto registrado nos últimos 7 dias.");
  if (variacaoPct !== null && variacaoPct < 0) positivos.push(`Gastou ${-variacaoPct}% menos que na semana anterior.`);
  if (variacaoPct !== null && variacaoPct > 0) atencao.push(`Gastou ${variacaoPct}% mais que na semana anterior.`);
  if (queda) positivos.push(`${queda.nome} caiu ${reais(queda.centavos)}.`);
  for (const m of ms) if (m.pct >= 50) positivos.push(`${m.nome} já passou da metade.`);
  if (topo[0] && topo[0].pct >= 40) atencao.push(`${topo[0].nome} levou ${topo[0].pct}% dos gastos.`);
  if (lenta && lenta.pct < 25) atencao.push(`${lenta.nome} está em ${lenta.pct}% da meta.`);
  if (topo[0]) sugestoes.push(`Teto de ${reais(Math.round((topo[0].centavos * 0.85) / 100) * 100)} para ${topo[0].nome} na próxima semana.`);
  if (lenta && lenta.pct < 100) sugestoes.push(`Guardar um pouco toda semana na meta ${lenta.nome}.`);
  if (!sugestoes.length) sugestoes.push("Continue registrando os gastos para a análise ficar mais precisa.");

  return { geradoEm: agora.toISOString(), de: menos(hoje, 6), ate: hoje, gastos: a.total, anterior: b.total, variacaoPct, topo, economizou: queda, metas: ms, positivos, atencao, sugestoes };
}

/** Texto curto para mandar pelo WhatsApp ou Telegram. */
export function textoAnalise(r: AnaliseSemana): string {
  const v = r.variacaoPct === null ? "" : ` (${r.variacaoPct > 0 ? "+" : ""}${r.variacaoPct}% vs semana anterior)`;
  return [
    `Solis AI · Análise da semana (${r.de.split("-").reverse().join("/")} a ${r.ate.split("-").reverse().join("/")})`,
    `Gastos: ${reais(r.gastos)}${v}`,
    r.topo.length ? `Onde mais gastou: ${r.topo.map((t) => `${t.nome} ${reais(t.centavos)}`).join(", ")}` : "",
    r.economizou ? `Onde economizou: ${r.economizou.nome} (−${reais(r.economizou.centavos)})` : "",
    r.metas.length ? `Metas: ${r.metas.map((m) => `${m.nome} ${m.pct}%`).join(", ")}` : "",
    r.positivos.length ? `Positivo: ${r.positivos.join(" ")}` : "",
    r.atencao.length ? `Atenção: ${r.atencao.join(" ")}` : "",
    `Sugestões: ${r.sugestoes.join(" ")}`,
    "Informação sobre os seus dados. Não é recomendação de investimento.",
  ].filter(Boolean).join("\n");
}
