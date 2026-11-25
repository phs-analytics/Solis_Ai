import type { Banco } from "../vault.js";

export type Meta = {
  id: string;
  nome: string;
  icone: string | null;
  alvoCentavos: number;
  atualCentavos: number;
  prazo: string | null;
  concluida: boolean;
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
  return { id: r.id as string, nome: r.nome as string, icone: r.icone as string | null, alvoCentavos: r.alvo_centavos as number, atualCentavos: r.atual_centavos as number, prazo: r.prazo as string | null, concluida: (r.concluida as number) === 1, criadoEm: r.criado_em as string };
}

export async function listarMetas(banco: Banco, incluirConcluidas = false): Promise<Meta[]> {
  const sql = incluirConcluidas
    ? "SELECT * FROM metas ORDER BY concluida, criado_em"
    : "SELECT * FROM metas WHERE concluida = 0 ORDER BY criado_em";
  const rows = await banco.getAllAsync<Record<string, unknown>>(sql);
  return rows.map(mapear);
}

export async function criarMeta(banco: Banco, dados: Pick<Meta, "nome" | "icone" | "alvoCentavos" | "prazo">): Promise<Meta> {
  const meta: Meta = { id: uuid(), ...dados, atualCentavos: 0, concluida: false, criadoEm: agora() };
  await banco.runAsync("INSERT INTO metas (id, nome, icone, alvo_centavos, atual_centavos, prazo, concluida, criado_em) VALUES (?, ?, ?, ?, 0, ?, 0, ?)",
    [meta.id, meta.nome, meta.icone, meta.alvoCentavos, meta.prazo, meta.criadoEm]);
  return meta;
}

export async function depositar(banco: Banco, id: string, centavos: number): Promise<void> {
  await banco.runAsync(
    `UPDATE metas SET atual_centavos = atual_centavos + ?,
     concluida = CASE WHEN atual_centavos + ? >= alvo_centavos THEN 1 ELSE 0 END
     WHERE id = ?`,
    [centavos, centavos, id]
  );
  await banco.runAsync("INSERT INTO metas_movimentos (id, meta_id, valor_centavos, criado_em) VALUES (?, ?, ?, ?)", [uuid(), id, centavos, agora()]);
}

export async function excluirMeta(banco: Banco, id: string): Promise<void> {
  await banco.runAsync("DELETE FROM metas WHERE id = ?", [id]);
}
