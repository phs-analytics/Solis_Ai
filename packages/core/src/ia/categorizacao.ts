/**
 * Sugestão de categoria por similaridade de texto.
 * Aprende com as correções do usuário salvas como pares (descricao → categoriaId).
 */

export type RegraCategoria = {
  padrao: string;   // texto normalizado que dispara a regra
  categoriaId: string;
};

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

const REGRAS_PADRAO: Omit<RegraCategoria, "categoriaId">[] & { categoriaHint: string }[] = [
  { padrao: "ifood", categoriaHint: "Alimentação" },
  { padrao: "uber eats", categoriaHint: "Alimentação" },
  { padrao: "mercado", categoriaHint: "Alimentação" },
  { padrao: "supermercado", categoriaHint: "Alimentação" },
  { padrao: "padaria", categoriaHint: "Alimentação" },
  { padrao: "restaurante", categoriaHint: "Alimentação" },
  { padrao: "uber", categoriaHint: "Transporte" },
  { padrao: "99pop", categoriaHint: "Transporte" },
  { padrao: "combustivel", categoriaHint: "Transporte" },
  { padrao: "gasolina", categoriaHint: "Transporte" },
  { padrao: "metro", categoriaHint: "Transporte" },
  { padrao: "onibus", categoriaHint: "Transporte" },
  { padrao: "aluguel", categoriaHint: "Moradia" },
  { padrao: "condominio", categoriaHint: "Moradia" },
  { padrao: "agua", categoriaHint: "Moradia" },
  { padrao: "luz", categoriaHint: "Moradia" },
  { padrao: "energia", categoriaHint: "Moradia" },
  { padrao: "internet", categoriaHint: "Moradia" },
  { padrao: "netflix", categoriaHint: "Lazer" },
  { padrao: "spotify", categoriaHint: "Lazer" },
  { padrao: "disney", categoriaHint: "Lazer" },
  { padrao: "cinema", categoriaHint: "Lazer" },
  { padrao: "farmacia", categoriaHint: "Saúde" },
  { padrao: "drogaria", categoriaHint: "Saúde" },
  { padrao: "medico", categoriaHint: "Saúde" },
  { padrao: "hospital", categoriaHint: "Saúde" },
  { padrao: "salario", categoriaHint: "Salário" },
  { padrao: "pagamento", categoriaHint: "Salário" },
  { padrao: "escola", categoriaHint: "Educação" },
  { padrao: "faculdade", categoriaHint: "Educação" },
  { padrao: "curso", categoriaHint: "Educação" },
  { padrao: "roupa", categoriaHint: "Vestuário" },
  { padrao: "calcado", categoriaHint: "Vestuário" },
  { padrao: "shopee", categoriaHint: "Outros" },
  { padrao: "amazon", categoriaHint: "Outros" },
];

/**
 * Sugere o nome da categoria padrão para uma descrição de lançamento.
 * Retorna null se não houver correspondência.
 */
export function sugerirCategoriaHint(descricao: string): string | null {
  const norm = normalizar(descricao);
  for (const r of REGRAS_PADRAO) {
    if (norm.includes(r.padrao)) return r.categoriaHint;
  }
  return null;
}

/**
 * Dado um conjunto de regras aprendidas (salvas pelo usuário) e uma descrição,
 * retorna o categoriaId mais provável ou null.
 */
export function sugerirCategoria(
  descricao: string,
  regrasAprendidas: RegraCategoria[]
): string | null {
  const norm = normalizar(descricao);

  // Regras aprendidas têm prioridade (match exato de prefixo)
  for (const r of regrasAprendidas) {
    if (norm.includes(r.padrao)) return r.categoriaId;
  }

  return null;
}

/**
 * Cria uma nova regra de categorização a partir de uma correção do usuário.
 * Extrai as primeiras palavras significativas da descrição como padrão.
 */
export function aprenderCorrecao(descricao: string, categoriaId: string): RegraCategoria {
  const norm = normalizar(descricao);
  // Usa as primeiras 2 palavras com 3+ letras como padrão
  const palavras = norm.split(/\s+/).filter((p) => p.length >= 3).slice(0, 2);
  return { padrao: palavras.join(" ") || norm.slice(0, 15), categoriaId };
}
