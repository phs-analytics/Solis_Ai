import type { Banco } from "../vault.js";

export type Cartao = {
  id: string;
  nome: string;
  limiteCentavos: number;
  diaVencimento: number;
  diaFechamento: number;
  ativo: boolean;
  criadoEm: string;
};

export type Fatura = {
  id: string;
  cartaoId: string;
  mes: number;
  ano: number;
  pago: boolean;
  pagoEm: string | null;
};

export type LancamentoCartao = {
  id: string;
  faturaId: string;
  descricao: string;
  valorCentavos: number;
  data: string;
  categoriaId: string | null;
  parcelaAtual: number | null;
  parcelasTotal: number | null;
};

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function agora(): string { return new Date().toISOString(); }

function mapCartao(r: Record<string, unknown>): Cartao {
  return { id: r.id as string, nome: r.nome as string, limiteCentavos: r.limite_centavos as number, diaVencimento: r.dia_vencimento as number, diaFechamento: r.dia_fechamento as number, ativo: (r.ativo as number) === 1, criadoEm: r.criado_em as string };
}

function mapFatura(r: Record<string, unknown>): Fatura {
  return { id: r.id as string, cartaoId: r.cartao_id as string, mes: r.mes as number, ano: r.ano as number, pago: (r.pago as number) === 1, pagoEm: r.pago_em as string | null };
}

function mapLanc(r: Record<string, unknown>): LancamentoCartao {
  return { id: r.id as string, faturaId: r.fatura_id as string, descricao: r.descricao as string, valorCentavos: r.valor_centavos as number, data: r.data as string, categoriaId: r.categoria_id as string | null, parcelaAtual: r.parcela_atual as number | null, parcelasTotal: r.parcelas_total as number | null };
}

export async function listarCartoes(banco: Banco): Promise<Cartao[]> {
  const rows = await banco.getAllAsync<Record<string, unknown>>("SELECT * FROM cartoes WHERE ativo = 1 ORDER BY nome");
  return rows.map(mapCartao);
}

export async function criarCartao(banco: Banco, dados: Omit<Cartao, "id" | "ativo" | "criadoEm">): Promise<Cartao> {
  const cartao: Cartao = { id: uuid(), ...dados, ativo: true, criadoEm: agora() };
  await banco.runAsync("INSERT INTO cartoes (id, nome, limite_centavos, dia_vencimento, dia_fechamento, ativo, criado_em) VALUES (?, ?, ?, ?, ?, 1, ?)",
    [cartao.id, cartao.nome, cartao.limiteCentavos, cartao.diaVencimento, cartao.diaFechamento, cartao.criadoEm]);
  return cartao;
}

export async function obterOuCriarFatura(banco: Banco, cartaoId: string, mes: number, ano: number): Promise<Fatura> {
  const rows = await banco.getAllAsync<Record<string, unknown>>("SELECT * FROM faturas WHERE cartao_id = ? AND mes = ? AND ano = ?", [cartaoId, mes, ano]);
  if (rows[0]) return mapFatura(rows[0]);
  const fatura: Fatura = { id: uuid(), cartaoId, mes, ano, pago: false, pagoEm: null };
  await banco.runAsync("INSERT INTO faturas (id, cartao_id, mes, ano, pago, pago_em) VALUES (?, ?, ?, ?, 0, NULL)", [fatura.id, fatura.cartaoId, fatura.mes, fatura.ano]);
  return fatura;
}

export async function adicionarLancamentoCartao(banco: Banco, dados: Omit<LancamentoCartao, "id">): Promise<LancamentoCartao> {
  const l: LancamentoCartao = { id: uuid(), ...dados };
  await banco.runAsync("INSERT INTO lancamentos_cartao (id, fatura_id, descricao, valor_centavos, data, categoria_id, parcela_atual, parcelas_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [l.id, l.faturaId, l.descricao, l.valorCentavos, l.data, l.categoriaId, l.parcelaAtual, l.parcelasTotal]);
  return l;
}

export async function listarLancamentosCartao(banco: Banco, faturaId: string): Promise<LancamentoCartao[]> {
  const rows = await banco.getAllAsync<Record<string, unknown>>("SELECT * FROM lancamentos_cartao WHERE fatura_id = ? ORDER BY data DESC", [faturaId]);
  return rows.map(mapLanc);
}

export async function totalFatura(banco: Banco, faturaId: string): Promise<number> {
  const rows = await banco.getAllAsync<{ total: number }>("SELECT COALESCE(SUM(valor_centavos), 0) AS total FROM lancamentos_cartao WHERE fatura_id = ?", [faturaId]);
  return rows[0]?.total ?? 0;
}

export async function marcarFaturaPaga(banco: Banco, faturaId: string): Promise<void> {
  await banco.runAsync("UPDATE faturas SET pago = 1, pago_em = ? WHERE id = ?", [agora(), faturaId]);
}
