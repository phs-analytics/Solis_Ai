/** Rótulo simples do tipo de lançamento de banco (ex.: "Pix enviado"), a partir da descrição e do sinal. */
export function tipoLancamento(descricao: string, centavos: number): string {
  const d = descricao.toLowerCase(), entra = centavos > 0;
  if (/sal[aá]rio|folha|pagto sal|proventos/.test(d)) return entra ? "Entrada de salário" : "Salário";
  if (/\bpix\b/.test(d)) return entra ? "Pix recebido" : "Pix enviado";
  if (/boleto/.test(d)) return "Boleto pago";
  if (/d[eé]b(ito)?\.? ?aut/.test(d)) return "Débito automático";
  if (/fatura|cart[aã]o de cr[eé]dito|pagamento cart/.test(d)) return "Pagamento no cartão";
  if (/\b(ted|doc|transf)/.test(d)) return entra ? "Transferência recebida" : "Transferência enviada";
  if (/rendimento|juros|dividendo/.test(d)) return "Rendimento";
  if (/saque/.test(d)) return "Saque";
  if (/d[eé]bito|compra/.test(d)) return "Cartão de débito";
  return entra ? "Entrada" : "Saída";
}

/** Primeiro dia (AAAA-MM-DD) do período do calendário: semana desde domingo, mês desde o dia 1, ou N dias atrás. */
export function inicioPeriodo(hoje: string, periodo: "hoje" | "semana" | "mes" | "6m"): string {
  const d = new Date(hoje + "T12:00:00");
  if (periodo === "semana") d.setDate(d.getDate() - d.getDay());
  else if (periodo === "mes") d.setDate(1);
  else if (periodo === "6m") d.setDate(d.getDate() - 182);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
