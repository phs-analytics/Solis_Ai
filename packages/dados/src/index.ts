export { abrirBanco, fecharBanco, bancoCorrente, apagarBanco, registrarTentativaErrada, resetarTentativas, verificarBloqueio, derivarChave, gerarSalt, KDF_DEFAULTS } from "./vault.js";
export type { KdfParams } from "./vault.js";
export { salvarSalt, lerSalt, lerPrefs, removerChave } from "./keystore.js";
export { inicializarSchema, VERSAO_SCHEMA } from "./schema.js";
export { exportarBackup, limparBackupTemporario, apagarTudo } from "./backup.js";
