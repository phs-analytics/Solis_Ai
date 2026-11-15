import type { Banco } from "../vault.js";
import { criarLancamento } from "./lancamentos.js";

export type Recorrente = {
  id: string;
  descricao: string;
  valorCentavos: number;
  tipo: "receita" | "despesa";
  categoriaId: string | null;
  contaId: string;
  diaMes: number;
  ativo: boolean;
  criadoEm: string;
};

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function agora(): string { return new Date().toISOString(); }

function mapear(r: Record<string, unknown>): Recorrente {
  return { id: r.id as string, descricao: r.descricao as string, valorCentavos: r.valor_centavos as number, tipo: r.tipo as "receita" | "despesa", categoriaId: r.categoria_id as string | null, contaId: r.conta_id as string, diaMes: r.dia_mes as number, ativo: (r.ativo as number) === 1, criadoEm: r.criado_em as string };
}

export async function listarRecorrentes(banco: Banco): Promise<Recorrente[]> {
  const rows = await banco.getAllAsync<Record<string, unknown>>("SELECT * FROM recorrentes WHERE ativo = 1 ORDER BY dia_mes");
  return rows.map(mapear);
}

export async function criarRecorrente(banco: Banco, dados: Omit<Recorrente, "id" | "ativo" | "criadoEm">): Promise<Recorrente> {
  const rec: Recorrente = { id: uuid(), ...dados, ativo: true, criadoEm: agora() };
  await banco.runAsync("INSERT INTO recorrentes (id, descricao, valor_centavos, tipo, categoria_id, conta_id, dia_mes, ativo, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
    [rec.id, rec.descricao, rec.valorCentavos, rec.tipo, rec.categoriaId, rec.contaId, rec.diaMes, rec.criadoEm]);
  return rec;
}

/** Lança os recorrentes do mês que ainda não foram lançados. Idempotente. */
export async function processarRecorrentesDoMes(banco: Banco, mes: number, ano: number): Promise<number> {
  const recorrentes = await listarRecorrentes(banco);
  const de = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ate = `${ano}-${String(mes).padStart(2, "0")}-31`;
  let criados = 0;

  for (const r of recorrentes) {
    const dia = String(r.diaMes).padStart(2, "0");
    const data = `${ano}-${String(mes).padStart(2, "0")}-${dia}`;
    const jaExiste = await banco.getAllAsync<{ c: number }>(
      "SELECT COUNT(*) AS c FROM lancamentos WHERE conta_id = ? AND descricao = ? AND data = ? AND recorrente = 1",
      [r.contaId, r.descricao, data]
    );
    if ((jaExiste[0]?.c ?? 0) > 0) continue;
    const valor = r.tipo === "despesa" ? -Math.abs(r.valorCentavos) : Math.abs(r.valorCentavos);
    await criarLancamento(banco, { contaId: r.contaId, valorCentavos: valor, descricao: r.descricao, categoriaId: r.categoriaId, data, tipo: r.tipo, recorrente: true });
    criados++;
  }
  return criados;
}

/** Previsão dos próximos 30 dias com base nos recorrentes ativos */
export async function previsaoProximos30(banco: Banco): Promise<{ data: string; descricao: string; valorCentavos: number }[]> {
  const recorrentes = await listarRecorrentes(banco);
  const hoje = new Date();
  const previsao: { data: string; descricao: string; valorCentavos: number }[] = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    const dia = d.getDate();
    for (const r of recorrentes) {
      if (r.diaMes === dia) {
        const data = d.toISOString().slice(0, 10);
        const valor = r.tipo === "despesa" ? -Math.abs(r.valorCentavos) : Math.abs(r.valorCentavos);
        previsao.push({ data, descricao: r.descricao, valorCentavos: valor });
      }
    }
  }
  return previsao.sort((a, b) => a.data.localeCompare(b.data));
}
