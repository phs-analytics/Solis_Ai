import type { Banco } from "../vault.js";

export type Meta = {
  id: string;
  nome: string;
  icone: string | null;
  cor: string | null;
  bancNome: string | null;
  descricao: string | null;
  alvoCentavos: number;
  atualCentavos: number;
  prazo: string | null;
  concluida: boolean;
  criadoEm: string;
  /** true quando o cofrinho vem sincronizado do banco: aí o saldo é do banco e não aceita guardar/retirar à mão. */
  doBanco: boolean;
};

export type MovimentoMeta = {
  id: string;
  metaId: string;
  valorCentavos: number;
  descricao: string | null;
  criadoEm: string;
};

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function agora(): string { return new Date().toISOString(); }

function mapear(r: Record<string, unknown>): Meta {
  return {
    id: r.id as string,
    nome: r.nome as string,
    icone: r.icone as string | null,
    cor: r.cor as string | null,
    bancNome: r.banco_nome as string | null,
    descricao: r.descricao as string | null,
    alvoCentavos: r.alvo_centavos as number,
    atualCentavos: r.atual_centavos as number,
    prazo: r.prazo as string | null,
    concluida: (r.concluida as number) === 1,
    criadoEm: r.criado_em as string,
    doBanco: r.externo_id != null,
  };
}

export async function listarMetas(banco: Banco, incluirConcluidas = false): Promise<Meta[]> {
  const sql = incluirConcluidas
    ? "SELECT * FROM metas ORDER BY concluida, criado_em"
    : "SELECT * FROM metas WHERE concluida = 0 ORDER BY criado_em";
  const rows = await banco.getAllAsync<Record<string, unknown>>(sql);
  return rows.map(mapear);
}

export async function buscarMeta(banco: Banco, id: string): Promise<Meta | null> {
  const r = await banco.getFirstAsync<Record<string, unknown>>("SELECT * FROM metas WHERE id = ?", [id]);
  return r ? mapear(r) : null;
}

export async function criarMeta(
  banco: Banco,
  dados: Pick<Meta, "nome" | "icone" | "cor" | "bancNome" | "descricao" | "alvoCentavos" | "prazo">
): Promise<Meta> {
  const meta: Meta = { id: uuid(), ...dados, atualCentavos: 0, concluida: false, criadoEm: agora(), doBanco: false };
  await banco.runAsync(
    "INSERT INTO metas (id, nome, icone, cor, banco_nome, descricao, alvo_centavos, atual_centavos, prazo, concluida, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?)",
    [meta.id, meta.nome, meta.icone, meta.cor, meta.bancNome, meta.descricao, meta.alvoCentavos, meta.prazo, meta.criadoEm]
  );
  return meta;
}

export async function depositar(banco: Banco, id: string, centavos: number, descricao?: string): Promise<void> {
  await banco.runAsync(
    `UPDATE metas SET atual_centavos = atual_centavos + ?,
     concluida = CASE WHEN atual_centavos + ? >= alvo_centavos THEN 1 ELSE 0 END
     WHERE id = ?`,
    [centavos, centavos, id]
  );
  await banco.runAsync(
    "INSERT INTO metas_movimentos (id, meta_id, valor_centavos, descricao, criado_em) VALUES (?, ?, ?, ?, ?)",
    [uuid(), id, centavos, descricao ?? "Depósito manual", agora()]
  );
}

export async function retirar(banco: Banco, id: string, centavos: number, descricao?: string): Promise<void> {
  await banco.runAsync(
    "UPDATE metas SET atual_centavos = MAX(0, atual_centavos - ?) WHERE id = ?",
    [centavos, id]
  );
  await banco.runAsync(
    "INSERT INTO metas_movimentos (id, meta_id, valor_centavos, descricao, criado_em) VALUES (?, ?, ?, ?, ?)",
    [uuid(), id, -centavos, descricao ?? "Retirada", agora()]
  );
}

export async function listarMovimentos(banco: Banco, metaId: string): Promise<MovimentoMeta[]> {
  const rows = await banco.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM metas_movimentos WHERE meta_id = ? ORDER BY criado_em DESC LIMIT 50",
    [metaId]
  );
  return rows.map((r) => ({
    id: r.id as string,
    metaId: r.meta_id as string,
    valorCentavos: r.valor_centavos as number,
    descricao: r.descricao as string | null,
    criadoEm: r.criado_em as string,
  }));
}

/** Histórico mensal: retorna a soma de depósitos de cada mês (último ano) para o gráfico de linha. */
export async function historicoMensal(banco: Banco, metaId: string): Promise<{ mes: string; total: number }[]> {
  const rows = await banco.getAllAsync<Record<string, unknown>>(
    `SELECT strftime('%Y-%m', criado_em) as mes, SUM(CASE WHEN valor_centavos > 0 THEN valor_centavos ELSE 0 END) as total
     FROM metas_movimentos WHERE meta_id = ? AND criado_em >= date('now', '-12 months')
     GROUP BY mes ORDER BY mes`,
    [metaId]
  );
  return rows.map((r) => ({ mes: r.mes as string, total: r.total as number }));
}

export async function excluirMeta(banco: Banco, id: string): Promise<void> {
  await banco.runAsync("DELETE FROM metas WHERE id = ?", [id]);
}
