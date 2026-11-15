export { abrirBanco, fecharBanco, bancoCorrente, apagarBanco, registrarTentativaErrada, resetarTentativas, verificarBloqueio } from "./vault.js";
export { salvarChave, lerChave, removerChave } from "./keystore.js";
export { inicializarSchema, VERSAO_SCHEMA } from "./schema.js";
export { exportarBackup, apagarTudo } from "./backup.js";
