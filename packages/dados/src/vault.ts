/**
 * Cofre SQLCipher: abre o banco cifrado com AES-256.
 * A senha é a chave lida do Keystore (nunca a senha digitada pelo usuário diretamente).
 */

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";

const NOME_BANCO = "solis.db";
const MAX_TENTATIVAS = 5;
const CHAVE_TENTATIVAS = "tentativas_senha_errada";

export type Banco = SQLite.SQLiteDatabase;

let _banco: Banco | null = null;

// Registro do KDF que o SQLCipher 4 aplica à senha (fixado por cipher_compatibility = 4).
export type KdfParams = { iterations: number; hash: string };
export const KDF_DEFAULTS: KdfParams = { iterations: 256_000, hash: "PBKDF2-HMAC-SHA512" };

/** Gera um salt aleatório de 32 bytes em hex (o Hermes não tem crypto.getRandomValues). */
export function gerarSalt(): string {
  return bufferToHex(Crypto.getRandomBytes(32));
}

/** Aplica a senha ao SQLCipher, que deriva a chave AES-256 nativamente com o salt do próprio arquivo. */
export async function aplicarSenha(banco: Banco, senha: string): Promise<void> {
  await banco.execAsync(`PRAGMA key = '${senha.replace(/'/g, "''")}'`);
  await banco.execAsync("PRAGMA cipher_compatibility = 4");
}

function bufferToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Abre (ou reabre) o banco com a senha. Lança erro se a senha estiver errada. */
export async function abrirBanco(senha: string): Promise<Banco> {
  if (_banco) return _banco;

  const banco = await SQLite.openDatabaseAsync(NOME_BANCO, {
    // expo-sqlite usa SQLCipher quando passamos a chave via pragma
    enableChangeListener: false,
  });

  try {
    await aplicarSenha(banco, senha);
    // Testa acesso real (lança se a chave estiver incorreta)
    await banco.execAsync("SELECT count(*) FROM sqlite_master");
  } catch (e) {
    await banco.closeAsync();
    throw e;
  }

  _banco = banco;
  return banco;
}

/** Fecha a conexão atual (ex: ao bloquear o app por inatividade). */
export async function fecharBanco(): Promise<void> {
  if (_banco) {
    await _banco.closeAsync();
    _banco = null;
  }
}

/** Retorna o banco aberto ou lança se ainda não foi aberto. */
export function bancoCorrente(): Banco {
  if (!_banco) throw new Error("Banco não está aberto. Desbloqueie o app primeiro.");
  return _banco;
}

// ── Bloqueio por tentativas ────────────────────────────────────────────────

// shortcut: AsyncStorage importado aqui para evitar dependência circular — mover para camada de serviço quando o app crescer
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function registrarTentativaErrada(): Promise<number> {
  const atual = Number((await AsyncStorage.getItem(CHAVE_TENTATIVAS)) ?? "0");
  const novas = atual + 1;
  await AsyncStorage.setItem(CHAVE_TENTATIVAS, String(novas));
  return novas;
}

export async function resetarTentativas(): Promise<void> {
  await AsyncStorage.removeItem(CHAVE_TENTATIVAS);
}

/** Retorna true e apaga o banco se o limite de tentativas foi atingido. */
export async function verificarBloqueio(): Promise<boolean> {
  const tentativas = Number((await AsyncStorage.getItem(CHAVE_TENTATIVAS)) ?? "0");
  if (tentativas >= MAX_TENTATIVAS) {
    await apagarBanco();
    return true;
  }
  return false;
}

export async function apagarBanco(): Promise<void> {
  await fecharBanco();
  const caminho = `${FileSystem.documentDirectory}SQLite/${NOME_BANCO}`;
  await FileSystem.deleteAsync(caminho, { idempotent: true });
}
