# Solis v3: contexto do projeto

> Leia isto antes de qualquer tarefa. Escrito em 15/11/2026, ao fim da sessão que criou o v3.

## O que é
App de **organização de finanças para todos**, com foco em pessoas de baixa renda e periféricas. **Só finanças** (agenda e saúde ficaram no v1, fora do Git). Linguagem simples, português do dia a dia, custo zero para quem usa, dados da pessoa ficam no aparelho.

A **Solis AI** oferece informação e análise sobre os dados da própria pessoa. **Nunca recomenda investimento** (consultoria de valores mobiliários é atividade regulada pela CVM). O aviso "não é recomendação de investimento" aparece sempre que o assunto é investimento.

## Decisões já tomadas (pelo usuário)
| Tema | Decisão |
|---|---|
| Plataforma | **Expo (React Native) + TypeScript**, mobile primeiro. **Só Android agora**; iPhone depois (exige Apple Developer, US$ 99/ano). |
| Web | Futuro: acesso pelo navegador. A arquitetura já separa regras (`packages/core`) e dados da interface para isso. |
| Repositório | Novo **`phs-analytics/Solis_Ai`**, **criado e público em 15/11/2026**. O antigo `phs-analytics/solis` está **privado e arquivado**. |
| v1 | Pasta local do v1, fora deste repositório (Tauri + React, com agenda e saúde), **desligada do GitHub** (sem remote). Fonte de consulta para código e design. Não enviar nada dela. |
| Motor da IA | **Local no celular**: modelo pequeno (1–2 bi de parâmetros, via `llama.rn`, MIT) ajustado antes do lançamento para finanças de pessoas periféricas, mais memória dos dados da pessoa. Não se retreina o modelo no celular; o "aprender com a pessoa" é memória e modelos pequenos (ex.: categoria que aprende com correções). Internet só para dados de mercado por API; nunca enviar dados da pessoa. |
| Commits | Autor `phs-analytics <336734781+phs-analytics@users.noreply.github.com>` (já configurado no git local). Mensagens em português. Terminar com a linha `Co-Authored-By` indicada pelo Claude Code. |

## Estado atual (Etapa 0 concluída — 15/11/2026)

**Repositório:** `phs-analytics/Solis_Ai` (público, branch `main`).

Commits enviados:
- `b91cca9` — Fundação: monorepo, core com testes, app Expo, README
- `8181e33` — Autoteste do banco cifrado (SQLCipher)
- `ed4c860` — CI do Android: testes, APK e autoteste no emulador
- `b3f8e28` — CLAUDE.md atualizado (nome Solis_Ai)

**CI (GitHub Actions):** passou com 100% de sucesso — testes (16/16), typecheck, build do APK de release e autoteste do SQLCipher no emulador. Aviso não-bloqueante sobre migração do ubuntu-latest para Ubuntu 26.

- `5da104a` — mobile: expo run:android/ios nos scripts

**Etapa 0 fechada.**

## Etapa 1 em andamento (15/11/2026)

Arquivos criados:
- `PRIVACY.md` — política de privacidade (LGPD, dados locais, 13+, contato)
- `TERMS.md` — termos de uso (sem investimento, gratuito, sem dark patterns)
- `packages/dados/` — cofre SQLCipher: vault, keystore, schema, backup, testes
- `apps/mobile/src/screens/ConfigurarAcesso.tsx` — senha mestra + biometria

Conformidade legal incorporada (lista de 35 pontos do vídeo — aplicados ao Solis):
- Política de privacidade e termos de uso (pontos 1–2)
- Retenção de dados explícita: enquanto instalado (ponto 5)
- Exportar e apagar dados: `backup.ts` + `apagarTudo()` (ponto 12)
- Sem dados desnecessários: princípio do cofre local (ponto 18)
- Consentimento parental: 13+, menores com ciência dos pais (ponto 21)
- Registro de aceite dos termos: tabela `consentimento` no schema (ponto 22)
- IA local, nunca retreinada com dados do usuário (ponto 26)
- Auditoria de SDKs: sem rastreadores, sem analytics (ponto 28)
- Contato publicado na política (ponto 34)
- Pontos não aplicáveis documentados (cookies, e-mails, assinatura, uptime, cobranças)

Otimizações de performance (do segundo vídeo) — incorporadas às etapas futuras:
- **Etapa 2**: skeleton loading, lazy loading de imagens, virtualização de listas longas
- **Etapa 3+**: debounce em busca, paginação de resultados, requisições paralelas
- **Etapa 6**: timeout em APIs externas, sem chamadas duplicadas
- **Sempre**: remover dependências não usadas, testar em celular real e rede lenta

Testes: 18/18 passando (16 core + 2 vault). Typecheck: 100% verde.
Etapa 1 completa e enviada.

## Etapa 2 concluída (15/11/2026)

Arquivos criados/modificados:
- `apps/mobile/src/theme/index.ts` — tokens claro/escuro (cores, tipografia, espaçamento)
- `apps/mobile/src/components/SafeScreen.tsx` — wrapper área segura + status bar
- `apps/mobile/src/navigation/index.tsx` — stack raiz (Splash → App) + 4 bottom tabs
- `apps/mobile/src/screens/Splash.tsx` — tela de boas-vindas (gradiente escuro, logo, botões)
- `apps/mobile/src/screens/Home.tsx` — casca da home (saudação, saldo, placeholders)
- `apps/mobile/src/screens/Lancamentos.tsx` — casca placeholder
- `apps/mobile/src/screens/Metas.tsx` — casca placeholder
- `apps/mobile/src/screens/Mais.tsx` — menu (configurar acesso, backup, privacidade, sobre)
- `apps/mobile/App.tsx` — wired ao AppNavigator

Dependências adicionadas: `@react-navigation/native`, `@react-navigation/bottom-tabs`,
`@react-navigation/native-stack`, `react-native-screens`.

Commit: `757f1e6`. Falta: push e CI.

## Estrutura
```
Solis_V3/
  packages/core/      regras de finanças puras (sem interface); testes em test/
  apps/mobile/        app Expo (Android); leia apps/mobile/AGENTS.md
  CLAUDE.md, LICENSE (Apache-2.0), SECURITY.md, .prettierrc.json, .gitignore
```
Planejado: `packages/ia` (Solis AI), `apps/web` (futuro).
`packages/dados` já existe (Etapa 1).

## Etapas (aprovadas pelo usuário)
0. **Fundação**: monorepo, README, repositório, autoteste de banco cifrado; CI só após aprovação.
1. **Dados e segurança**: cofre SQLCipher, chave no armazenamento seguro do Android, senha forte + biometria opcional, bloqueio por tentativas e por inatividade, schema de finanças, backup cifrado.
2. **Casca do app**: navegação inferior, visual neo nativo (claro e escuro), área segura, acessibilidade (TalkBack).
3. **Finanças 1**: contas e saldos, lançamentos (CRUD, categorias, busca, 7/30/60 dias), visão geral do mês.
4. **Finanças 2**: cartões/faturas/parcelas, orçamento por categoria e "pode gastar hoje", recorrentes e previsão, cofrinhos/metas.
5. **Importação**: OFX e CSV com detecção de duplicados; regras de categorização.
6. **Investimentos e mercado**: registro manual, perfil do investidor, Selic/CDI/IPCA e cotações por API pública.
7. **Solis AI v1 (regras)**: perguntas sobre os dados, alertas, categorização que aprende. Roda em qualquer celular.
8. **Solis AI v2 (modelo no celular)**: `llama.rn`, ajuste fino prévio, memória da pessoa, checagem de RAM com volta para a v1.
9. **Distribuição Android**: APK assinado (chave fora do Git, com backup), testes em aparelhos simples.
10. **Opcional**: servidor de sincronização próprio e bancos via Pluggy.

Futuro: iPhone e versão web.

## Decisões ainda abertas
- Etapa 8: GPU para o ajuste fino (Colab/Kaggle grátis com limite, ou paga); licença do conteúdo de treino e do modelo (conferir antes de usar); celulares simples podem não ter os 2–3 GB de RAM livres.
- Etapa 10: onde roda o servidor; usar ou não a Pluggy.

## Referências analisadas (só ideias, sem copiar código AGPL)
| Projeto | Licença | Uso no Solis |
|---|---|---|
| we-promise/sure (Rails; app mobile em Flutter) | AGPL-3.0 | Ideias: chat sobre os próprios dados, categorização automática, regras, recorrentes, importação. **Não copiar código.** |
| shiyu-coder/Kronos (previsão de preços) | MIT | Fora do MVP (pesado, e previsão de preço se aproxima de recomendação). |
| Fincept-Corporation/FinceptTerminal (C++) | AGPL-3.0 | Ideias: painel de indicadores e lista de ativos acompanhados. **Não copiar código.** |
| HKUDS/Vibe-Trading (agente de trading) | MIT | Ideias de arquitetura de agente com ferramentas; diagnóstico de carteira como informação. Fora: ordens, backtest, estratégias. |

## Comandos
```bash
pnpm install                       # na raiz
pnpm test                          # Vitest do packages/core
pnpm typecheck                     # em todos os pacotes
cd apps/mobile && npx expo install <pacote>   # sempre assim no app (versões do SDK 58)
cd apps/mobile && npx expo start
```

## Cuidados (aprendidos no v1)
- **Expo muda a cada SDK**: não usar API de memória; ler o código do pacote instalado ou a doc da v58 (ver `apps/mobile/AGENTS.md`).
- **Windows + bash**: heredoc com crases e aspas costuma quebrar; para trechos com template strings, gravar um arquivo com a ferramenta de escrita e aplicar por script.
- **Build Android no Windows** falhou no v1 por OpenSSL/Perl; o APK era gerado no GitHub Actions. O emulador no CI (`reactivecircus/android-emulator-runner`) e o `adb logcat` foram o que acharam a tela cinza do v1.
- **CSP e WebView** não existem mais no v3 (é React Native), mas a área segura (barra de status e barra do sistema) precisa ser tratada desde a casca.
- O pnpm bloqueia pacotes publicados há menos de 1 dia (política de cadeia de suprimentos); não criar exceção sem perguntar.
- Antes de commitar: conferir `.gitignore`; nada de chaves, `.env`, keystore ou dados pessoais.
- Ações difíceis de desfazer ou públicas (push, criar repositório, mesclar PR, apagar histórico) só com confirmação do usuário.

## Sobre o usuário
- Responde em português; prefere ver o plano e aprovar antes de mudanças grandes (3+ arquivos).
- Testa no celular Android (base de layout: Galaxy S25, 360 × 780) e manda capturas com os problemas.
- Gosta de ver telas em moldura de celular nas capturas.
