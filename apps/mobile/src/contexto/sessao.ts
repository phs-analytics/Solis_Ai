import {
  abrirBanco, fecharBanco, garantirCategoriasPadrao, inicializarSchema, lerSalt,
} from "@solis/dados";
import type { Banco } from "@solis/dados";

/** Só este erro conta como tentativa errada (e pode levar ao apagamento). */
export class SenhaErrada extends Error {}

/** Deriva a chave da senha, abre o cofre e garante schema e categorias. */
export async function entrar(senha: string, pedirBiometria = true): Promise<Banco> {
  // Com biometria ativa, ler o salt é o que pede a digital/rosto.
  if (pedirBiometria && !(await lerSalt())) throw new Error("Acesso ainda não configurado.");

  let banco: Banco;
  try {
    banco = await abrirBanco(senha);
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
