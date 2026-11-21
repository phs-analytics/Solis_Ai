import { describe, it, expect } from "vitest";
import { classificarInvestidor, calcularIdade } from "../src/perfil.js";

describe("perfil", () => {
  it("classifica o investidor", () => {
    expect(classificarInvestidor({ reacaoQueda: "vendo_tudo", experiencia: ["acoes"], objetivoFinanceiro: "longo_prazo" })).toBe("conservador");
    expect(classificarInvestidor({ reacaoQueda: "espero", experiencia: ["poupanca"], objetivoFinanceiro: "reserva" })).toBe("conservador");
    expect(classificarInvestidor({ reacaoQueda: "espero", experiencia: ["renda_fixa"], objetivoFinanceiro: "comprar_bem" })).toBe("moderado");
    expect(classificarInvestidor({ reacaoQueda: "compro_mais", experiencia: ["acoes"], objetivoFinanceiro: "longo_prazo" })).toBe("arrojado");
  });
  it("calcula idade e recusa datas inválidas", () => {
    const hoje = new Date(2026, 10, 21);
    expect(calcularIdade("2000-11-21", hoje)).toBe(26);
    expect(calcularIdade("2000-11-22", hoje)).toBe(25);
    expect(calcularIdade("2000-02-31", hoje)).toBeNull();
    expect(calcularIdade("2030-01-01", hoje)).toBeNull();
  });
});
