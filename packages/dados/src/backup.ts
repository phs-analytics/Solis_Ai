/**
 * Exporta o banco cifrado como arquivo e permite apagar todos os dados.
 * O arquivo exportado já está cifrado com a mesma chave do banco original.
 */

import * as FileSystem from "expo-file-system/legacy";
import { fecharBanco, apagarBanco } from "./vault.js";
import { removerChave } from "./keystore.js";

const NOME_BANCO = "solis.db";
const BASE_BANCO = `${FileSystem.documentDirectory}SQLite/${NOME_BANCO}`;

/**
 * Copia o banco (já cifrado com SQLCipher/AES-256) para o cache e retorna o caminho.
 * O banco de origem já está cifrado — o backup carrega a mesma proteção.
 * IMPORTANTE: chame limparBackupTemporario() após o compartilhamento.
 */
export async function exportarBackup(): Promise<string> {
  const destino = `${FileSystem.cacheDirectory}solis_backup_${dataHojeISO()}.db`;
  await FileSystem.copyAsync({ from: BASE_BANCO, to: destino });
  return destino;
}

/** Remove o arquivo temporário de backup após compartilhamento. */
export async function limparBackupTemporario(caminho: string): Promise<void> {
  await FileSystem.deleteAsync(caminho, { idempotent: true });
}

/**
 * Apaga todos os dados do usuário: fecha o banco, remove o arquivo, sidecars e a chave.
 * Irreversível — o chamador deve confirmar antes.
 */
export async function apagarTudo(): Promise<void> {
  await fecharBanco();
  // Remove banco, sidecars WAL/SHM e qualquer backup temporário em cache
  await Promise.all([
    FileSystem.deleteAsync(BASE_BANCO, { idempotent: true }),
    FileSystem.deleteAsync(`${BASE_BANCO}-wal`, { idempotent: true }),
    FileSystem.deleteAsync(`${BASE_BANCO}-shm`, { idempotent: true }),
    limparBackupsCacheAsync(),
  ]);
  await removerChave();
}

async function limparBackupsCacheAsync(): Promise<void> {
  const dir = FileSystem.cacheDirectory ?? "";
  try {
    const { exists, isDirectory } = await FileSystem.getInfoAsync(dir);
    if (!exists || !isDirectory) return;
    const arquivos = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      arquivos
        .filter((f) => f.startsWith("solis_backup_"))
        .map((f) => FileSystem.deleteAsync(`${dir}${f}`, { idempotent: true }))
    );
  } catch {
    // Ignora erros de listagem — não impede o apagamento do banco
  }
}

function dataHojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}
