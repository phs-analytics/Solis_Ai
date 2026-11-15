/** Formata centavos para string BRL. Ex: 150050 → "R$ 1.500,50" */
export function formatarDinheiro(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Converte string "1.500,50" para centavos. Retorna null se inválido. */
export function parseDinheiro(texto: string): number | null {
  const limpo = texto.replace(/\./g, "").replace(",", ".");
  const valor = parseFloat(limpo);
  if (isNaN(valor)) return null;
  return Math.round(valor * 100);
}
