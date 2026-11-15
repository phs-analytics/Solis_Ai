import type { Banco } from "../vault.js";

export type Orcamento = {
  id: string;
  categoriaId: string;
  limiteCentavos: number;
  mes: number;
  ano: number;
};

export type ResumoOrcamento = Orcamento & {
  gastosCentavos: number;
  restanteCentavos: number;
  podeGastarHoje: number;
};

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function mapear(r: Record<string, unknown>): Orcamento {
  return { id: r.id as string, categoriaId: r.categoria_id as string, limiteCentavos: r.limite_centavos as number, mes: r.mes as number, ano: r.ano as number };
}

export async function definirOrcamento(banco: Banco, dados: Omit<Orcamento, "id">): Promise<Orcamento> {
  const rows = await banco.getAllAsync<Record<string, unknown>>("SELECT id FROM orcamentos WHERE categoria_id = ? AND mes = ? AND ano = ?", [dados.categoriaId, dados.mes, dados.ano]);
  if (rows[0]) {
    await banco.runAsync("UPDATE orcamentos SET limite_centavos = ? WHERE id = ?", [dados.limiteCentavos, rows[0].id as string]);
    return { id: rows[0].id as string, ...dados };
  }
  const id = uuid();
  await banco.runAsync("INSERT INTO orcamentos (id, categoria_id, limite_centavos, mes, ano) VALUES (?, ?, ?, ?, ?)", [id, dados.categoriaId, dados.limiteCentavos, dados.mes, dados.ano]);
  return { id, ...dados };
}

export async function resumoOrcamentos(banco: Banco, mes: number, ano: number): Promise<ResumoOrcamento[]> {
  const orc = await banco.getAllAsync<Record<string, unknown>>("SELECT * FROM orcamentos WHERE mes = ? AND ano = ?", [mes, ano]);
  const hoje = new Date();
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const diaAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano ? hoje.getDate() : diasNoMes;
  const diasRestantes = Math.max(1, diasNoMes - diaAtual + 1);

  const result: ResumoOrcamento[] = [];
  for (const o of orc) {
    const orcamento = mapear(o);
    const de = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const ate = `${ano}-${String(mes).padStart(2, "0")}-31`;
    const gastos = await banco.getAllAsync<{ total: number }>(
      "SELECT COALESCE(SUM(ABS(valor_centavos)), 0) AS total FROM lancamentos WHERE categoria_id = ? AND tipo = 'despesa' AND data BETWEEN ? AND ?",
      [orcamento.categoriaId, de, ate]
    );
    const gastosCentavos = gastos[0]?.total ?? 0;
    const restanteCentavos = Math.max(0, orcamento.limiteCentavos - gastosCentavos);
    result.push({ ...orcamento, gastosCentavos, restanteCentavos, podeGastarHoje: Math.floor(restanteCentavos / diasRestantes) });
  }
  return result;
}
