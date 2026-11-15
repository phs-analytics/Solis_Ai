import type { Banco } from "../vault.js";

export type TipoCategoria = "receita" | "despesa" | "transferencia";

export type Categoria = {
  id: string;
  nome: string;
  icone: string | null;
  paiId: string | null;
  tipo: TipoCategoria;
};

const CATEGORIAS_PADRAO: Omit<Categoria, never>[] = [
  // Despesas
  { id: "cat_alimentacao",   nome: "Alimentação",    icone: "🍽️",  paiId: null, tipo: "despesa" },
  { id: "cat_transporte",    nome: "Transporte",     icone: "🚌",  paiId: null, tipo: "despesa" },
  { id: "cat_moradia",       nome: "Moradia",        icone: "🏠",  paiId: null, tipo: "despesa" },
  { id: "cat_saude",         nome: "Saúde",          icone: "💊",  paiId: null, tipo: "despesa" },
  { id: "cat_educacao",      nome: "Educação",       icone: "📚",  paiId: null, tipo: "despesa" },
  { id: "cat_lazer",         nome: "Lazer",          icone: "🎮",  paiId: null, tipo: "despesa" },
  { id: "cat_vestuario",     nome: "Vestuário",      icone: "👕",  paiId: null, tipo: "despesa" },
  { id: "cat_outros_desp",   nome: "Outros",         icone: "📦",  paiId: null, tipo: "despesa" },
  // Receitas
  { id: "cat_salario",       nome: "Salário",        icone: "💰",  paiId: null, tipo: "receita" },
  { id: "cat_freelance",     nome: "Freelance",      icone: "💻",  paiId: null, tipo: "receita" },
  { id: "cat_outros_rec",    nome: "Outras receitas",icone: "➕",  paiId: null, tipo: "receita" },
  // Transferência
  { id: "cat_transferencia", nome: "Transferência",  icone: "↔️",  paiId: null, tipo: "transferencia" },
];

function mapear(r: Record<string, unknown>): Categoria {
  return {
    id: r.id as string,
    nome: r.nome as string,
    icone: r.icone as string | null,
    paiId: r.pai_id as string | null,
    tipo: r.tipo as TipoCategoria,
  };
}

/** Garante que as categorias padrão existem (idempotente). */
export async function garantirCategoriasPadrao(banco: Banco): Promise<void> {
  for (const c of CATEGORIAS_PADRAO) {
    await banco.runAsync(
      `INSERT OR IGNORE INTO categorias (id, nome, icone, pai_id, tipo) VALUES (?, ?, ?, ?, ?)`,
      [c.id, c.nome, c.icone, c.paiId, c.tipo]
    );
  }
}

export async function listarCategorias(
  banco: Banco,
  tipo?: TipoCategoria
): Promise<Categoria[]> {
  if (tipo) {
    const rows = await banco.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM categorias WHERE tipo = ? ORDER BY nome", [tipo]
    );
    return rows.map(mapear);
  }
  const rows = await banco.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM categorias ORDER BY tipo, nome"
  );
  return rows.map(mapear);
}

export async function criarCategoria(
  banco: Banco,
  dados: Omit<Categoria, "id">
): Promise<Categoria> {
  const id = `cat_custom_${Date.now()}`;
  await banco.runAsync(
    `INSERT INTO categorias (id, nome, icone, pai_id, tipo) VALUES (?, ?, ?, ?, ?)`,
    [id, dados.nome, dados.icone, dados.paiId, dados.tipo]
  );
  return { id, ...dados };
}
