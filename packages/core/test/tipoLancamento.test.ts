import { describe, expect, it } from "vitest";
import { inicioPeriodo, tipoLancamento } from "../src/tipoLancamento.js";

describe("tipo de lançamento e período do calendário", () => {
  it("dá nome simples ao lançamento", () => {
    expect(tipoLancamento("PAGTO SALARIO EMPRESA", 300000)).toBe("Entrada de salário");
    expect(tipoLancamento("Pix enviado - Maria", -5000)).toBe("Pix enviado");
    expect(tipoLancamento("PIX RECEBIDO JOAO", 5000)).toBe("Pix recebido");
    expect(tipoLancamento("Pagamento fatura cartão", -90000)).toBe("Pagamento no cartão");
    expect(tipoLancamento("Padaria", -1200)).toBe("Saída");
  });
  it("semana começa no domingo e mês no dia 1", () => {
    expect(inicioPeriodo("2026-11-26", "semana")).toBe("2026-11-22");
    expect(inicioPeriodo("2026-11-26", "mes")).toBe("2026-11-01");
    expect(inicioPeriodo("2026-11-26", "hoje")).toBe("2026-11-26");
    expect(inicioPeriodo("2026-11-26", "6m")).toBe("2026-05-28");
  });
});
