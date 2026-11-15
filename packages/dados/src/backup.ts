/**
 * Exporta o banco cifrado como arquivo e permite apagar todos os dados.
 * O arquivo exportado já está cifrado com a mesma chave do banco original.
 */

import * as FileSystem from "expo-file-system/legacy";
import { fecharBanco, apagarBanco } from "./vault.js";
import { removerChave } from "./keystore.js";

const NOME_BANCO = "solis.db";

/** Copia o banco para a pasta de downloads/compartilhamento e retorna o caminho. */
export async function exportarBackup(): Promise<string> {
  const origem = `${FileSystem.documentDirectory}SQLite/${NOME_BANCO}`;
  const destino = `${FileSystem.cacheDirectory}solis_backup_${dataHojeISO()}.db`;
  await FileSystem.copyAsync({ from: origem, to: destino });
  return destino;
}

/**
 * Apaga todos os dados do usuário: fecha o banco, remove o arquivo e apaga a chave.
 * Irreversível — o chamador deve confirmar antes.
 */
export async function apagarTudo(): Promise<void> {
  await fecharBanco();
  await apagarBanco();
  await removerChave();
}

function dataHojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}
