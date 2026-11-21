# Perfil do investidor no Solis: proposta de ajuste

> Documento de trabalho (21/11/2026). Nada aqui está implementado ainda. Serve de base para ajustar
> `packages/core/src/perfil.ts`, o passo "Você e o dinheiro" do Onboarding e o contexto da Solis AI.

## 1. Limite legal (vale para tudo abaixo)

- O Solis **não é** instituição distribuidora nem consultor autorizado pela CVM. Indicar "compre X" ou
  "coloque 30% em Y" é consultoria de valores mobiliários (atividade regulada). **A Solis AI nunca faz isso.**
- O perfil do Solis é **informativo**: ajuda a pessoa a se entender e a conversar com o banco/corretora,
  que farão o suitability oficial (Resolução CVM 30/2021).
- O aviso "Isto não é recomendação de investimento" aparece em toda tela e resposta que fale de investimento.

O que a IA **pode** fazer: explicar conceitos, mostrar números da própria pessoa, comparar o perfil com
características gerais de **classes** de produto (liquidez, risco, garantia do FGC), apontar pré-requisitos
(reserva de emergência, dívidas caras) e sugerir perguntas para levar ao banco.
O que **não pode**: citar ativo, fundo, ticker ou percentual de alocação como sugestão.

## 2. O que as regras de mercado usam

| Fonte | O que exige / indica |
|---|---|
| Resolução CVM 30/2021 | Perfil considera **objetivos** (prazo, finalidade, tolerância a risco), **situação financeira** (renda, patrimônio, necessidade de liquidez) e **conhecimento** (formação, experiência com produtos). |
| Código de Distribuição ANBIMA (vigente desde 05/05/2023) | Mínimo de 3 perfis: conservador, moderado, arrojado. Conservador = baixa tolerância a risco **+ necessidade de liquidez + baixo conhecimento**. Régua de risco de produto: tetos 1,5 / 3 / 5. Instituição pode ser mais rígida, nunca mais frouxa. |
| Estudo CVM sobre a eficácia da CVM 30 (2025) | Norma funciona, mas abaixo do potencial; sugere incluir **complexidade** do produto na análise. |
| Pesquisa acadêmica (Grable; Nobre & Grable 2015; JFP 2012) | Separar **três coisas**: *capacidade* (quanto a pessoa aguenta perder sem afetar a vida), *tolerância* (quanto ela aceita emocionalmente) e *necessidade* (quanto risco o objetivo exige). Perguntas sobre **aversão a perda** preveem melhor o comportamento real do que autoavaliação ("eu me acho arrojado"). |

## 3. Problemas do cálculo atual (`classificarInvestidor`)

1. Mede só tolerância (reação à queda), experiência e objetivo. **Ignora capacidade**: renda, reserva, dívidas,
   estabilidade do trabalho, dependentes. Para o público do Solis (baixa renda), a capacidade é o fator que mais pesa.
2. Experiência conta só o maior item marcado; "já comprei cripto uma vez" vira 2 pontos, igual a anos de ações.
3. A pergunta de queda usa "10% num mês" sem valor em reais; pessoas com pouca familiaridade com porcentagem respondem pior.
4. Não há validade: o perfil não expira.

## 4. Modelo proposto: 3 eixos, o menor manda

Cada eixo dá uma nota de 0 a 2 (0 = conservador, 1 = moderado, 2 = arrojado).
**O perfil final é o menor dos três** (mesma lógica da ANBIMA: na dúvida, mais protetor).

### Eixo A: capacidade (dados objetivos, a maioria já existe no app)

| Pergunta / dado | Pontua para baixo (0) quando |
|---|---|
| Reserva de emergência | Menos de 3 meses de gastos guardados (calculável pelo app se houver lançamentos) |
| Dívidas caras | Tem cartão rotativo, cheque especial ou atraso ("Estou com dívidas" no passo 4) |
| Estabilidade da renda | "Varia muito todo mês", bicos ou apps sem outra fonte |
| Quando vai precisar do dinheiro | Em menos de 1 ano |
| Dependentes | Sustenta outras pessoas e não tem reserva |

Regra dura: **sem reserva ou com dívida cara → eixo A = 0**, e a IA prioriza esses dois temas antes de falar de investimento.

### Eixo B: tolerância (aversão a perda, com valores em reais)

Trocar a pergunta atual por cenários concretos, calculados sobre um valor redondo (ex.: R$ 1.000):

1. "Você guardou R$ 1.000. Um mês depois, ele vale R$ 900. O que você faz?"
   → tiro tudo (0) · espero (1) · coloco mais (2)
2. "Qual dessas opções você prefere para daqui a 1 ano?"
   → R$ 1.100 garantido (0) · entre R$ 1.000 e R$ 1.250 (1) · entre R$ 850 e R$ 1.400 (2)
3. "Se perder dinheiro, você fica sem dormir?" → sim (0) · um pouco (1) · não (2)

Nota B = média arredondada para baixo.

### Eixo C: conhecimento

Em vez de só "já investi em", 2 perguntas curtas de compreensão (sem nota de corte vexatória, o resultado não é mostrado como prova):

1. "Um CDB tem garantia do FGC até quanto por banco?" (R$ 250 mil · não sei · não tem garantia)
2. "Uma ação pode valer menos do que você pagou?" (sim · não · não sei)

Mais experiência marcada: soma **quantos** tipos a pessoa usou, não o máximo. Nota C: 0 = nenhuma resposta certa e só poupança; 2 = acertou ambas e usou renda variável; 1 = resto.

### Necessidade (não entra na nota, entra na conversa)

O objetivo financeiro e o prazo dizem **quanto risco o objetivo pede**. Se a necessidade for maior que o perfil
(ex.: quer aposentar em 10 anos com pouco guardado e perfil conservador), a IA **mostra o descompasso**
com números ("guardando R$ 200/mês a 10% ao ano, em 10 anos dá cerca de R$ 41 mil") e sugere conversar com
um profissional. Ela não empurra para mais risco.

### Validade

- Guardar `perfilCalculadoEm`. Após **12 meses**, a IA pede para refazer (corretoras usam até 24 meses; o Solis é mais curto porque renda de baixa renda muda rápido).
- Refazer também quando a capacidade muda muito (reserva zerou, dívida nova).

## 5. Como a Solis AI usa o perfil

Adicionar ao `ContextoFinanceiro` (`packages/dados/src/ia/analisador.ts`):

```ts
perfil: {
  final: "conservador" | "moderado" | "arrojado";
  eixos: { capacidade: 0 | 1 | 2; tolerancia: 0 | 1 | 2; conhecimento: 0 | 1 | 2 };
  temReserva: boolean;        // >= 3 meses de gastos
  temDividaCara: boolean;
  prazoObjetivoMeses?: number;
  calculadoEm: string;        // ISO
};
```

Ordem fixa de resposta quando o assunto é investimento:

1. **Pré-requisitos**: sem reserva → fala de reserva. Com dívida cara → fala de dívida. Para aqui se algum faltar.
2. **Explicar o perfil**: qual eixo puxou para baixo e por quê ("seu perfil ficou conservador porque a renda varia todo mês").
3. **Classes compatíveis, em termos gerais**: liquidez, risco, FGC, imposto. Ex.: para conservador, "produtos de renda fixa com liquidez diária e garantia do FGC costumam ter risco baixo". Sem nome de produto, banco ou ativo.
4. **Perguntas para levar ao banco**: "qual a liquidez?", "tem FGC?", "qual a taxa líquida de IR?".
5. **Aviso**: "Isto não é recomendação de investimento. Quem pode recomendar é um profissional autorizado pela CVM."

Bloqueios no prompt do modelo local (Etapa 8) e no motor de regras (Etapa 7):
- Recusar pedidos de "em que eu invisto?", "qual ação comprar?", "quanto ponho em cripto?" com a resposta padrão acima.
- Nunca citar ticker vindo da carteira como sugestão de compra/venda; pode mostrar o que a pessoa já tem.

## 6. Mudanças no código (para quando aprovar)

1. `packages/core/src/perfil.ts`: novos campos (`reserva`, `dividaCara`, `prazoObjetivo`, `cenarioPerda`, `preferenciaRetorno`, `sonoPerda`, `quizFgc`, `quizAcao`), `calcularEixos()` e `classificarInvestidor()` = mínimo dos eixos. Testes no Vitest cobrindo: sem reserva sempre conservador; dívida cara sempre conservador; menor eixo manda.
2. Onboarding passo 4 "Você e o dinheiro": trocar a pergunta dos 10% pelos cenários em reais e incluir as 2 perguntas de conhecimento (cabem em um 5º bloco curto ou no mesmo passo).
3. `analisador.ts` + `regras.ts`: incluir `perfil` no contexto e a ordem de resposta da seção 5.
4. Tela de investimentos: mostrar os 3 eixos e a data do perfil, com botão "Refazer".

## Fontes

- [Resolução CVM 30/2021 (texto)](https://www.legisweb.com.br/legislacao/?id=414074) e [versão oficial em inglês](https://www.gov.br/cvm/en/foreign-investors/regulation-files/RESOLUTIONCVM30_.pdf)
- [ANBIMA: novas regras de suitability (2023)](https://www.anbima.com.br/pt_br/institucional/comunicados-oficiais/circulares/integra/circular/nova-versao-do-codigo-de-distribuicao-avanca-na-padronizacao-das-praticas-de-suitibility/numero/2023-000005.htm)
- [ANBIMA: régua de pontuação dos perfis](https://www.anbima.com.br/pt_br/imprensa/suitability-novas-regras-da-anbima-para-definir-perfis-de-investidor-e-de-produtos-ja-estao-valendo.htm)
- [InfoMoney: o que muda para cada perfil](https://www.infomoney.com.br/onde-investir/que-investimentos-uma-corretora-pode-oferecer-ou-nao-a-cada-cliente-veja-mudancas-na-regra-de-suitability/)
- [Estudo da CVM sobre a eficácia da CVM 30 (Legismap)](https://legismap.com.br/conteudos/artigos-e-noticias/cvm-publica-estudo-sobre-o-processo-de-analise-do-perfil-do-investidor-suitability-e-a-eficacia-da-resolucao-cvm-30)
- [Grable, Financial Risk Tolerance (CFA Institute, 2017)](https://rpc.cfainstitute.org/research/foundation/2017/financial-risk-tolerance)
- [Journal of Financial Planning (2012): perguntas que melhor indicam alocação](https://financialplanningassociation.org/article/journal/MAY12-risk-tolerance-questions-best-determine-client-portfolio-allocation-preferences)

Pontos não confirmados no texto integral: os tetos 1,5 / 3 / 5 vêm de comunicados da ANBIMA de 2023; conferir no PDF atual do Código de Distribuição antes de usar como régua de produto.
