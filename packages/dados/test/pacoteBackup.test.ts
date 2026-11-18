import { describe, expect, it } from "vitest";
import { lerPacote, montarPacote } from "../src/pacoteBackup.js";

const SALT = "ab".repeat(32);
const KDF = { iterations: 600_000, hash: "SHA-256" };

describe("pacote de backup", () => {
  it("ida e volta preserva salt, kdf e banco", () => {
    const p = lerPacote(montarPacote(SALT, KDF, "U1FMaXRl"));
    expect(p).toMatchObject({ salt: SALT, kdf: KDF, banco: "U1FMaXRl", versao: 1 });
  });

  it("recusa arquivo que não é backup", () => {
    expect(() => lerPacote("não é json")).toThrow(/não é um backup/);
    expect(() => lerPacote(JSON.stringify({ formato: "outro" }))).toThrow(/não é um backup/);
  });

  it("recusa versão futura e campos inválidos", () => {
    const base = JSON.parse(montarPacote(SALT, KDF, "x"));
    expect(() => lerPacote(JSON.stringify({ ...base, versao: 2 }))).toThrow(/mais nova/);
    expect(() => lerPacote(JSON.stringify({ ...base, salt: "123" }))).toThrow(/corrompido/);
    expect(() => lerPacote(JSON.stringify({ ...base, kdf: { iterations: 10, hash: "SHA-256" } }))).toThrow(/corrompido/);
    expect(() => lerPacote(JSON.stringify({ ...base, banco: "" }))).toThrow(/corrompido/);
  });
});
