/**
 * Parser OFX/QFX (SGML subset).
 * Suporta o formato OFX 1.x (sem XML) usado pelos bancos brasileiros.
 */

export type LancamentoOFX = {
  id: string;
  tipo: "CREDIT" | "DEBIT" | "INT" | "DIV" | "FEE" | "SRVCHG" | "DEP" | "ATM" | "POS" | "XFER" | "CHECK" | "PAYMENT" | "CASH" | "DIRECTDEP" | "DIRECTDEBIT" | "REPEATPMT" | "OTHER";
  data: string;      // AAAA-MM-DD
  valorCentavos: number;
  descricao: string;
  memo: string;
  checkNum: string | null;
};

export type ResultadoOFX = {
  contaNome: string | null;
  moeda: string;
  lancamentos: LancamentoOFX[];
};

/** Extrai o valor de uma tag SGML: <TAG>valor */
function tag(texto: string, nome: string): string | null {
  const m = new RegExp(`<${nome}>([^<\r\n]+)`, "i").exec(texto);
  return m ? m[1]!.trim() : null;
}

/** Converte data OFX (AAAAMMDD ou AAAAMMDDHHMMSS) para AAAA-MM-DD */
function converterData(d: string): string {
  const s = d.slice(0, 8);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** Converte valor OFX (ex: "-1234.56") para centavos */
function converterValor(v: string): number {
  return Math.round(parseFloat(v.replace(",", ".")) * 100);
}

export function parseOFX(conteudo: string): ResultadoOFX {
  const contaNome = tag(conteudo, "ACCTID");
  const moeda = tag(conteudo, "CURDEF") ?? "BRL";

  // Extrai blocos <STMTTRN>...</STMTTRN>
  const blocos: LancamentoOFX[] = [];
  const reBloco = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;

  while ((m = reBloco.exec(conteudo)) !== null) {
    const bloco = m[1]!;
    const trntype = (tag(bloco, "TRNTYPE") ?? "OTHER") as LancamentoOFX["tipo"];
    const dtposted = tag(bloco, "DTPOSTED") ?? "";
    const trnamt = tag(bloco, "TRNAMT") ?? "0";
    const fitid = tag(bloco, "FITID") ?? String(Date.now());
    const name = tag(bloco, "NAME") ?? "";
    const memo = tag(bloco, "MEMO") ?? "";
    const checknum = tag(bloco, "CHECKNUM");

    blocos.push({
      id: fitid,
      tipo: trntype,
      data: converterData(dtposted),
      valorCentavos: converterValor(trnamt),
      descricao: name || memo,
      memo,
      checkNum: checknum,
    });
  }

  return { contaNome, moeda, lancamentos: blocos };
}
