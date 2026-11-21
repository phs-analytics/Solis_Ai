import type { Perfil } from "@solis/core";
import type { Banco } from "../vault.js";

const CHAVE = "perfil_v1";

export async function salvarPerfil(banco: Banco, perfil: Perfil): Promise<void> {
  await banco.runAsync("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [CHAVE, JSON.stringify(perfil)]);
}

export async function lerPerfil(banco: Banco): Promise<Perfil | null> {
  const row = await banco.getFirstAsync<{ valor: string }>("SELECT valor FROM configuracoes WHERE chave = ?", [CHAVE]);
  if (!row) return null;
  const p = JSON.parse(row.valor) as Perfil;
  // Perfis antigos guardavam um pronome só, como texto.
  const antigo = p.pronomes as unknown;
  if (typeof antigo === "string") p.pronomes = antigo ? [antigo] : [];
  return p;
}
