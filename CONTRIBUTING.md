# Como contribuir

Obrigado pelo interesse no Solis!

## Antes de abrir uma issue ou PR

- **Nunca cole dados financeiros reais** (extratos, saldos, arquivos OFX/CSV seus) em issues, PRs ou capturas. Use dados inventados.
- Falhas de segurança vão por [SECURITY.md](SECURITY.md), não por issue pública.

## Ambiente

```bash
pnpm install
pnpm test
pnpm typecheck
cd apps/mobile && npx expo install <pacote>   # sempre assim no app, para casar com o SDK do Expo
```

## Regras do projeto

- **Dados ficam no aparelho.** Nada de analytics, rastreadores ou envio de dados da pessoa para servidores.
- **Sem recomendação de investimento.** A Solis AI informa sobre os dados da pessoa; não indica onde investir.
- **Linguagem simples**, em português do dia a dia, nos textos do app.
- **Não copie código de projetos AGPL** (ex.: we-promise/sure, FinceptTerminal). Ideias, sim; código, não.
- Regras de finanças vão em `packages/core` (sem interface, com teste). Acesso a banco em `packages/dados`.

## Commits e PRs

- Mensagens em português, curtas, no presente: `Etapa N: ...`, `ci: ...`, `docs: ...`, `fix: ...`.
- Antes de enviar: `pnpm test` e `pnpm typecheck` verdes.
- Nunca commite chaves, `.env`, keystore ou dados pessoais.
