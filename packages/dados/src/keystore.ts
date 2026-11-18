/**
 * Acesso ao salt e à chave cifrada no Android Keystore via expo-secure-store.
 *
 * Modelo de segurança:
 * - A chave do banco (AES-256) é DERIVADA da senha do usuário via PBKDF2.
 * - O salt de derivação é armazenado no Keystore (protegido pelo chip).
 * - A chave derivada NUNCA é persistida: é recalculada a cada desbloqueio.
 * - Com biometria: o salt fica num slot com requireAuthentication=true,
 *   vinculando o acesso ao chip biométrico do Android Keystore.
 * - Sem biometria: o salt fica num slot acessível só com aparelho desbloqueado.
 */

import * as SecureStore from "expo-secure-store";

const SALT_ID = "solis_salt_v1";
const SALT_ID_BIO = "solis_salt_bio_v1";
const PREFS_ID = "solis_prefs_v1";
const COTACOES_ID = "solis_cotacoes_online_v1";

/** Consentimento para enviar tickers à brapi.dev (LGPD). Desligado por padrão. */
export async function lerConsentimentoCotacoes(): Promise<boolean> {
  return (await SecureStore.getItemAsync(COTACOES_ID)) === "1";
}

export async function salvarConsentimentoCotacoes(ativo: boolean): Promise<void> {
  if (ativo) await SecureStore.setItemAsync(COTACOES_ID, "1");
  else await SecureStore.deleteItemAsync(COTACOES_ID);
}

import type { KdfParams } from "./vault.js";
import { KDF_DEFAULTS } from "./vault.js";

export type Prefs = { biometriaAtiva: boolean; kdf: KdfParams };

/** Salva o salt no Keystore. Com biometria, exige autenticação biométrica para ler. */
export async function salvarSalt(salt: string, biometria: boolean, kdf: KdfParams = KDF_DEFAULTS): Promise<void> {
  if (biometria) {
    await SecureStore.setItemAsync(SALT_ID_BIO, salt, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: true,
      authenticationPrompt: "Desbloquear Solis",
    });
  } else {
    await SecureStore.setItemAsync(SALT_ID, salt, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  await SecureStore.setItemAsync(PREFS_ID, JSON.stringify({ biometriaAtiva: biometria, kdf }), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

/** Lê o salt do Keystore (aciona biometria se necessário). Retorna null se não configurado. */
export async function lerSalt(): Promise<string | null> {
  const prefs = await lerPrefs();
  const id = prefs?.biometriaAtiva ? SALT_ID_BIO : SALT_ID;
  return SecureStore.getItemAsync(id, {
    authenticationPrompt: "Desbloquear Solis",
  });
}

export async function lerPrefs(): Promise<Prefs | null> {
  const raw = await SecureStore.getItemAsync(PREFS_ID);
  if (!raw) return null;
  return JSON.parse(raw) as Prefs;
}

/** Remove salt e prefs (apagar tudo / redefinir senha). */
export async function removerChave(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SALT_ID),
    SecureStore.deleteItemAsync(SALT_ID_BIO),
    SecureStore.deleteItemAsync(PREFS_ID),
    SecureStore.deleteItemAsync(COTACOES_ID),
  ]);
}
