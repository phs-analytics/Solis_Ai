# Solis

[![Android](https://github.com/phs-analytics/Solis_Ai/actions/workflows/android.yml/badge.svg)](https://github.com/phs-analytics/Solis_Ai/actions/workflows/android.yml)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-Apache--2.0-blue)](LICENSE)

Organização de finanças para todos, pensada principalmente para pessoas de baixa renda e moradoras de periferias. O app cuida só de dinheiro: contas, gastos, cartões, orçamento e metas, em português do dia a dia e sem custo para quem usa.

## Privacidade

- Seus dados ficam no seu celular, num banco cifrado (SQLCipher) protegido por senha e, se quiser, biometria.
- Sem rastreadores, sem anúncios e sem analytics.
- A internet é usada só para dados públicos de mercado (Selic, CDI, IPCA). Cotações de ações só são buscadas se você ligar essa opção, e aí apenas os códigos dos ativos (ex.: PETR4) são enviados.
- A IA avançada é baixada uma vez e roda no aparelho. Suas perguntas não saem do celular.

Detalhes em [PRIVACY.md](PRIVACY.md) e [TERMS.md](TERMS.md).

## Solis AI

A Solis AI responde perguntas sobre os **seus próprios dados**, como "quanto posso gastar hoje?". Ela informa e analisa, mas não decide por você.

- **IA básica**: regras, funciona em qualquer celular.
- **IA avançada** (opcional): modelo Qwen2.5-1.5B rodando no aparelho, download de cerca de 1,1 GB.

> **Não é recomendação de investimento.** O Solis não indica onde investir. Esse tipo de orientação é atividade regulada pela CVM.

## Instalar (Android)

1. Baixe o `solis-vX.Y.Z.apk` e o `.sha256` na página de [Releases](https://github.com/phs-analytics/Solis_Ai/releases).
2. Confira se o arquivo não foi alterado: o SHA-256 do APK tem que ser igual ao do arquivo `.sha256`.
   ```bash
   sha256sum solis-vX.Y.Z.apk
   ```
3. Abra o APK no celular e permita a instalação de fontes desconhecidas quando o Android pedir.

Precisa de Android com processador 64-bit (praticamente todo celular vendido desde 2019).

## Status

Etapas 0 a 8 concluídas (cofre cifrado, finanças, importação OFX/CSV, investimentos, Solis AI). Em andamento: **Etapa 9, distribuição do APK assinado**. iPhone e versão web ficam para depois.

## Estrutura

```
packages/core/   regras de finanças puras, sem interface (com testes)
packages/dados/  cofre SQLCipher, repositórios e backup
apps/mobile/     app Android (Expo + React Native + TypeScript)
```

## Desenvolvimento

Precisa de Node.js e pnpm.

```bash
pnpm install        # na raiz
pnpm test           # testes
pnpm typecheck      # checagem de tipos em todos os pacotes
cd apps/mobile && npx expo run:android
```

O banco cifrado não funciona no Expo Go; use um build nativo. Para contribuir, veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença e segurança

Código sob a licença [Apache-2.0](LICENSE). Para relatar uma falha de segurança, veja [SECURITY.md](SECURITY.md).
