import type { Banco } from "../vault.js";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export type TipoAtivo = "acao" | "fii" | "etf" | "renda_fixa" | "cripto" | "outro";

export type Ativo = {
  id: string;
  ticker: string;
  nome: string;
  tipo: TipoAtivo;
  quantidade: number;
  precoMedioCentavos: number;
  moeda: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

type AtivoRow = {
  id: string;
  ticker: string;
  nome: string;
  tipo: string;
  quantidade: number;
  preco_medio_centavos: number;
  moeda: string;
  ativo: number;
  criado_em: string;
  atualizado_em: string;
};

function rowParaAtivo(r: AtivoRow): Ativo {
  return {
    id: r.id,
    ticker: r.ticker,
    nome: r.nome,
    tipo: r.tipo as TipoAtivo,
    quantidade: r.quantidade,
    precoMedioCentavos: r.preco_medio_centavos,
    moeda: r.moeda,
    ativo: r.ativo === 1,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  };
}

export async function listarAtivos(banco: Banco): Promise<Ativo[]> {
  const rows = await banco.getAllAsync<AtivoRow>(
    "SELECT * FROM ativos WHERE ativo = 1 ORDER BY ticker ASC"
  );
  return rows.map(rowParaAtivo);
}

export async function criarAtivo(
  banco: Banco,
  dados: Omit<Ativo, "id" | "ativo" | "criadoEm" | "atualizadoEm">
): Promise<Ativo> {
  const id = uuid();
  const agora = new Date().toISOString();
  await banco.runAsync(
    `INSERT INTO ativos (id, ticker, nome, tipo, quantidade, preco_medio_centavos, moeda, ativo, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, dados.ticker.toUpperCase(), dados.nome, dados.tipo, dados.quantidade, dados.precoMedioCentavos, dados.moeda, agora, agora]
  );
  return { ...dados, id, ticker: dados.ticker.toUpperCase(), ativo: true, criadoEm: agora, atualizadoEm: agora };
}

export async function atualizarAtivo(
  banco: Banco,
  id: string,
  dados: Partial<Pick<Ativo, "quantidade" | "precoMedioCentavos" | "nome">>
): Promise<void> {
  const campos: string[] = [];
  const params: (string | number)[] = [];
  if (dados.quantidade !== undefined) { campos.push("quantidade = ?"); params.push(dados.quantidade); }
  if (dados.precoMedioCentavos !== undefined) { campos.push("preco_medio_centavos = ?"); params.push(dados.precoMedioCentavos); }
  if (dados.nome !== undefined) { campos.push("nome = ?"); params.push(dados.nome); }
  if (campos.length === 0) return;
  campos.push("atualizado_em = ?");
  params.push(new Date().toISOString());
  params.push(id);
  await banco.runAsync(`UPDATE ativos SET ${campos.join(", ")} WHERE id = ?`, params);
}

export async function arquivarAtivo(banco: Banco, id: string): Promise<void> {
  await banco.runAsync(
    "UPDATE ativos SET ativo = 0, atualizado_em = ? WHERE id = ?",
    [new Date().toISOString(), id]
  );
}

export type ResumoCarteira = {
  totalInvestidoCentavos: number;
  ativos: (Ativo & { valorAtualCentavos: number; retornoCentavos: number; retornoPct: number })[];
};

export async function resumoCarteira(
  banco: Banco,
  precos: Record<string, number>
): Promise<ResumoCarteira> {
  const lista = await listarAtivos(banco);
  let total = 0;
  const ativos = lista.map((a) => {
    const precoAtualCentavos = precos[a.ticker] ?? a.precoMedioCentavos;
    const valorAtualCentavos = Math.round(a.quantidade * precoAtualCentavos);
    const custoTotal = Math.round(a.quantidade * a.precoMedioCentavos);
    const retornoCentavos = valorAtualCentavos - custoTotal;
    const retornoPct = custoTotal > 0 ? retornoCentavos / custoTotal : 0;
    total += valorAtualCentavos;
    return { ...a, valorAtualCentavos, retornoCentavos, retornoPct };
  });
  return { totalInvestidoCentavos: total, ativos };
}
