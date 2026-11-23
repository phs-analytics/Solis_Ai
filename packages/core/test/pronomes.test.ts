import { describe, it, expect } from "vitest";
import { ESTADOS, OCUPACOES, boasVindas, flexaoDe, novoUsuario, papelInvestidor } from "../src/pronomes.js";

describe("pronomes", () => {
  it("reconhece o valor do seletor e o texto salvo no perfil", () => {
    expect(flexaoDe(["ela"])).toBe("ela");
    expect(flexaoDe(["Ele/dele"])).toBe("ele");
    expect(flexaoDe(["Elu/delu"])).toBe("elu");
  });

  it("sem pronome, 'prefiro não dizer' ou texto livre desconhecido: neutro natural", () => {
    expect(flexaoDe([])).toBe("neutro");
    expect(flexaoDe(["nao_dizer"])).toBe("neutro");
    expect(flexaoDe(["Prefiro não dizer"])).toBe("neutro");
    expect(flexaoDe(["outro"])).toBe("neutro");
    expect(flexaoDe(["ile/dile"])).toBe("neutro");
  });

  it("com mais de um pronome vale o primeiro reconhecido, na ordem marcada", () => {
    expect(flexaoDe(["elu", "ela"])).toBe("elu");
    expect(flexaoDe(["ile/dile", "ela"])).toBe("ela");
  });

  it("saudação concorda com a pessoa", () => {
    expect(boasVindas("ele", "Caio")).toBe("Bem-vindo, Caio");
    expect(boasVindas("ela", "Ana")).toBe("Bem-vinda, Ana");
    expect(boasVindas("elu", "Lu")).toBe("Bem-vinde, Lu");
    expect(boasVindas("neutro", "Sol")).toBe("Boas-vindas, Sol");
    expect(boasVindas("ela", " ")).toBe("Bem-vinda");
  });

  it("estados da pessoa", () => {
    expect(ESTADOS.ele.pronto).toBe("pronto");
    expect(ESTADOS.ela.cadastrado).toBe("cadastrada");
    expect(ESTADOS.elu.conectado).toBe("conectade");
    expect(ESTADOS.elu.seguro).toBe("segure");
    expect(ESTADOS.neutro.pronto).toBe("Tudo certo para começar");
  });

  it("papel de investidor e usuário", () => {
    expect(papelInvestidor("ele", "moderado")).toBe("Investidor Moderado");
    expect(papelInvestidor("ela", "arrojado")).toBe("Investidora Arrojada");
    expect(papelInvestidor("elu", "conservador")).toBe("Investidore Conservadore");
    expect(papelInvestidor("neutro", "moderado")).toBe("Perfil de investimento: Moderado");
    expect(papelInvestidor("neutro", "moderado", true)).toBe("Moderado");
    expect(novoUsuario("ela")).toBe("Nova usuária");
    expect(novoUsuario("elu")).toBe("Nove usuárie");
  });

  it("ocupações concordam com a pessoa e o neutro não tem marca de gênero", () => {
    expect(OCUPACOES.ela.servidor).toBe("Servidora pública");
    expect(OCUPACOES.elu.aposentado).toBe("Aposentade");
    expect(OCUPACOES.neutro.autonomo).toBe("Por conta própria");
  });
});
