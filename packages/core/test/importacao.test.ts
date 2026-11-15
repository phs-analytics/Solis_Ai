import { describe, it, expect } from "vitest";
import { parseOFX } from "../src/importacao/ofx.js";
import { parseCSV } from "../src/importacao/csv.js";
import { hashLancamento, filtrarDuplicatas } from "../src/importacao/duplicatas.js";

const OFX_SAMPLE = `
OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL</CURDEF>
<ACCTID>12345-6</ACCTID>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20261101</DTPOSTED>
<TRNAMT>-150.00</TRNAMT>
<FITID>001</FITID>
<NAME>Mercado Extra</NAME>
<MEMO>Compra no débito</MEMO>
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>20261105</DTPOSTED>
<TRNAMT>3200.00</TRNAMT>
<FITID>002</FITID>
<NAME>Salário</NAME>
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const CSV_SAMPLE = `Data;Histórico;Valor
01/11/2026;Mercado Extra;-150,00
05/11/2026;Salário;3200,00
10/11/2026;Uber;-25,50`;

describe("parseOFX", () => {
  it("extrai lançamentos e metadados", () => {
    const r = parseOFX(OFX_SAMPLE);
    expect(r.moeda).toBe("BRL");
    expect(r.contaNome).toBe("12345-6");
    expect(r.lancamentos).toHaveLength(2);
    expect(r.lancamentos[0]!.valorCentavos).toBe(-15000);
    expect(r.lancamentos[0]!.data).toBe("2026-11-01");
    expect(r.lancamentos[1]!.valorCentavos).toBe(320000);
    expect(r.lancamentos[1]!.tipo).toBe("CREDIT");
  });
});

describe("parseCSV", () => {
  it("extrai lançamentos com separador ;", () => {
    const r = parseCSV(CSV_SAMPLE);
    expect(r.avisos).toHaveLength(0);
    expect(r.lancamentos).toHaveLength(3);
    expect(r.lancamentos[0]!.valorCentavos).toBe(-15000);
    expect(r.lancamentos[0]!.data).toBe("2026-11-01");
    expect(r.lancamentos[2]!.valorCentavos).toBe(-2550);
  });

  it("retorna aviso para arquivo vazio", () => {
    const r = parseCSV("cabecalho\n");
    expect(r.avisos.length).toBeGreaterThan(0);
  });
});

describe("filtrarDuplicatas", () => {
  it("separa novos de duplicados", () => {
    const hash1 = hashLancamento("2026-11-01", -15000, "Mercado");
    const existentes = new Set([hash1]);
    const candidatos = [
      { hash: hash1, data: "2026-11-01", valorCentavos: -15000, descricao: "Mercado" },
      { hash: hashLancamento("2026-11-05", 320000, "Salário"), data: "2026-11-05", valorCentavos: 320000, descricao: "Salário" },
    ];
    const { novos, duplicados } = filtrarDuplicatas(candidatos, existentes);
    expect(novos).toHaveLength(1);
    expect(duplicados).toHaveLength(1);
    expect(novos[0]!.descricao).toBe("Salário");
  });
});
