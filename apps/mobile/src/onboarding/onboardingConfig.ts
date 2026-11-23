import type { NomeIcone } from "../components/Icone";
import type { Variante } from "./WalletCard";

// Todos os textos e valores do tour ficam aqui. Valores em centavos.
// Os exemplos seguem o que o Solis faz de verdade: metas não tiram dinheiro das contas,
// e compra no cartão vai para a fatura, não para o saldo.

export const VALORES = {
  banco: 234050,
  dinheiro: 12000,
  cartaoAntes: 41025,
  compraCartao: 6230,
  gastosMes: 89000,
  metaAlvo: 42000,
  metaDeposito: 5000,
};

export const CARDS = {
  banco: { rotulo: "Conta corrente", nome: "Conta principal", icone: "bank" as NomeIcone, variante: "fantastic" as Variante, cor: "#2F5DA8" },
  dinheiro: { rotulo: "Carteira", nome: "Dinheiro vivo", icone: "money-bill-wave" as NomeIcone, variante: "musgo" as Variante, cor: "#2E7D52" },
  cartao: { rotulo: "Cartão de crédito", nome: "Fatura do mês", icone: "credit-card" as NomeIcone, variante: "truffle" as Variante, cor: "#3A4B5F" },
  meta: { nome: "Viagem", icone: "plane-alt" as NomeIcone },
};

export type Bento = { rotulo: string; antes: number; depois?: number; pilula?: { texto: string; tipo: "sobe" | "desce" | "neutro" } };

export type PassoTour = {
  kicker: string;
  titulo: string;
  texto: string;
  cta: string;
  bentos?: [Bento, Bento];
  legenda?: string;
  simula?: boolean;
};

const saldoContas = VALORES.banco + VALORES.dinheiro;
const faturaDepois = VALORES.cartaoAntes + VALORES.compraCartao;

export const PASSOS: PassoTour[] = [
  {
    kicker: "Boas-vindas ao Solis", // o tour vem antes da escolha do pronome: texto sem marca de gênero
    titulo: "Seu dinheiro em um lugar só",
    texto: "Contas, dinheiro vivo, cartão e metas juntos, guardados só no seu celular. Veja como funciona em menos de um minuto.",
    cta: "Mostrar como funciona",
  },
  {
    kicker: "Contas e dinheiro",
    titulo: "De onde sai o seu dinheiro",
    texto: "Cada conta do banco e o dinheiro da carteira viram um cartão. Toda compra sai de um deles.",
    cta: "Próximo",
    bentos: [
      { rotulo: "Saldo nas contas", antes: saldoContas },
      { rotulo: "Gastos do mês", antes: VALORES.gastosMes },
    ],
    legenda: "Pagou um café no débito? O gasto do mês sobe e o saldo da conta desce.",
  },
  {
    kicker: "Cartão de crédito",
    titulo: "O que você deve",
    texto: "A fatura do cartão é o quanto você já gastou e ainda vai pagar.",
    cta: "Próximo",
    simula: true,
    bentos: [
      { rotulo: "Fatura do cartão", antes: VALORES.cartaoAntes, depois: faturaDepois, pilula: { texto: "+R$ 62,30", tipo: "sobe" } },
      { rotulo: "Saldo nas contas", antes: saldoContas, depois: saldoContas, pilula: { texto: "Sem alteração", tipo: "neutro" } },
    ],
    legenda: "Mercado no cartão entra na fatura hoje. O dinheiro da conta só sai quando você paga.",
  },
  {
    kicker: "Metas",
    titulo: "Cofrinhos para seus planos",
    texto: "Dê um objetivo para cada meta e anote o quanto já separou.",
    cta: "Próximo",
    simula: true,
    bentos: [
      { rotulo: "Guardado na meta", antes: 0, depois: VALORES.metaDeposito, pilula: { texto: "+R$ 50,00", tipo: "sobe" } },
      { rotulo: "Falta", antes: VALORES.metaAlvo, depois: VALORES.metaAlvo - VALORES.metaDeposito, pilula: { texto: "−R$ 50,00", tipo: "desce" } },
    ],
    legenda: "Você anota o que separou e o Solis mostra quanto falta para chegar lá.",
  },
  {
    kicker: "As regras",
    titulo: "Como o Solis conta",
    texto: "",
    cta: "Montar meu perfil",
  },
];

export const SOBRA = saldoContas - faturaDepois;
export const SOBRA_ROTULO = "Sobra de verdade";

export const REGRAS: { icone: NomeIcone; cor: string; titulo: string; tags: { t: string; tipo: "sobe" | "desce" | "neutro" }[] }[] = [
  { icone: "shopping-cart", cor: "#2F5DA8", titulo: "Compra no débito, Pix ou dinheiro", tags: [{ t: "Gastos do mês", tipo: "sobe" }, { t: "Saldo", tipo: "desce" }] },
  { icone: "credit-card", cor: "#5B6B7E", titulo: "Compra no cartão", tags: [{ t: "Fatura", tipo: "sobe" }, { t: "Saldo igual", tipo: "neutro" }] },
  { icone: "wallet", cor: "#2E7D52", titulo: "Salário ou dinheiro que entra", tags: [{ t: "Saldo", tipo: "sobe" }] },
  { icone: "coins", cor: "#C0702A", titulo: "Guardar numa meta", tags: [{ t: "Meta", tipo: "sobe" }, { t: "Só anotação", tipo: "neutro" }] },
];

export const NOTA_REGRAS = "A sobra é o saldo das contas menos a fatura do cartão. É o que dá para usar sem se enrolar.";

export const CONTA_INICIAL = {
  kicker: "Último passo",
  titulo: "Sua primeira conta",
  texto: "Comece pela conta que você mais usa. Dá para adicionar as outras depois.",
  tipos: [
    { v: "corrente" as const, t: "Banco", sub: "Conta bancária", variante: "fantastic" as Variante, icone: "bank" as NomeIcone, cor: CARDS.banco.cor, exemplo: "Ex.: Nubank, Caixa" },
    { v: "poupanca" as const, t: "Reserva", sub: "Reserva", variante: "truffle" as Variante, icone: "piggy-bank" as NomeIcone, cor: "#7A5AA6", exemplo: "Ex.: Poupança Caixa" },
    { v: "dinheiro" as const, t: "Carteira", sub: "Dinheiro vivo", variante: "musgo" as Variante, icone: "money-bill-wave" as NomeIcone, cor: CARDS.dinheiro.cor, exemplo: "Ex.: Carteira" },
  ],
  nota: "O saldo pode ser aproximado. Você corrige quando quiser.",
  cta: "Concluir",
  pular: "Fazer depois",
};

export const PRONTO = {
  kicker: "Tudo certo",
  titulo: "Tudo pronto!",
  texto: "Seu Solis está montado do seu jeito. Agora é só usar, um dia de cada vez.",
  selo: "Conta ativa",
  seloSemConta: "Tudo certo",
  cta: "Começar agora",
};

export const SETUP_ROTULOS = {
  cartaoPerfil: (apelido: string) => (apelido ? `Carteira de ${apelido}` : "Sua carteira"),
  subPerfil: "Carteira Solis",
  subSenha: "Protegida por senha",
  titularVazio: "Seu nome",
};
