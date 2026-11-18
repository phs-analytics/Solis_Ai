import {
  abrirBanco, fecharBanco, derivarChave, garantirCategoriasPadrao, inicializarSchema, lerPrefs, lerSalt, KDF_DEFAULTS,
} from "@solis/dados";
import type { Banco } from "@solis/dados";

/** Só este erro conta como tentativa errada (e pode levar ao apagamento). */
export class SenhaErrada extends Error {}

/** Deriva a chave da senha, abre o cofre e garante schema e categorias. */
export async function entrar(senha: string): Promise<Banco> {
  const salt = await lerSalt();
  if (!salt) throw new Error("Acesso ainda não configurado.");
  const kdf = (await lerPrefs())?.kdf ?? KDF_DEFAULTS;
  const chave = await derivarChave(senha, salt, kdf);

  let banco: Banco;
  try {
    banco = await abrirBanco(chave);
  } catch {
    throw new SenhaErrada("Senha errada.");
  }
  try {
    await inicializarSchema(banco);
    await garantirCategoriasPadrao(banco);
  } catch (e) {
    // Sem fechar, o handle em cache deixaria a próxima tentativa entrar com qualquer senha.
    await fecharBanco();
    throw e;
  }
  return banco;
}
