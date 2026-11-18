import {
  abrirBanco, derivarChave, garantirCategoriasPadrao, inicializarSchema, lerPrefs, lerSalt, KDF_DEFAULTS,
} from "@solis/dados";
import type { Banco } from "@solis/dados";

/** Deriva a chave da senha, abre o cofre e garante schema e categorias. Lança se a senha estiver errada. */
export async function entrar(senha: string): Promise<Banco> {
  const salt = await lerSalt();
  if (!salt) throw new Error("Acesso ainda não configurado.");
  const kdf = (await lerPrefs())?.kdf ?? KDF_DEFAULTS;
  const banco = await abrirBanco(await derivarChave(senha, salt, kdf));
  await inicializarSchema(banco);
  await garantirCategoriasPadrao(banco);
  return banco;
}
