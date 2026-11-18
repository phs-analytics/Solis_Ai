export { abrirBanco, fecharBanco, bancoCorrente, apagarBanco, registrarTentativaErrada, resetarTentativas, verificarBloqueio, derivarChave, gerarSalt, KDF_DEFAULTS } from "./vault.js";
export type { KdfParams, Banco } from "./vault.js";
export { salvarSalt, lerSalt, lerPrefs, removerChave, lerConsentimentoCotacoes, salvarConsentimentoCotacoes } from "./keystore.js";
export { inicializarSchema, VERSAO_SCHEMA } from "./schema.js";
export { exportarBackup, restaurarBackup, limparBackupTemporario, apagarTudo } from "./backup.js";
export * from "./repositorios/index.js";
export { montarContexto } from "./ia/analisador.js";
export type { ContextoFinanceiro } from "./ia/analisador.js";
