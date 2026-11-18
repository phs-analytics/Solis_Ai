# Solis

[![Android](https://github.com/phs-analytics/Solis_Ai/actions/workflows/android.yml/badge.svg)](https://github.com/phs-analytics/Solis_Ai/actions/workflows/android.yml)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-Apache--2.0-blue)](LICENSE)

App Android de finanças pessoais **local-first**: seus dados ficam no seu celular, cifrados, e não existe servidor do Solis. É uma ferramenta de **uso pessoal** e um projeto de portfólio, em código aberto, que qualquer pessoa pode instalar e configurar para si.

Feito em português do dia a dia, pensando em quem mais precisa organizar o dinheiro: contas, gastos, cartões, orçamento e metas, sem custo.

## O que ele faz

- **Contas e lançamentos**: saldo, gastos por categoria, busca, visão do mês.
- **Cartões, orçamento, recorrentes e metas**.
- **Conexão bancária automática (opcional)** com a sua conta gratuita do [Meu Pluggy](https://www.pluggy.ai/meu-pluggy): saldos e lançamentos chegam sozinhos, uma vez por dia. Passo a passo em **[GUIDE_PLUGGY.md](GUIDE_PLUGGY.md)**.
- **Importação de OFX/CSV** para quem não quer usar a Pluggy.
- **Solis AI**: responde perguntas sobre os seus próprios dados, no próprio celular.
- **Backup `.solis`** cifrado para levar seus dados a outro celular.

## Arquitetura: cliente final, sem servidor

```
Banco ──Open Finance──▶ Meu Pluggy ──HTTPS──▶ Solis (celular) ──▶ SQLCipher (AES-256)
                                                  │
                                                  ├─ Keystore: Client ID/Secret, salt da senha
                                                  └─ IA local (llama.rn) + regras
```

- O app chama as APIs direto do celular e grava só no aparelho.
- As credenciais do Meu Pluggy ficam no armazenamento seguro do Android.
- A chave do banco é derivada da sua senha (PBKDF2, 600 mil iterações) e nunca é gravada.

## Privacidade

- Sem rastreadores, sem anúncios e sem analytics.
- Fora a Pluggy (se você ligar), a internet serve só para dados públicos de mercado (Selic, CDI, IPCA). Cotações de ações só com a sua permissão, e aí apenas os códigos (ex.: PETR4) são enviados.
- **Se você usar o Meu Pluggy, a Pluggy vê os dados dos bancos que você conectar por lá.** Leia a seção "o que a Pluggy vê" no [guia](GUIDE_PLUGGY.md).

Detalhes em [PRIVACY.md](PRIVACY.md) e [TERMS.md](TERMS.md).

## Solis AI

Informa e analisa os **seus** dados, como "quanto posso gastar hoje?".

- **IA básica**: regras, funciona em qualquer celular.
- **IA avançada** (opcional): modelo Qwen2.5-1.5B no aparelho, download de cerca de 1,1 GB.

> **Não é recomendação de investimento.** O Solis não indica onde investir; isso é atividade regulada pela CVM.

## Instalar (Android)

1. Baixe o `solis-vX.Y.Z.apk` e o `.sha256` em [Releases](https://github.com/phs-analytics/Solis_Ai/releases).
2. Confira o SHA-256:
   ```bash
   sha256sum solis-vX.Y.Z.apk
   ```
3. Abra o APK no celular e permita fontes desconhecidas quando o Android pedir.

Precisa de Android 64-bit (quase todo celular desde 2019).

## Status

Beta (`v0.9.0`). Pronto: cofre cifrado, finanças, importação OFX/CSV, investimentos, Solis AI, backup e conexão com o Meu Pluggy. Ainda não testado em muitos aparelhos. iPhone e web ficam para depois.

## Estrutura

```
packages/core/   regras puras e cliente da API Pluggy (com testes)
packages/dados/  cofre SQLCipher, repositórios, backup e sincronização
apps/mobile/     app Android (Expo + React Native + TypeScript)
```

## Desenvolvimento

Precisa de Node.js e pnpm.

```bash
pnpm install        # na raiz
pnpm test           # testes
pnpm typecheck      # tipos em todos os pacotes
cd apps/mobile && npx expo run:android
```

O banco cifrado não funciona no Expo Go; use um build nativo. Para contribuir, veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença e segurança

[Apache-2.0](LICENSE). Para relatar uma falha de segurança, veja [SECURITY.md](SECURITY.md).

Solis não é afiliado à Pluggy.
