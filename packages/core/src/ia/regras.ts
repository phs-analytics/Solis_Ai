/**
 * Motor de regras da Solis AI v1.
 * Responde perguntas sobre os dados do usuário sem usar internet.
 * Nunca recomenda investimentos.
 */

export type ContextoFinanceiro = {
  mes: number;
  ano: number;
  totalReceitas: number;
  totalDespesas: number;
  saldoMes: number;
  topCategorias: { categoriaId: string; totalCentavos: number }[];
  orcamentos: { categoriaId: string; limiteCentavos: number; gastosCentavos: number; restanteCentavos: number }[];
  metas: { nome: string; alvoCentavos: number; atualCentavos: number; pct: number }[];
  recorrentesProximos: { data: string; descricao: string; valorCentavos: number }[];
  pessoa?: { apelido: string; pronomes: string[] };
};

export type RespostaIA = {
  texto: string;
  tipo: "info" | "alerta" | "elogio" | "dica";
};

// ── Utilitários ───────────────────────────────────────────────────────────

function fmt(centavos: number): string {
  return (Math.abs(centavos) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// ── Verificação de intenção ───────────────────────────────────────────────

type Intencao =
  | "saldo_mes"
  | "quanto_gastei"
  | "orcamento"
  | "metas"
  | "recorrentes"
  | "posso_gastar"
  | "elogio_periodo"
  | "desconhecida";

const PADROES: { intencao: Intencao; palavras: string[] }[] = [
  { intencao: "saldo_mes",    palavras: ["saldo", "sobrou", "quanto tenho", "resultado do mes", "balanco"] },
  { intencao: "quanto_gastei", palavras: ["gastei", "quanto gastei", "despesas", "gastos", "saiu"] },
  { intencao: "orcamento",    palavras: ["orcamento", "limite", "quanto posso gastar", "estouro"] },
  { intencao: "metas",        palavras: ["meta", "cofre", "objetivo", "poupanca", "juntando"] },
  { intencao: "recorrentes",  palavras: ["recorrente", "fixa", "proximos", "vence", "vencimento", "contas do mes"] },
  { intencao: "posso_gastar", palavras: ["posso gastar", "posso comprar", "tem dinheiro", "sobrou dinheiro"] },
  { intencao: "elogio_periodo", palavras: ["como estou", "resumo", "analise", "analise do mes", "feedback"] },
];

function detectarIntencao(pergunta: string): Intencao {
  const norm = normalizar(pergunta);
  for (const { intencao, palavras } of PADROES) {
    if (palavras.some((p) => norm.includes(p))) return intencao;
  }
  return "desconhecida";
}

// ── Geradores de resposta ─────────────────────────────────────────────────

function responderSaldoMes(ctx: ContextoFinanceiro): RespostaIA {
  const { totalReceitas, totalDespesas, saldoMes } = ctx;
  const positivo = saldoMes >= 0;
  return {
    tipo: positivo ? "info" : "alerta",
    texto: positivo
      ? `Neste mês você recebeu ${fmt(totalReceitas)} e gastou ${fmt(totalDespesas)}. Sobrou ${fmt(saldoMes)} 👍`
      : `Neste mês você recebeu ${fmt(totalReceitas)}, mas gastou ${fmt(totalDespesas)}. Está ${fmt(Math.abs(saldoMes))} no negativo — vale revisar os gastos.`,
  };
}

function responderQuantoGastei(ctx: ContextoFinanceiro): RespostaIA {
  const { totalDespesas, topCategorias } = ctx;
  if (topCategorias.length === 0) {
    return { tipo: "info", texto: `Você gastou ${fmt(totalDespesas)} neste mês. Ainda não tenho detalhes por categoria.` };
  }
  const top = topCategorias[0]!;
  return {
    tipo: "info",
    texto: `Você gastou ${fmt(totalDespesas)} neste mês. A maior categoria (id: ${top.categoriaId}) concentrou ${fmt(top.totalCentavos)}.`,
  };
}

function responderOrcamento(ctx: ContextoFinanceiro): RespostaIA {
  if (ctx.orcamentos.length === 0) {
    return { tipo: "dica", texto: "Você ainda não definiu orçamentos por categoria. Acesse Lançamentos → Orçamento para criar limites mensais." };
  }
  const estourados = ctx.orcamentos.filter((o) => o.restanteCentavos < 0);
  if (estourados.length > 0) {
    return { tipo: "alerta", texto: `Atenção: ${estourados.length} orçamento(s) estourado(s) este mês. Considere revisar os gastos nessas categorias.` };
  }
  const critico = ctx.orcamentos.filter((o) => o.restanteCentavos < o.limiteCentavos * 0.1);
  if (critico.length > 0) {
    return { tipo: "alerta", texto: `Seus orçamentos estão quase no limite em ${critico.length} categoria(s). Fique de olho para não estourar.` };
  }
  return { tipo: "elogio", texto: `Todos os orçamentos estão dentro do limite este mês. Continue assim! 🎉` };
}

function responderMetas(ctx: ContextoFinanceiro): RespostaIA {
  if (ctx.metas.length === 0) {
    return { tipo: "dica", texto: "Você não tem metas criadas ainda. Acesse a aba Metas para criar um cofre." };
  }
  const concluidas = ctx.metas.filter((m) => m.pct >= 1);
  const emAndamento = ctx.metas.filter((m) => m.pct < 1);
  const mais_perto = emAndamento.sort((a, b) => b.pct - a.pct)[0];
  let texto = `Você tem ${ctx.metas.length} meta(s).`;
  if (concluidas.length > 0) texto += ` ${concluidas.length} já concluída(s) 🎉`;
  if (mais_perto) texto += ` A mais próxima é "${mais_perto.nome}" com ${Math.round(mais_perto.pct * 100)}% concluída.`;
  return { tipo: "info", texto };
}

function responderRecorrentes(ctx: ContextoFinanceiro): RespostaIA {
  if (ctx.recorrentesProximos.length === 0) {
    return { tipo: "info", texto: "Nenhuma conta recorrente prevista para os próximos 30 dias." };
  }
  const total = ctx.recorrentesProximos.reduce((s, r) => s + Math.abs(r.valorCentavos), 0);
  const proxima = ctx.recorrentesProximos[0]!;
  return {
    tipo: "info",
    texto: `Você tem ${ctx.recorrentesProximos.length} conta(s) recorrente(s) nos próximos 30 dias, totalizando ${fmt(total)}. A próxima é "${proxima.descricao}" em ${proxima.data}.`,
  };
}

function responderPossoGastar(ctx: ContextoFinanceiro): RespostaIA {
  const podeGastar = ctx.orcamentos.reduce((s, o) => s + Math.max(0, o.restanteCentavos), 0);
  if (podeGastar > 0) {
    return { tipo: "info", texto: `Somando todos os orçamentos, você ainda pode gastar ${fmt(podeGastar)} este mês dentro dos seus limites.` };
  }
  if (ctx.saldoMes > 0) {
    return { tipo: "info", texto: `Seu saldo do mês está positivo em ${fmt(ctx.saldoMes)}, mas os orçamentos por categoria já estão no limite. Cuidado com novos gastos.` };
  }
  return { tipo: "alerta", texto: "Seus orçamentos estão estourados e o saldo do mês está negativo. Hora de segurar os gastos." };
}

function responderElogio(ctx: ContextoFinanceiro): RespostaIA {
  const linhas: string[] = [];
  if (ctx.saldoMes > 0) linhas.push(`✅ Saldo positivo de ${fmt(ctx.saldoMes)} este mês.`);
  else linhas.push(`⚠️ Saldo negativo de ${fmt(Math.abs(ctx.saldoMes))} este mês.`);
  const estourados = ctx.orcamentos.filter((o) => o.restanteCentavos < 0).length;
  if (estourados === 0 && ctx.orcamentos.length > 0) linhas.push("✅ Todos os orçamentos dentro do limite.");
  else if (estourados > 0) linhas.push(`⚠️ ${estourados} orçamento(s) estourado(s).`);
  const metasOk = ctx.metas.filter((m) => m.pct >= 0.5).length;
  if (metasOk > 0) linhas.push(`✅ ${metasOk} meta(s) com mais de 50% concluída.`);
  return { tipo: ctx.saldoMes >= 0 ? "elogio" : "info", texto: linhas.join("\n") };
}

// ── Ponto de entrada ──────────────────────────────────────────────────────

export function responder(pergunta: string, ctx: ContextoFinanceiro): RespostaIA {
  const intencao = detectarIntencao(pergunta);
  switch (intencao) {
    case "saldo_mes":      return responderSaldoMes(ctx);
    case "quanto_gastei":  return responderQuantoGastei(ctx);
    case "orcamento":      return responderOrcamento(ctx);
    case "metas":          return responderMetas(ctx);
    case "recorrentes":    return responderRecorrentes(ctx);
    case "posso_gastar":   return responderPossoGastar(ctx);
    case "elogio_periodo": return responderElogio(ctx);
    default:
      return {
        tipo: "dica",
        texto: "Não entendi bem. Você pode perguntar: 'quanto gastei este mês?', 'como estão meus orçamentos?', 'quais contas vencem em breve?'",
      };
  }
}

// ── Alertas automáticos ───────────────────────────────────────────────────

export function gerarAlertas(ctx: ContextoFinanceiro): RespostaIA[] {
  const alertas: RespostaIA[] = [];

  // Orçamentos estourados
  for (const o of ctx.orcamentos) {
    if (o.restanteCentavos < 0) {
      alertas.push({ tipo: "alerta", texto: `Orçamento estourado: ${fmt(Math.abs(o.restanteCentavos))} acima do limite.` });
    }
  }

  // Recorrentes nos próximos 7 dias
  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  for (const r of ctx.recorrentesProximos) {
    if (new Date(r.data) <= em7dias) {
      alertas.push({ tipo: "alerta", texto: `Conta recorrente próxima: "${r.descricao}" em ${r.data} — ${fmt(r.valorCentavos)}.` });
    }
  }

  // Saldo negativo
  if (ctx.saldoMes < 0) {
    alertas.push({ tipo: "alerta", texto: `Saldo do mês está negativo (${fmt(ctx.saldoMes)}). Revise seus gastos.` });
  }

  return alertas;
}
