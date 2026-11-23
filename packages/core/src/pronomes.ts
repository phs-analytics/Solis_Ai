import type { PerfilInvestidor } from "./perfil.js";

/** Como os textos concordam com a pessoa. "neutro" usa construções que dispensam marca de gênero. */
export type Flexao = "ele" | "ela" | "elu" | "neutro";

/**
 * Aceita tanto os valores do seletor ("ela") quanto o texto salvo no perfil ("Ela/dela").
 * Com mais de um pronome, vale o primeiro reconhecido, na ordem em que a pessoa marcou.
 * "Prefiro não dizer", "Outro" (texto livre) ou lista vazia viram "neutro".
 */
export function flexaoDe(pronomes: readonly string[]): Flexao {
  for (const p of pronomes) {
    const t = p.trim().toLowerCase();
    if (t.startsWith("ela")) return "ela";
    if (t.startsWith("ele")) return "ele";
    if (t.startsWith("elu")) return "elu";
  }
  return "neutro";
}

export function boasVindas(f: Flexao, nome: string): string {
  const n = nome.trim();
  const base = { ele: "Bem-vindo", ela: "Bem-vinda", elu: "Bem-vinde", neutro: "Boas-vindas" }[f];
  return n ? `${base}, ${n}` : base;
}

/** Estados da pessoa. No neutro, frases naturais sem marca de gênero. */
export const ESTADOS: Record<Flexao, { pronto: string; cadastrado: string; conectado: string; seguro: string }> = {
  ele: { pronto: "pronto", cadastrado: "cadastrado", conectado: "conectado", seguro: "seguro" },
  ela: { pronto: "pronta", cadastrado: "cadastrada", conectado: "conectada", seguro: "segura" },
  elu: { pronto: "pronte", cadastrado: "cadastrade", conectado: "conectade", seguro: "segure" },
  neutro: { pronto: "Tudo certo para começar", cadastrado: "Cadastro feito", conectado: "Conexão feita", seguro: "Com a segurança em dia" },
};

export function novoUsuario(f: Flexao): string {
  return { ele: "Novo usuário", ela: "Nova usuária", elu: "Nove usuárie", neutro: "Boas-vindas" }[f];
}

const ADJ: Record<Flexao, Record<PerfilInvestidor, string>> = {
  ele: { conservador: "Conservador", moderado: "Moderado", arrojado: "Arrojado" },
  ela: { conservador: "Conservadora", moderado: "Moderada", arrojado: "Arrojada" },
  elu: { conservador: "Conservadore", moderado: "Moderade", arrojado: "Arrojade" },
  neutro: { conservador: "Conservador", moderado: "Moderado", arrojado: "Arrojado" }, // concorda com "perfil"
};

/**
 * Papel da pessoa como investidora. No neutro o adjetivo concorda com "perfil" (fixo), não com a pessoa.
 * `curto` tira o prefixo do neutro, para quando o rótulo ao lado já diz "Perfil de investidor".
 */
export function papelInvestidor(f: Flexao, tipo: PerfilInvestidor, curto = false): string {
  const adj = ADJ[f][tipo];
  if (f === "neutro") return curto ? adj : `Perfil de investimento: ${adj}`;
  return `${{ ele: "Investidor", ela: "Investidora", elu: "Investidore" }[f]} ${adj}`;
}

export type Ocupacao = "autonomo" | "mei" | "servidor" | "aposentado";

/** Rótulos de ocupação que concordam com a pessoa; no neutro, descrições da atividade. */
export const OCUPACOES: Record<Flexao, Record<Ocupacao, string>> = {
  ele: { autonomo: "Autônomo", mei: "MEI / empresário", servidor: "Servidor público", aposentado: "Aposentado" },
  ela: { autonomo: "Autônoma", mei: "MEI / empresária", servidor: "Servidora pública", aposentado: "Aposentada" },
  elu: { autonomo: "Autônome", mei: "MEI / empresárie", servidor: "Servidore públique", aposentado: "Aposentade" },
  neutro: { autonomo: "Por conta própria", mei: "MEI / negócio próprio", servidor: "Serviço público", aposentado: "Aposentadoria" },
};
