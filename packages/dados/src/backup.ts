/**
 * Backup e restauração. O arquivo .solis leva o banco (já cifrado com SQLCipher)
 * e o salt, para abrir em outro aparelho com a mesma senha.
 */

import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import { fecharBanco, bancoCorrente, derivarChave, KDF_DEFAULTS } from "./vault.js";
import { removerChave, lerSalt, lerPrefs, salvarSalt } from "./keystore.js";
import { montarPacote, lerPacote } from "./pacoteBackup.js";

const NOME_BANCO = "solis.db";
const NOME_TEMP = "solis_restaurar.db";
const DIR_BANCO = `${FileSystem.documentDirectory}SQLite`;
const BASE_BANCO = `${DIR_BANCO}/${NOME_BANCO}`;
const BASE_TEMP = `${DIR_BANCO}/${NOME_TEMP}`;
const B64 = { encoding: FileSystem.EncodingType.Base64 };

/**
 * Gera o arquivo .solis no cache e retorna o caminho.
 * IMPORTANTE: chame limparBackupTemporario() após o compartilhamento.
 */
export async function exportarBackup(): Promise<string> {
  const salt = await lerSalt();
  if (!salt) throw new Error("Acesso ainda não configurado.");
  const kdf = (await lerPrefs())?.kdf ?? KDF_DEFAULTS;
  // Sem o checkpoint, os lançamentos recentes ficam no arquivo -wal e não entram no backup.
  await bancoCorrente().execAsync("PRAGMA wal_checkpoint(TRUNCATE)");
  const banco = await FileSystem.readAsStringAsync(BASE_BANCO, B64);
  const destino = `${FileSystem.cacheDirectory}solis_backup_${dataHojeISO()}.solis`;
  await FileSystem.writeAsStringAsync(destino, montarPacote(salt, kdf, banco));
  return destino;
}

/**
 * Substitui os dados do aparelho pelo backup. Testa a senha antes de apagar qualquer coisa:
 * com senha errada ou arquivo inválido, lança erro e os dados atuais ficam intactos.
 */
export async function restaurarBackup(uriArquivo: string, senha: string): Promise<void> {
  const pacote = lerPacote(await FileSystem.readAsStringAsync(uriArquivo));
  const chave = await derivarChave(senha, pacote.salt, pacote.kdf);

  await FileSystem.makeDirectoryAsync(DIR_BANCO, { intermediates: true });
  await FileSystem.writeAsStringAsync(BASE_TEMP, pacote.banco, B64);
  try {
    const teste = await SQLite.openDatabaseAsync(NOME_TEMP);
    try {
      await teste.execAsync(`PRAGMA key = '${chave}'`);
      await teste.execAsync("SELECT count(*) FROM sqlite_master");
    } finally {
      await teste.closeAsync();
    }
  } catch {
    await FileSystem.deleteAsync(BASE_TEMP, { idempotent: true });
    throw new Error("Senha errada ou backup corrompido.");
  }

  await apagarTudo();
  await FileSystem.moveAsync({ from: BASE_TEMP, to: BASE_BANCO });
  await salvarSalt(pacote.salt, false, pacote.kdf);
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
