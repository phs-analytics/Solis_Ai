import type { Banco } from "../vault.js";

export type TipoLancamento = "receita" | "despesa" | "transferencia";

export type Lancamento = {
  id: string;
  contaId: string;
  valorCentavos: number;
  descricao: string;
  categoriaId: string | null;
  data: string;
  tipo: TipoLancamento;
  recorrente: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type FiltroLancamentos = {
  contaId?: string;
  tipo?: TipoLancamento;
  categoriaId?: string;
  busca?: string;
  /** "7d" | "30d" | "60d" | {de: string; ate: string} */
  periodo?: "7d" | "30d" | "60d" | { de: string; ate: string };
};

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function agora(): string {
  return new Date().toISOString();
}

function mapear(r: Record<string, unknown>): Lancamento {
  return {
    id: r.id as string,
    contaId: r.conta_id as string,
    valorCentavos: r.valor_centavos as number,
    descricao: r.descricao as string,
    categoriaId: r.categoria_id as string | null,
    data: r.data as string,
    tipo: r.tipo as TipoLancamento,
    recorrente: (r.recorrente as number) === 1,
    criadoEm: r.criado_em as string,
    atualizadoEm: r.atualizado_em as string,
  };
}

function periodoParaDatas(periodo: FiltroLancamentos["periodo"]): { de: string; ate: string } {
  const ate = new Date();
  const de = new Date();
  if (periodo === "7d") de.setDate(de.getDate() - 7);
  else if (periodo === "30d") de.setDate(de.getDate() - 30);
  else if (periodo === "60d") de.setDate(de.getDate() - 60);
  else if (periodo && typeof periodo === "object") return periodo;
  return { de: de.toISOString().slice(0, 10), ate: ate.toISOString().slice(0, 10) };
}

export async function listarLancamentos(
  banco: Banco,
  filtro: FiltroLancamentos = {}
): Promise<Lancamento[]> {
  const condicoes: string[] = [];
  const params: (string | number | null)[] = [];

  if (filtro.contaId) { condicoes.push("conta_id = ?"); params.push(filtro.contaId); }
  if (filtro.tipo) { condicoes.push("tipo = ?"); params.push(filtro.tipo); }
  if (filtro.categoriaId) { condicoes.push("categoria_id = ?"); params.push(filtro.categoriaId); }
  if (filtro.busca) { condicoes.push("descricao LIKE ?"); params.push(`%${filtro.busca}%`); }
  if (filtro.periodo) {
    const { de, ate } = periodoParaDatas(filtro.periodo);
    condicoes.push("data BETWEEN ? AND ?");
    params.push(de, ate);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
  const rows = await banco.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM lancamentos ${where} ORDER BY data DESC, criado_em DESC`,
    params
  );
  return rows.map(mapear);
}

export async function criarLancamento(
  banco: Banco,
  dados: Pick<Lancamento, "contaId" | "valorCentavos" | "descricao" | "categoriaId" | "data" | "tipo" | "recorrente">
): Promise<Lancamento> {
  const ts = agora();
  const lancamento: Lancamento = { id: uuid(), ...dados, criadoEm: ts, atualizadoEm: ts };
  await banco.runAsync(
    `INSERT INTO lancamentos
       (id, conta_id, valor_centavos, descricao, categoria_id, data, tipo, recorrente, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lancamento.id, lancamento.contaId, lancamento.valorCentavos,
      lancamento.descricao, lancamento.categoriaId, lancamento.data,
      lancamento.tipo, lancamento.recorrente ? 1 : 0,
      lancamento.criadoEm, lancamento.atualizadoEm,
    ]
  );
  return lancamento;
}

export async function atualizarLancamento(
  banco: Banco,
  id: string,
  dados: Partial<Pick<Lancamento, "valorCentavos" | "descricao" | "categoriaId" | "data" | "tipo">>
): Promise<void> {
  const campos: string[] = ["atualizado_em = ?"];
  const valores: (string | number | null)[] = [agora()];
  if (dados.valorCentavos !== undefined) { campos.push("valor_centavos = ?"); valores.push(dados.valorCentavos); }
  if (dados.descricao !== undefined) { campos.push("descricao = ?"); valores.push(dados.descricao); }
  if (dados.categoriaId !== undefined) { campos.push("categoria_id = ?"); valores.push(dados.categoriaId); }
  if (dados.data !== undefined) { campos.push("data = ?"); valores.push(dados.data); }
  if (dados.tipo !== undefined) { campos.push("tipo = ?"); valores.push(dados.tipo); }
  valores.push(id);
  await banco.runAsync(`UPDATE lancamentos SET ${campos.join(", ")} WHERE id = ?`, valores);
}

export async function excluirLancamento(banco: Banco, id: string): Promise<void> {
  await banco.runAsync("DELETE FROM lancamentos WHERE id = ?", [id]);
}

/** Resumo do mês: total de receitas, despesas e saldo do período */
export async function resumoMes(
  banco: Banco,
  ano: number,
  mes: number
): Promise<{ receitas: number; despesas: number; saldo: number }> {
  const de = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ate = `${ano}-${String(mes).padStart(2, "0")}-31`;
  const rows = await banco.getAllAsync<{ tipo: string; total: number }>(
    `SELECT tipo, COALESCE(SUM(valor_centavos), 0) AS total
     FROM lancamentos WHERE data BETWEEN ? AND ? GROUP BY tipo`,
    [de, ate]
  );
  const rec = rows.find((r) => r.tipo === "receita")?.total ?? 0;
  const desp = rows.find((r) => r.tipo === "despesa")?.total ?? 0;
  return { receitas: rec, despesas: Math.abs(desp), saldo: rec + desp };
}
