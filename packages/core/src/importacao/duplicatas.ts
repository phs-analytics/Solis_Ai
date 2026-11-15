/**
 * Detecção de lançamentos duplicados na importação.
 * Hash = data + valorCentavos + primeiros 30 chars da descrição (normalizada).
 */

export type CandidatoDuplicata = {
  hash: string;
  data: string;
  valorCentavos: number;
  descricao: string;
};

function normalizar(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 30);
}

export function hashLancamento(data: string, valorCentavos: number, descricao: string): string {
  return `${data}|${valorCentavos}|${normalizar(descricao)}`;
}

/**
 * Filtra candidatos removendo os que já existem no conjunto de hashes existentes.
 * Retorna: { novos, duplicados }.
 */
export function filtrarDuplicatas<T extends CandidatoDuplicata>(
  candidatos: T[],
  existentes: Set<string>
): { novos: T[]; duplicados: T[] } {
  const novos: T[] = [];
  const duplicados: T[] = [];
  const vistos = new Set<string>(existentes);

  for (const c of candidatos) {
    if (vistos.has(c.hash)) {
      duplicados.push(c);
    } else {
      vistos.add(c.hash);
      novos.push(c);
    }
  }
  return { novos, duplicados };
}
