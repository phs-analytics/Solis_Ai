import { describe, it, expect } from "vitest";
import { avaliarSenha, senhaForte } from "../src/senha.js";

const falhas = (s: string, p: string[] = []) => avaliarSenha(s, p).filter((r) => !r.ok).map((r) => r.id);

describe("senha", () => {
  it("aceita senha forte", () => {
    expect(senhaForte("Pipa#Azul7Domingo")).toBe(true);
  });
  it("aponta cada regra que falta", () => {
    expect(falhas("curta")).toEqual(expect.arrayContaining(["tamanho", "maiuscula", "numero", "simbolo"]));
    expect(falhas("Pipa#Azul1234x")).toContain("padrao");
    expect(falhas("Pipa#Azuuul7Dom")).toContain("padrao");
    expect(falhas("MinhaSenha#2024")).toContain("comum");
  });
  it("recusa nome e ano de nascimento", () => {
    expect(falhas("Pedro#Azul7Dom", ["Pedro"])).toContain("comum");
    expect(falhas("Pipa#Azul1998x", ["1998"])).toContain("comum");
  });
});
