import * as SQLite from 'expo-sqlite';

export interface Verificacao {
  nome: string;
  ok: boolean;
  detalhe?: string;
}

const ARQUIVO = 'autoteste-cofre.db';

// shortcut: Math.random não é fonte criptográfica; serve só para esta chave descartável de teste.
// O cofre de verdade (Etapa 1) gera a chave com fonte segura e a guarda no armazenamento seguro.
function chaveDeTeste(): string {
  let hex = '';
  for (let i = 0; i < 64; i++) hex += Math.floor(Math.random() * 16).toString(16);
  return hex;
}

// Chave bruta em hexadecimal (formato x'...' do SQLCipher). Só contém [0-9a-f], então pode ir no texto do PRAGMA.
const pragmaKey = (hex: string) => `PRAGMA key = "x'${hex}'";`;

// Conexão nova a cada abertura, para não reaproveitar uma conexão já destravada.
const abrir = () => SQLite.openDatabaseAsync(ARQUIVO, { useNewConnection: true });

async function leituraFalha(chave?: string): Promise<boolean> {
  const db = await abrir();
  try {
    if (chave) await db.execAsync(pragmaKey(chave));
    await db.getFirstAsync('SELECT valor FROM teste');
    return false;
  } catch {
    return true;
  } finally {
    await db.closeAsync().catch(() => {});
  }
}

/** Confere se o expo-sqlite foi compilado com SQLCipher e se o arquivo fica ilegível sem a chave certa. */
export async function rodarAutotesteCofre(): Promise<Verificacao[]> {
  const r: Verificacao[] = [];
  const chave = chaveDeTeste();
  await SQLite.deleteDatabaseAsync(ARQUIVO).catch(() => {});

  try {
    const db = await abrir();
    try {
      await db.execAsync(pragmaKey(chave));
      const v = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
      const versao = v?.cipher_version ?? '';
      r.push({ nome: 'SQLCipher ativo', ok: versao !== '', detalhe: versao || 'cipher_version vazio' });

      await db.execAsync('CREATE TABLE teste (valor TEXT NOT NULL)');
      await db.runAsync('INSERT INTO teste (valor) VALUES (?)', 'ola');
      const linha = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM teste');
      r.push({ nome: 'Grava e lê com a chave', ok: linha?.valor === 'ola' });
    } finally {
      await db.closeAsync();
    }

    r.push({ nome: 'Sem chave não lê', ok: await leituraFalha() });
    r.push({ nome: 'Chave errada não lê', ok: await leituraFalha(chaveDeTeste()) });
  } catch (e) {
    r.push({ nome: 'Erro inesperado', ok: false, detalhe: e instanceof Error ? e.message : String(e) });
  } finally {
    try {
      await SQLite.deleteDatabaseAsync(ARQUIVO);
      r.push({ nome: 'Arquivo de teste apagado', ok: true });
    } catch (e) {
      r.push({ nome: 'Arquivo de teste apagado', ok: false, detalhe: e instanceof Error ? e.message : String(e) });
    }
  }
  return r;
}
