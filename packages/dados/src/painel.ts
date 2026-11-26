import { analisarSemana, type AnaliseSemana } from "@solis/core";
import type { Banco } from "./vault.js";
import { listarContas, saldoConta } from "./repositorios/contas.js";
import type { TipoConta } from "./repositorios/contas.js";
import { listarMetas } from "./repositorios/metas.js";
import { listarCartoes } from "./repositorios/cartoes.js";
import { hojeLocal } from "./home.js";

const DIA_MS = 86_400_000;
const CHAVE_RELATORIO = "solis_relatorio_semana";
const CHAVE_MEMORIA = "solis_memoria_em";

export type Mov24 = { id: string; quando: string; descricao: string; centavos: number; categoriaId: string | null };
export type PainelConta = { id: string; nome: string; tipo: TipoConta; saldoCentavos: number; mov24: Mov24[] };
export type PainelCofrinhos = {
  totalCentavos: number;
  metas: { id: string; nome: string; atualCentavos: number; alvoCentavos: number }[];
  mov24: (Mov24 & { meta: string })[];
};
export type MovCartao = { id: string; dia: "hoje" | "ontem"; descricao: string; centavos: number; parcela: string | null; pagamento: boolean };
export type PainelCartao = { id: string; nome: string; limiteCentavos: number; diaFechamento: number; faturaCentavos: number; mov: MovCartao[] };
export type Painel = { contas: PainelConta[]; cofrinhos: PainelCofrinhos | null; cartoes: PainelCartao[] };

/** O que os pop-outs de contas, cofrinhos e cartões mostram: últimas 24 h, lido só do banco local. */
export async function montarPainel(banco: Banco, agora = new Date()): Promise<Painel> {
  const desde = new Date(agora.getTime() - DIA_MS).toISOString();
  const hoje = hojeLocal(agora), ontem = hojeLocal(new Date(agora.getTime() - DIA_MS));
  const [contas, metas, cartoes, lanc, movMetas] = await Promise.all([
    listarContas(banco),
    listarMetas(banco),
    listarCartoes(banco),
    // shortcut: "últimas 24 h" usa o momento em que o lançamento entrou no Solis (para o Pluggy, a hora da sincronização).
    banco.getAllAsync<Record<string, unknown>>(
      "SELECT id, conta_id, descricao, valor_centavos, categoria_id, criado_em FROM lancamentos WHERE criado_em >= ? ORDER BY criado_em DESC", [desde]),
    banco.getAllAsync<Record<string, unknown>>(
      "SELECT mm.id, mm.valor_centavos, mm.criado_em, m.nome FROM metas_movimentos mm JOIN metas m ON m.id = mm.meta_id WHERE mm.criado_em >= ? ORDER BY mm.criado_em DESC", [desde]),
  ]);
  const saldos = await Promise.all(contas.map((c) => saldoConta(banco, c.id)));
  const mov = (r: Record<string, unknown>): Mov24 => ({
    id: r.id as string, quando: r.criado_em as string, descricao: (r.descricao as string) || "Sem descrição",
    centavos: r.valor_centavos as number, categoriaId: (r.categoria_id as string | null) ?? null,
  });

  const [ano, mes] = [agora.getFullYear(), agora.getMonth() + 1];
  const painelCartoes = await Promise.all(cartoes.map(async (ct): Promise<PainelCartao> => {
    const [fat] = await banco.getAllAsync<{ total: number | null }>(
      "SELECT SUM(l.valor_centavos) AS total FROM lancamentos_cartao l JOIN faturas f ON f.id = l.fatura_id WHERE f.cartao_id = ? AND f.mes = ? AND f.ano = ?", [ct.id, mes, ano]);
    const compras = await banco.getAllAsync<Record<string, unknown>>(
      "SELECT l.* FROM lancamentos_cartao l JOIN faturas f ON f.id = l.fatura_id WHERE f.cartao_id = ? AND l.data >= ? ORDER BY l.data DESC", [ct.id, ontem]);
    const pagas = await banco.getAllAsync<Record<string, unknown>>(
      `SELECT f.id, f.pago_em, (SELECT SUM(valor_centavos) FROM lancamentos_cartao WHERE fatura_id = f.id) AS total
       FROM faturas f WHERE f.cartao_id = ? AND f.pago = 1 AND f.pago_em >= ?`, [ct.id, desde]);
    return {
      id: ct.id, nome: ct.nome, limiteCentavos: ct.limiteCentavos, diaFechamento: ct.diaFechamento, faturaCentavos: fat?.total ?? 0,
      mov: [
        ...pagas.map((p) => ({ id: `pg-${p.id as string}`, dia: "hoje" as const, descricao: "Pagamento da fatura", centavos: (p.total as number | null) ?? 0, parcela: null, pagamento: true })),
        ...compras.map((r) => ({
          id: r.id as string, dia: (r.data as string) >= hoje ? "hoje" as const : "ontem" as const, descricao: (r.descricao as string) || "Compra",
          centavos: -Math.abs(r.valor_centavos as number), pagamento: false,
          parcela: r.parcelas_total && (r.parcelas_total as number) > 1 ? `${r.parcela_atual as number}/${r.parcelas_total as number}` : null,
        })),
      ],
    };
  }));

  return {
    contas: contas.map((c, i) => ({ id: c.id, nome: c.nome, tipo: c.tipo, saldoCentavos: saldos[i]!, mov24: lanc.filter((l) => l.conta_id === c.id).map(mov) })),
    cofrinhos: metas.length ? {
      totalCentavos: metas.reduce((s, m) => s + m.atualCentavos, 0),
      metas: metas.map((m) => ({ id: m.id, nome: m.nome, atualCentavos: m.atualCentavos, alvoCentavos: m.alvoCentavos })),
      mov24: movMetas.map((r) => ({ ...mov({ ...r, descricao: (r.valor_centavos as number) >= 0 ? "Guardado" : "Retirada" }), meta: r.nome as string })),
    } : null,
    cartoes: painelCartoes,
  };
}

/** Gera a análise dos últimos 7 dias e guarda como o último relatório do Solis AI (dentro do cofre cifrado). */
export async function gerarRelatorioSemana(banco: Banco, agora = new Date()): Promise<AnaliseSemana> {
  const hoje = hojeLocal(agora);
  const de = hojeLocal(new Date(agora.getTime() - 14 * DIA_MS));
  const [movs, metas] = await Promise.all([
    banco.getAllAsync<Record<string, unknown>>(
      `SELECT l.data, l.valor_centavos, l.tipo, COALESCE(c.nome, 'Sem categoria') AS categoria
       FROM lancamentos l LEFT JOIN categorias c ON c.id = l.categoria_id WHERE l.data >= ? AND l.data <= ?`, [de, hoje]),
    listarMetas(banco),
  ]);
  const r = analisarSemana(
    movs.map((m) => ({ data: m.data as string, centavos: m.valor_centavos as number, categoria: m.categoria as string, tipo: m.tipo as "receita" | "despesa" | "transferencia" })),
    metas, hoje, agora);
  await banco.runAsync("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [CHAVE_RELATORIO, JSON.stringify(r)]);
  return r;
}

export async function lerUltimoRelatorio(banco: Banco): Promise<AnaliseSemana | null> {
  const [row] = await banco.getAllAsync<{ valor: string }>("SELECT valor FROM configuracoes WHERE chave = ?", [CHAVE_RELATORIO]);
  return row ? (JSON.parse(row.valor) as AnaliseSemana) : null;
}

/** "Memória" do Solis AI: refaz a análise com os dados atuais e marca quando foi. Nada sai do aparelho. */
export async function atualizarMemoriaSolis(banco: Banco, agora = new Date()): Promise<void> {
  await gerarRelatorioSemana(banco, agora);
  await banco.runAsync("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [CHAVE_MEMORIA, agora.toISOString()]);
}

/** Lançamentos de uma conta desde `desde` (AAAA-MM-DD, pela data do lançamento), mais novos primeiro. */
export async function listarMovsConta(banco: Banco, contaId: string, desde: string): Promise<Mov24[]> {
  const rows = await banco.getAllAsync<Record<string, unknown>>(
    "SELECT id, descricao, valor_centavos, categoria_id, data FROM lancamentos WHERE conta_id = ? AND data >= ? ORDER BY data DESC, criado_em DESC LIMIT 300",
    [contaId, desde]);
  return rows.map((r) => ({
    id: r.id as string, quando: r.data as string, descricao: (r.descricao as string) || "Sem descrição",
    centavos: r.valor_centavos as number, categoriaId: (r.categoria_id as string | null) ?? null,
  }));
}
