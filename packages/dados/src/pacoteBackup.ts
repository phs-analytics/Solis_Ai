import type { KdfParams } from "./vault.js";

// O salt não é segredo; vai junto para o backup abrir em outro aparelho com a mesma senha.
export type PacoteBackup = { formato: "solis-backup"; versao: 1; salt: string; kdf: KdfParams; banco: string };

export function montarPacote(salt: string, kdf: KdfParams, bancoBase64: string): string {
  const p: PacoteBackup = { formato: "solis-backup", versao: 1, salt, kdf, banco: bancoBase64 };
  return JSON.stringify(p);
}

export function lerPacote(texto: string): PacoteBackup {
  let p: Partial<PacoteBackup>;
  try {
    p = JSON.parse(texto);
  } catch {
    throw new Error("Este arquivo não é um backup do Solis.");
  }
  if (p?.formato !== "solis-backup") throw new Error("Este arquivo não é um backup do Solis.");
  if (p.versao !== 1) throw new Error("Backup de uma versão mais nova do Solis. Atualize o app.");
  if (
    typeof p.salt !== "string" || !/^[0-9a-f]{64}$/.test(p.salt) ||
    typeof p.banco !== "string" || p.banco.length === 0 ||
    typeof p.kdf?.iterations !== "number" || p.kdf.iterations < 100_000 || typeof p.kdf.hash !== "string"
  ) {
    throw new Error("Backup incompleto ou corrompido.");
  }
  return p as PacoteBackup;
}
