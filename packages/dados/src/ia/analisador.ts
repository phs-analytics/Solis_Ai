/**
 * Monta o contexto financeiro do usuário a partir dos dados do banco.
 * Usado pelo motor de regras da Solis AI v1.
 */

import type { Banco } from "../vault.js";
import { listarLancamentos, resumoMes } from "../repositorios/lancamentos.js";
import { resumoOrcamentos } from "../repositorios/orcamento.js";
import { listarMetas } from "../repositorios/metas.js";
import { previsaoProximos30 } from "../repositorios/recorrentes.js";
import { lerPerfil } from "../repositorios/perfil.js";

// shortcut: tipo duplicado em @solis/core/ia/regras — manter sincronizado se mudar
export type ContextoFinanceiro = {
  mes: number;
  ano: number;
  totalReceitas: number;
  totalDespesas: number;
  saldoMes: number;
  topCategorias: { categoriaId: string; totalCentavos: number }[];
  orcamentos: { categoriaId: string; limiteCentavos: number; gastosCentavos: number; restanteCentavos: number }[];
  metas: { nome: string; alvoCentavos: number; atualCentavos: number; pct: number }[];
  recorrentesProximos: { data: string; descricao: string; valorCentavos: number }[];
  pessoa?: { apelido: string; pronomes: string[] };
};

export async function montarContexto(banco: Banco): Promise<ContextoFinanceiro> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const [resumo, lancamentos, orcamentosRaw, metasRaw, recorrentes, perfil] = await Promise.all([
    resumoMes(banco, ano, mes),
    listarLancamentos(banco, { periodo: "30d" }),
    resumoOrcamentos(banco, mes, ano),
    listarMetas(banco),
    previsaoProximos30(banco),
    lerPerfil(banco),
  ]);

  // Agrupa gastos por categoriaId
  const porCategoria: Record<string, number> = {};
  for (const l of lancamentos) {
    if (l.tipo === "despesa" && l.categoriaId) {
      porCategoria[l.categoriaId] = (porCategoria[l.categoriaId] ?? 0) + Math.abs(l.valorCentavos);
    }
  }
  const topCategorias = Object.entries(porCategoria)
    .map(([categoriaId, totalCentavos]) => ({ categoriaId, totalCentavos }))
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
    .slice(0, 5);

  return {
    mes, ano,
    totalReceitas: resumo.receitas,
    totalDespesas: resumo.despesas,
    saldoMes: resumo.saldo,
    topCategorias,
    orcamentos: orcamentosRaw.map((o) => ({
      categoriaId: o.categoriaId,
      limiteCentavos: o.limiteCentavos,
      gastosCentavos: o.gastosCentavos,
      restanteCentavos: o.restanteCentavos,
    })),
    metas: metasRaw.map((m) => ({
      nome: m.nome,
      alvoCentavos: m.alvoCentavos,
      atualCentavos: m.atualCentavos,
      pct: m.alvoCentavos > 0 ? m.atualCentavos / m.alvoCentavos : 0,
    })),
    recorrentesProximos: recorrentes,
    ...(perfil && { pessoa: { apelido: perfil.apelido.trim(), pronomes: perfil.pronomes } }),
  };
}
