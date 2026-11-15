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

/** Abre (ou reabre) o banco com a chave fornecida. Lança erro se a chave estiver errada. */
export async function abrirBanco(chave: string): Promise<Banco> {
  if (_banco) return _banco;

  const banco = await SQLite.openDatabaseAsync(NOME_BANCO, {
    // expo-sqlite usa SQLCipher quando passamos a chave via pragma
    enableChangeListener: false,
  });

  // Aplica a chave de criptografia — SQLCipher rejeita se errada
  await banco.execAsync(`PRAGMA key = '${chave.replace(/'/g, "''")}'`);

  // Testa acesso real (lança se a chave estiver incorreta)
  await banco.execAsync("SELECT count(*) FROM sqlite_master");

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
