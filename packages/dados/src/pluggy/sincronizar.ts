import {
  autenticarPluggy, listarContasPluggy, listarTransacoesPluggy, centavosTransacao, centavosSaldo,
} from "@solis/core";
import type { ContaPluggy, TransacaoPluggy, Fetch } from "@solis/core";
import type { Banco } from "../vault.js";
import type { CredenciaisPluggy } from "./credenciais.js";

const CHAVE_ULTIMA = "pluggy_ultima_sync";
const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_PRIMEIRA_BUSCA = 90;
// Reolha alguns dias para trás: lançamentos podem aparecer no banco com atraso.
const DIAS_SOBREPOSICAO = 7;

export type ResultadoSync = { pulado: boolean; contas: number; novos: number };

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function diasAntes(d: Date, dias: number): string {
  return new Date(d.getTime() - dias * DIA_MS).toISOString().slice(0, 10);
}

export async function ultimaSyncPluggy(banco: Banco): Promise<string | null> {
  const rows = await banco.getAllAsync<{ valor: string }>("SELECT valor FROM configuracoes WHERE chave = ?", [CHAVE_ULTIMA]);
  return rows[0]?.valor ?? null;
}

/**
 * Busca contas e transações no Meu Pluggy e grava só no banco local.
 * Sem `forcar`, roda no máximo uma vez a cada 24h (o Meu Pluggy só atualiza nesse ritmo).
 */
export async function sincronizarPluggy(
  banco: Banco,
  cred: CredenciaisPluggy,
  opc: { forcar?: boolean; agora?: Date; fetch?: Fetch } = {}
): Promise<ResultadoSync> {
  const agora = opc.agora ?? new Date();
  const ultima = await ultimaSyncPluggy(banco);
  if (!opc.forcar && ultima && agora.getTime() - Date.parse(ultima) < DIA_MS) {
    return { pulado: true, contas: 0, novos: 0 };
  }
  const dataDe = ultima ? diasAntes(new Date(ultima), DIAS_SOBREPOSICAO) : diasAntes(agora, DIAS_PRIMEIRA_BUSCA);

  // Rede primeiro; o banco só é tocado com tudo em mãos.
  const apiKey = await autenticarPluggy(cred.clientId, cred.clientSecret, opc.fetch);
  const lotes: { conta: ContaPluggy; transacoes: TransacaoPluggy[] }[] = [];
  for (const itemId of cred.itemIds) {
    for (const conta of await listarContasPluggy(apiKey, itemId, opc.fetch)) {
      lotes.push({ conta, transacoes: await listarTransacoesPluggy(apiKey, conta.id, dataDe, opc.fetch) });
    }
  }

  let novos = 0;
  await banco.withTransactionAsync(async () => {
    for (const { conta, transacoes } of lotes) {
      const contaId = await garantirConta(banco, conta, agora);
      for (const t of transacoes) {
        if (t.status === "PENDING") continue;
        const valor = centavosTransacao(t);
        const ts = agora.toISOString();
        const r = await banco.runAsync(
          `INSERT OR IGNORE INTO lancamentos
             (id, conta_id, valor_centavos, descricao, categoria_id, data, tipo, recorrente, criado_em, atualizado_em, externo_id)
           VALUES (?, ?, ?, ?, NULL, ?, ?, 0, ?, ?, ?)`,
          [uuid(), contaId, valor, t.description ?? "", t.date.slice(0, 10), valor >= 0 ? "receita" : "despesa", ts, ts, t.id]
        );
        novos += r.changes;
      }
      // Saldo do Solis = saldo inicial + lançamentos; ajusta o inicial para bater com o banco hoje.
      const soma = await banco.getAllAsync<{ total: number }>(
        "SELECT COALESCE(SUM(valor_centavos), 0) AS total FROM lancamentos WHERE conta_id = ?", [contaId]
      );
      await banco.runAsync("UPDATE contas SET saldo_inicial_centavos = ? WHERE id = ?",
        [centavosSaldo(conta) - (soma[0]?.total ?? 0), contaId]);
    }
    await banco.runAsync("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [CHAVE_ULTIMA, agora.toISOString()]);
  });

  return { pulado: false, contas: lotes.length, novos };
}

async function garantirConta(banco: Banco, c: ContaPluggy, agora: Date): Promise<string> {
  const rows = await banco.getAllAsync<{ id: string }>("SELECT id FROM contas WHERE externo_id = ?", [c.id]);
  if (rows[0]) return rows[0].id;
  const id = uuid();
  const nome = c.type === "CREDIT" ? `Cartão ${c.marketingName ?? c.name}` : (c.marketingName ?? c.name);
  const tipo = c.type === "CREDIT" ? "outro" : c.subtype === "SAVINGS_ACCOUNT" ? "poupanca" : "corrente";
  await banco.runAsync(
    `INSERT INTO contas (id, nome, tipo, saldo_inicial_centavos, moeda, ativo, criado_em, externo_id)
     VALUES (?, ?, ?, 0, ?, 1, ?, ?)`,
    [id, nome, tipo, c.currencyCode || "BRL", agora.toISOString(), c.id]
  );
  return id;
}
