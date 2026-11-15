/**
 * Acesso à chave mestra no Android Keystore via expo-secure-store.
 * A chave nunca sai do chip de segurança do aparelho.
 */

import * as SecureStore from "expo-secure-store";

const CHAVE_ID = "solis_chave_mestra_v1";

/** Salva a chave derivada no Keystore. Chama só na criação/troca de senha. */
export async function salvarChave(chave: string): Promise<void> {
  await SecureStore.setItemAsync(CHAVE_ID, chave, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/** Lê a chave do Keystore. Retorna null se ainda não foi definida. */
export async function lerChave(): Promise<string | null> {
  return SecureStore.getItemAsync(CHAVE_ID);
}

/** Remove a chave (apagar tudo / redefinir senha). */
export async function removerChave(): Promise<void> {
  await SecureStore.deleteItemAsync(CHAVE_ID);
}
