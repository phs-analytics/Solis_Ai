import type { Banco } from "../vault.js";

export type TipoConta = "corrente" | "poupanca" | "dinheiro" | "outro";

export type Conta = {
  id: string;
  nome: string;
  tipo: TipoConta;
  saldoInicialCentavos: number;
  moeda: string;
  ativo: boolean;
  criadoEm: string;
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

function mapear(r: Record<string, unknown>): Conta {
  return {
    id: r.id as string,
    nome: r.nome as string,
    tipo: r.tipo as TipoConta,
    saldoInicialCentavos: r.saldo_inicial_centavos as number,
    moeda: r.moeda as string,
    ativo: (r.ativo as number) === 1,
    criadoEm: r.criado_em as string,
  };
}

export async function listarContas(banco: Banco): Promise<Conta[]> {
  const rows = await banco.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM contas WHERE ativo = 1 ORDER BY nome"
  );
  return rows.map(mapear);
}

export async function criarConta(
  banco: Banco,
  dados: Pick<Conta, "nome" | "tipo" | "saldoInicialCentavos" | "moeda">
): Promise<Conta> {
  const conta: Conta = {
    id: uuid(),
    nome: dados.nome,
    tipo: dados.tipo,
    saldoInicialCentavos: dados.saldoInicialCentavos,
    moeda: dados.moeda ?? "BRL",
    ativo: true,
    criadoEm: agora(),
  };
  await banco.runAsync(
    `INSERT INTO contas (id, nome, tipo, saldo_inicial_centavos, moeda, ativo, criado_em)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [conta.id, conta.nome, conta.tipo, conta.saldoInicialCentavos, conta.moeda, conta.criadoEm]
  );
  return conta;
}

export async function atualizarConta(
  banco: Banco,
  id: string,
  dados: Partial<Pick<Conta, "nome" | "tipo" | "saldoInicialCentavos">>
): Promise<void> {
  const campos: string[] = [];
  const valores: (string | number | null)[] = [];
  if (dados.nome !== undefined) { campos.push("nome = ?"); valores.push(dados.nome); }
  if (dados.tipo !== undefined) { campos.push("tipo = ?"); valores.push(dados.tipo); }
  if (dados.saldoInicialCentavos !== undefined) { campos.push("saldo_inicial_centavos = ?"); valores.push(dados.saldoInicialCentavos); }
  if (campos.length === 0) return;
  valores.push(id);
  await banco.runAsync(`UPDATE contas SET ${campos.join(", ")} WHERE id = ?`, valores);
}

export async function arquivarConta(banco: Banco, id: string): Promise<void> {
  await banco.runAsync("UPDATE contas SET ativo = 0 WHERE id = ?", [id]);
}

/** Saldo atual = saldo inicial + soma dos lançamentos da conta */
export async function saldoConta(banco: Banco, id: string): Promise<number> {
  const rows = await banco.getAllAsync<{ saldo_inicial_centavos: number }>(
    "SELECT saldo_inicial_centavos FROM contas WHERE id = ?", [id]
  );
  const inicial = rows[0]?.saldo_inicial_centavos ?? 0;
  const mov = await banco.getAllAsync<{ total: number }>(
    "SELECT COALESCE(SUM(valor_centavos), 0) AS total FROM lancamentos WHERE conta_id = ?", [id]
  );
  return inicial + (mov[0]?.total ?? 0);
}

/** Saldo total de todas as contas ativas */
export async function saldoTotal(banco: Banco): Promise<number> {
  const contas = await listarContas(banco);
  let total = 0;
  for (const c of contas) total += await saldoConta(banco, c.id);
  return total;
}
