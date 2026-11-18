import * as SecureStore from "expo-secure-store";

const ID = "solis_pluggy_v1";

/** Credenciais do Meu Pluggy da própria pessoa. Ficam só no armazenamento seguro do aparelho. */
export type CredenciaisPluggy = { clientId: string; clientSecret: string; itemIds: string[] };

export async function lerCredenciaisPluggy(): Promise<CredenciaisPluggy | null> {
  const raw = await SecureStore.getItemAsync(ID);
  return raw ? (JSON.parse(raw) as CredenciaisPluggy) : null;
}

export async function salvarCredenciaisPluggy(c: CredenciaisPluggy): Promise<void> {
  await SecureStore.setItemAsync(ID, JSON.stringify(c), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function apagarCredenciaisPluggy(): Promise<void> {
  await SecureStore.deleteItemAsync(ID);
}
