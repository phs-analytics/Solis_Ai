/**
 * Cofre SQLCipher: abre o banco cifrado com AES-256.
 * A senha é a chave lida do Keystore (nunca a senha digitada pelo usuário diretamente).
 */

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

const NOME_BANCO = "solis.db";
const MAX_TENTATIVAS = 5;
const CHAVE_TENTATIVAS = "tentativas_senha_errada";

export type Banco = SQLite.SQLiteDatabase;

let _banco: Banco | null = null;

// Parâmetros do KDF armazenados junto com o salt para permitir upgrade futuro.
export type KdfParams = { iterations: number; hash: string };
export const KDF_DEFAULTS: KdfParams = { iterations: 600_000, hash: "SHA-256" };

/**
 * Deriva a chave AES-256 do banco usando PBKDF2 via Web Crypto API.
 * Disponível no Hermes (RN 0.73+) e Node.js 18+. Sem dependências extras.
 * A chave derivada nunca é persistida.
 */
export async function derivarChave(
  senha: string,
  saltHex: string,
  params: KdfParams = KDF_DEFAULTS
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const salt = hexToBuffer(saltHex).buffer as ArrayBuffer;
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: params.iterations, hash: params.hash },
    keyMaterial,
    256
  );
  return bufferToHex(new Uint8Array(bits));
}

/** Gera um salt aleatório de 32 bytes em hex. */
export function gerarSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes);
}

function hexToBuffer(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function bufferToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Abre (ou reabre) o banco com a chave fornecida. Lança erro se a chave estiver errada. */
export async function abrirBanco(chave: string): Promise<Banco> {
  if (_banco) return _banco;

  const banco = await SQLite.openDatabaseAsync(NOME_BANCO, {
    // expo-sqlite usa SQLCipher quando passamos a chave via pragma
    enableChangeListener: false,
  });

  try {
    await banco.execAsync(`PRAGMA key = '${chave.replace(/'/g, "''")}'`);
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
