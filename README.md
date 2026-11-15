# Solis

Organização de finanças para todos, pensada principalmente para pessoas de baixa renda e moradoras de periferias. O app cuida só de dinheiro: contas, gastos, orçamento e metas, em português do dia a dia e sem custo para quem usa.

## Privacidade

- Seus dados ficam no seu celular, guardados em um banco cifrado.
- Nada é enviado para servidores de terceiros.
- No futuro, a internet será usada só para buscar dados públicos de mercado (como Selic e CDI). Os seus dados nunca saem do aparelho.

## Solis AI

A Solis AI responde perguntas sobre os **seus próprios dados**, como "quanto posso gastar hoje?". Ela informa e analisa, mas não decide por você.

> **Não é recomendação de investimento.** O Solis não indica onde investir. Esse tipo de orientação é atividade regulada pela CVM.

## Status

Em desenvolvimento, na **Etapa 0 (fundação)**. Por enquanto, só Android.

Próximos passos: dados e segurança (cofre cifrado e senha), a casca do app, e depois contas, lançamentos e orçamento.

## Estrutura

```
packages/core/   regras de finanças, sem interface (com testes)
apps/mobile/     app Android (Expo + React Native + TypeScript)
```

## Como rodar

Precisa de Node.js e pnpm.

```bash
pnpm install        # na raiz
pnpm test           # testes do packages/core
pnpm typecheck      # checagem de tipos em todos os pacotes
cd apps/mobile && npx expo start
```

O banco cifrado (SQLCipher) não funciona no Expo Go. Para testar, use um build nativo: `npx expo run:android`.

## Licença e segurança

Código sob a licença [Apache-2.0](LICENSE). Para relatar uma falha de segurança, veja [SECURITY.md](SECURITY.md).
