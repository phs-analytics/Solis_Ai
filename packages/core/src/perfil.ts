export type PerfilInvestidor = "conservador" | "moderado" | "arrojado";
export type ReacaoQueda = "vendo_tudo" | "espero" | "compro_mais";
export type Experiencia = "nenhuma" | "poupanca" | "renda_fixa" | "fundos" | "acoes" | "cripto";
export type ObjetivoFinanceiro = "sair_dividas" | "reserva" | "comprar_bem" | "longo_prazo" | "aposentadoria";

export type Perfil = {
  nomeCompleto: string;
  apelido: string;
  pronomes: string;
  genero: string;
  nascimento: string; // AAAA-MM-DD
  trabalho: string;
  faixaRenda: string;
  atividades: string[];
  ritmo: string;
  objetivosVida: string[];
  controleFinancas: string;
  objetivoFinanceiro: ObjetivoFinanceiro | "";
  reacaoQueda: ReacaoQueda | "";
  experiencia: Experiencia[];
  disciplina: string;
  dificuldades: string[];
  horarios: string[];
  perfilInvestidor?: PerfilInvestidor;
  concluidoEm?: string;
};

export const PERFIL_VAZIO: Perfil = {
  nomeCompleto: "", apelido: "", pronomes: "", genero: "", nascimento: "",
  trabalho: "", faixaRenda: "",
  atividades: [], ritmo: "", objetivosVida: [],
  controleFinancas: "", objetivoFinanceiro: "", reacaoQueda: "", experiencia: [],
  disciplina: "", dificuldades: [], horarios: [],
};

const PONTOS_REACAO: Record<ReacaoQueda, number> = { vendo_tudo: 0, espero: 2, compro_mais: 4 };
const PONTOS_EXPERIENCIA: Record<Experiencia, number> = {
  nenhuma: 0, poupanca: 0, renda_fixa: 1, fundos: 1, acoes: 2, cripto: 2,
};
const PONTOS_OBJETIVO: Record<ObjetivoFinanceiro, number> = {
  sair_dividas: 0, reserva: 0, comprar_bem: 1, aposentadoria: 1, longo_prazo: 2,
};

/** Classificação informativa (estilo suitability); nunca é recomendação de investimento. */
export function classificarInvestidor(p: Pick<Perfil, "reacaoQueda" | "experiencia" | "objetivoFinanceiro">): PerfilInvestidor {
  if (p.reacaoQueda === "vendo_tudo") return "conservador";
  const exp = Math.max(0, ...p.experiencia.map((e) => PONTOS_EXPERIENCIA[e]));
  const pontos =
    (p.reacaoQueda ? PONTOS_REACAO[p.reacaoQueda] : 0) +
    exp +
    (p.objetivoFinanceiro ? PONTOS_OBJETIVO[p.objetivoFinanceiro] : 0);
  if (pontos <= 3) return "conservador";
  if (pontos <= 6) return "moderado";
  return "arrojado";
}

/** Idade completa na data `hoje`; null se a data for inválida. */
export function calcularIdade(nascimento: string, hoje = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nascimento);
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(a, mes - 1, d);
  if (data.getMonth() !== mes - 1 || data > hoje) return null;
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() < mes - 1 || (hoje.getMonth() === mes - 1 && hoje.getDate() < d)) idade--;
  return idade;
}
