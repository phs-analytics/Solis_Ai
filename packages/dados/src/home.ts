import { DIAS_PERIODO, detectarRecorrentes, gastosDiarios, gastosPorCategoria, normalizarDescricao, serieSaldo, temHistoricoSuficiente } from "@solis/core";
import type { FatiaCategoria, PeriodoSaldo, Previsao } from "@solis/core";
import type { Banco } from "./vault.js";
import { listarContas, saldoConta } from "./repositorios/contas.js";
import type { TipoConta } from "./repositorios/contas.js";
import { listarLancamentos } from "./repositorios/lancamentos.js";
import type { TipoLancamento } from "./repositorios/lancamentos.js";
import { listarRecorrentes } from "./repositorios/recorrentes.js";
import { listarCategorias } from "./repositorios/categorias.js";
import { listarMetas } from "./repositorios/metas.js";

export type PrevisaoHome = Previsao & { origem: "detectada" | "cadastrada" };

export type ResumoHome = {
  contas: { id: string; nome: string; tipo: TipoConta; saldoCentavos: number }[];
  saldoTotal: number;
  series: Record<PeriodoSaldo, { pontos: number[]; variacaoPct: number | null }>;
  fluxo30: { entradas: number; saidas: number };
  ultimos: { id: string; descricao: string; valorCentavos: number; data: string; tipo: TipoLancamento; categoriaId: string | null; contaNome: string }[];
  previsoes: PrevisaoHome[];
  historicoSuficiente: boolean;
  /** Onde o dinheiro foi nos últimos 30 dias (top 4 + outros), já com o nome da categoria. */
  categorias: (FatiaCategoria & { nome: string })[];
  /** Gasto de cada um dos últimos 7 dias (centavos positivos), do mais antigo ao de hoje. */
  diario7: { data: string; centavos: number }[];
  /** A meta ativa mais antiga, para o anel de progresso. */
  meta: { id: string; nome: string; alvoCentavos: number; atualCentavos: number; pct: number } | null;
};

/** Data local (não UTC), para "hoje" não virar amanhã à noite. */
export function hojeLocal(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const somarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return hojeLocal(d);
};

/** Tudo o que a tela inicial mostra, numa leitura do banco local. Nada sai do aparelho. */
export async function montarHome(banco: Banco, hoje = hojeLocal()): Promise<ResumoHome> {
  const [contas, ano, recorrentes, categorias, metas] = await Promise.all([
    listarContas(banco),
    listarLancamentos(banco, { periodo: { de: somarDias(hoje, -DIAS_PERIODO["1A"]), ate: hoje } }),
    listarRecorrentes(banco),
    listarCategorias(banco),
    listarMetas(banco),
  ]);
  const saldos = await Promise.all(contas.map((c) => saldoConta(banco, c.id)));
  const saldoTotal = saldos.reduce((s, v) => s + v, 0);
  const nomeConta = new Map(contas.map((c) => [c.id, c.nome]));

  const movimentos = ano.map((l) => ({ data: l.data, centavos: l.valorCentavos }));
  // Sem histórico cobrindo o período inteiro, a variação % não diz nada (ex.: "+3.400%" no primeiro mês): fica de fora.
  const maisAntigo = ano.reduce<string | null>((m, l) => (m === null || l.data < m ? l.data : m), null);
  const series = Object.fromEntries(
    (Object.keys(DIAS_PERIODO) as PeriodoSaldo[]).map((p) => {
      const sr = serieSaldo(saldoTotal, movimentos, hoje, p);
      const cobre = maisAntigo !== null && maisAntigo <= somarDias(hoje, -DIAS_PERIODO[p]);
      return [p, cobre ? sr : { ...sr, variacaoPct: null }];
    }),
  ) as ResumoHome["series"];

  const de30 = somarDias(hoje, -30);
  const fluxo30 = { entradas: 0, saidas: 0 };
  for (const l of ano) {
    if (l.data < de30 || l.tipo === "transferencia") continue;
    if (l.valorCentavos >= 0) fluxo30.entradas += l.valorCentavos;
    else fluxo30.saidas += -l.valorCentavos;
  }

  const historico = ano.map((l) => ({ desc: l.descricao, data: l.data, centavos: l.valorCentavos, categoriaId: l.categoriaId, contaId: l.contaId }));
  const detectadas = detectarRecorrentes(historico.filter((h) => h.desc), hoje);

  // Recorrentes cadastrados à mão (Metas > recorrentes): próxima data pelo dia do mês, nos próximos 30 dias.
  const cadastradas: PrevisaoHome[] = [];
  for (const r of recorrentes) {
    const [a, m] = hoje.split("-").map(Number) as [number, number];
    let alvo = new Date(a, m - 1, Math.min(r.diaMes, new Date(a, m, 0).getDate()), 12);
    if (hojeLocal(alvo) < hoje) alvo = new Date(a, m, Math.min(r.diaMes, new Date(a, m + 1, 0).getDate()), 12);
    const dataPrevista = hojeLocal(alvo);
    const diasAte = Math.round((Date.parse(dataPrevista) - Date.parse(hoje)) / 86_400_000);
    if (diasAte > 30) continue;
    cadastradas.push({
      chave: normalizarDescricao(r.descricao), desc: r.descricao, dataPrevista, diasAte,
      centavos: r.tipo === "despesa" ? -Math.abs(r.valorCentavos) : Math.abs(r.valorCentavos),
      categoriaId: r.categoriaId, contaId: r.contaId, ocorrencias: 0, origem: "cadastrada",
    });
  }
  const jaCadastradas = new Set(cadastradas.map((p) => p.chave));
  const previsoes = [...cadastradas, ...detectadas.filter((p) => !jaCadastradas.has(p.chave)).map((p) => ({ ...p, origem: "detectada" as const }))]
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));

  const saidas = ano.map((l) => ({ data: l.data, centavos: l.valorCentavos, categoriaId: l.categoriaId, tipo: l.tipo }));
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const m = metas[0];

  return {
    contas: contas.map((c, i) => ({ id: c.id, nome: c.nome, tipo: c.tipo, saldoCentavos: saldos[i]! })),
    saldoTotal,
    series,
    fluxo30,
    ultimos: ano.slice(0, 30).map((l) => ({
      id: l.id, descricao: l.descricao, valorCentavos: l.valorCentavos, data: l.data, tipo: l.tipo,
      categoriaId: l.categoriaId, contaNome: nomeConta.get(l.contaId) ?? "",
    })),
    previsoes,
    historicoSuficiente: temHistoricoSuficiente(historico, hoje),
    categorias: gastosPorCategoria(saidas, hoje).map((f) => ({
      ...f, nome: f.categoriaId === "outros" ? "Outros" : f.categoriaId ? nomeCategoria.get(f.categoriaId) ?? "Sem categoria" : "Sem categoria",
    })),
    diario7: gastosDiarios(saidas, hoje),
    meta: m ? { id: m.id, nome: m.nome, alvoCentavos: m.alvoCentavos, atualCentavos: m.atualCentavos, pct: m.alvoCentavos > 0 ? Math.min(1, m.atualCentavos / m.alvoCentavos) : 0 } : null,
  };
}
