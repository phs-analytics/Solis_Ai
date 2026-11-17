/**
 * Solis AI v2 — modelo Qwen2.5-1.5B rodando localmente via llama.rn.
 * Fallback automático para o motor de regras v1 em caso de falha ou ausência do modelo.
 * Nunca recomenda investimentos.
 */

import { File, Paths, DownloadTask } from "expo-file-system";
import { initLlama, type LlamaContext } from "llama.rn";
import type { ContextoFinanceiro, RespostaIA } from "@solis/core";
import { responder } from "@solis/core";

const MODELO_URL =
  "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf";
const NOME_ARQUIVO = "solis-ai.gguf";

function arquivoModelo(): File {
  return new File(Paths.document, NOME_ARQUIVO);
}

export function caminhoModelo(): string {
  return arquivoModelo().uri;
}

export function modeloExiste(): boolean {
  return arquivoModelo().exists;
}

export type ProgressoDownload = { baixado: number; total: number };

export async function baixarModelo(
  onProgresso: (p: ProgressoDownload) => void,
  signal?: AbortSignal
): Promise<void> {
  const destino = arquivoModelo();
  if (destino.exists) destino.delete();
  const task = new DownloadTask(MODELO_URL, destino, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      onProgresso({ baixado: bytesWritten, total: totalBytes });
    },
    signal,
  });
  const resultado = await task.downloadAsync();
  if (!resultado) {
    if (destino.exists) destino.delete();
    throw new Error("Download cancelado ou falhou");
  }
}

export function removerModelo(): void {
  const f = arquivoModelo();
  if (f.exists) f.delete();
  liberarModelo();
}

let _ctx: LlamaContext | null = null;

export async function iniciarModelo(): Promise<boolean> {
  if (_ctx) return true;
  if (!modeloExiste()) return false;
  try {
    _ctx = await initLlama({ model: caminhoModelo(), n_ctx: 512, n_threads: 4 });
    return true;
  } catch {
    _ctx = null;
    return false; // OOM → v1 assume
  }
}

export function liberarModelo(): void {
  _ctx?.release();
  _ctx = null;
}

function montarSystemPrompt(ctx: ContextoFinanceiro): string {
  const fmt = (c: number) =>
    (Math.abs(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return [
    "Você é a Solis AI, assistente financeira pessoal. Responda em português do Brasil,",
    "de forma simples e direta. NUNCA recomende investimentos específicos.",
    "",
    `Dados do usuário em ${ctx.mes}/${ctx.ano}:`,
    `- Receitas: ${fmt(ctx.totalReceitas)} | Despesas: ${fmt(ctx.totalDespesas)} | Saldo: ${fmt(ctx.saldoMes)}`,
    `- Orçamentos estourados: ${ctx.orcamentos.filter((o) => o.restanteCentavos < 0).length}`,
    `- Metas em andamento: ${ctx.metas.filter((m) => m.pct < 1).length}`,
    `- Recorrentes próximos 30 dias: ${ctx.recorrentesProximos.length}`,
    "",
    "Responda com base nesses dados. Máximo 3 frases curtas.",
  ].join("\n");
}

export async function gerarResposta(
  pergunta: string,
  ctx: ContextoFinanceiro
): Promise<RespostaIA> {
  if (!_ctx) {
    const ok = await iniciarModelo();
    if (!ok) return responder(pergunta, ctx);
  }
  try {
    const resultado = await _ctx!.completion({
      messages: [
        { role: "system", content: montarSystemPrompt(ctx) },
        { role: "user", content: pergunta },
      ],
      n_predict: 200,
      temperature: 0.3,
      stop: ["<|im_end|>", "\n\n\n"],
    });
    const texto = resultado.text.trim();
    if (!texto) return responder(pergunta, ctx);
    return { texto, tipo: "info" };
  } catch {
    return responder(pergunta, ctx);
  }
}
