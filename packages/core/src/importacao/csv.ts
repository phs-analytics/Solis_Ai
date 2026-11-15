/**
 * Parser CSV genérico para extratos bancários.
 * Detecta automaticamente separador (vírgula ou ponto-e-vírgula) e colunas
 * de data, valor e descrição por heurística de cabeçalho.
 */

export type LancamentoCSV = {
  data: string;         // AAAA-MM-DD (melhor esforço)
  valorCentavos: number;
  descricao: string;
  linhaOriginal: number;
};

export type ResultadoCSV = {
  lancamentos: LancamentoCSV[];
  avisos: string[];
};

function detectarSeparador(linha: string): "," | ";" {
  return (linha.match(/;/g) ?? []).length >= (linha.match(/,/g) ?? []).length ? ";" : ",";
}

function parseLinha(linha: string, sep: string): string[] {
  // Suporte básico a campos entre aspas
  const cells: string[] = [];
  let atual = "";
  let dentroAspas = false;
  for (const ch of linha) {
    if (ch === '"') { dentroAspas = !dentroAspas; continue; }
    if (ch === sep && !dentroAspas) { cells.push(atual.trim()); atual = ""; continue; }
    atual += ch;
  }
  cells.push(atual.trim());
  return cells;
}

/** Tenta normalizar data para AAAA-MM-DD. Aceita DD/MM/AAAA, AAAA-MM-DD, D/M/AAAA. */
function normalizarData(s: string): string | null {
  s = s.trim();
  // AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/AAAA ou D/M/AAAA
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
}

/** Tenta extrair centavos de string monetária brasileira ou internacional. */
function normalizarValor(s: string): number | null {
  // Remove símbolos e espaços
  let limpo = s.replace(/[R$\s]/g, "");
  // Formato pt-BR: 1.234,56
  if (/^\-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(limpo)) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    // Formato en: 1,234.56
    limpo = limpo.replace(/,/g, "");
  }
  const v = parseFloat(limpo);
  if (isNaN(v)) return null;
  return Math.round(v * 100);
}

const NOMES_DATA = ["data", "date", "dt", "data lançamento", "data lanc", "data mov"];
const NOMES_VALOR = ["valor", "value", "amount", "quantia", "vlr", "montante", "débito", "crédito"];
const NOMES_DESC = ["descrição", "descricao", "description", "historico", "histórico", "memo", "nome", "estabelecimento"];

function detectarColunas(cabecalho: string[]): { dataIdx: number; valorIdx: number; descIdx: number } | null {
  const lower = cabecalho.map((c) => c.toLowerCase().trim());
  const dataIdx = lower.findIndex((c) => NOMES_DATA.some((n) => c.includes(n)));
  const valorIdx = lower.findIndex((c) => NOMES_VALOR.some((n) => c.includes(n)));
  const descIdx = lower.findIndex((c) => NOMES_DESC.some((n) => c.includes(n)));
  if (dataIdx === -1 || valorIdx === -1) return null;
  return { dataIdx, valorIdx, descIdx: descIdx === -1 ? 0 : descIdx };
}

export function parseCSV(conteudo: string): ResultadoCSV {
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return { lancamentos: [], avisos: ["Arquivo CSV vazio ou com apenas cabeçalho"] };

  const sep = detectarSeparador(linhas[0]!);
  const cabecalho = parseLinha(linhas[0]!, sep);
  const cols = detectarColunas(cabecalho);
  const avisos: string[] = [];

  if (!cols) {
    avisos.push("Não foi possível detectar colunas de data e valor. Verifique o formato do CSV.");
    return { lancamentos: [], avisos };
  }

  const lancamentos: LancamentoCSV[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cells = parseLinha(linhas[i]!, sep);
    if (cells.length < 2) continue;

    const dataRaw = cells[cols.dataIdx] ?? "";
    const valorRaw = cells[cols.valorIdx] ?? "";
    const descRaw = cells[cols.descIdx] ?? "";

    const data = normalizarData(dataRaw);
    const valorCentavos = normalizarValor(valorRaw);

    if (!data) { avisos.push(`Linha ${i + 1}: data inválida "${dataRaw}"`); continue; }
    if (valorCentavos === null) { avisos.push(`Linha ${i + 1}: valor inválido "${valorRaw}"`); continue; }

    lancamentos.push({ data, valorCentavos, descricao: descRaw, linhaOriginal: i + 1 });
  }

  return { lancamentos, avisos };
}
