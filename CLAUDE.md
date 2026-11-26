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
| Commits | Autor `phs-analytics <336734781+phs-analytics@users.noreply.github.com>` (já configurado no git local). Mensagens em português. **Sem** linha `Co-Authored-By` (commits só no nome do Pedro). |

## Estado atual (Etapas 0–8 concluídas — 15/11/2026)

**Repositório:** `phs-analytics/Solis_Ai` (público, branch `main`).

Commits enviados (ordem cronológica):
- `b91cca9` — Fundação: monorepo, core com testes, app Expo, README
- `8181e33` — Autoteste do banco cifrado (SQLCipher)
- `ed4c860` — CI do Android: testes, APK e autoteste no emulador
- `b3f8e28` — CLAUDE.md atualizado (nome Solis_Ai)
- `5da104a` — mobile: expo run:android/ios nos scripts
- `a429eef` — Etapa 3: finanças 1 — contas, lançamentos e categorias
- `c68d8dc` — Etapa 4: finanças 2 — cartões, orçamento, recorrentes e metas
- `a16d987` — Etapa 5: importação OFX e CSV com detecção de duplicatas
- `2cb3dbe` — Etapa 6: investimentos e mercado
- `5373adb` — privacidade: brapi.dev requer consentimento explícito para cotações
- `c7f776d` — Etapa 7: Solis AI v1 — motor de regras e chat
- `28b6f07` — Etapa 8: Solis AI v2 — modelo local Qwen2.5-1.5B via llama.rn
- `3e5bafc` — ci: lockfile do llama.rn e Metro resolvendo imports .js para .ts

**CI (GitHub Actions):** falhou da Etapa 6 à 8 (Metro não resolvia `./x.js` → `x.ts`; lockfile desatualizado). Corrigido em `3e5bafc` com `apps/mobile/metro.config.js`.

## Etapa 1 concluída (15/11/2026)

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

Commit: `757f1e6`.

## Etapas 3–6 concluídas (15/11/2026)

- **Etapa 3** (`a429eef`): contas, lançamentos CRUD, categorias, busca, visão mensal
- **Etapa 4** (`c68d8dc`): cartões/faturas/parcelas, orçamento, recorrentes, metas/cofrinhos
- **Etapa 5** (`a16d987`): parser OFX e CSV, detecção de duplicatas por hash, tela de importação
- **Etapa 6** (`2cb3dbe`): tabela `ativos` (schema v3), repositório de investimentos, APIs BCB/IBGE/brapi.dev, tela Investimentos com tabs Carteira/Mercado, disclaimer obrigatório
- **Fix privacidade** (`5373adb`): brapi.dev requer consentimento explícito (tickers = dado do usuário); PRIVACY.md atualizado

Testes: 43/43 passando (36 core + 7 dados). Typecheck: 100% verde.

## Etapa 7 concluída (15/11/2026)

Commit: `c7f776d`.

- `packages/core/src/ia/regras.ts` — motor de regras: 8 intenções (saldo, gastos, orçamento, metas, recorrentes, posso gastar, resumo, desconhecida), alertas automáticos
- `packages/core/src/ia/categorizacao.ts` — 30+ padrões padrão + aprendizado por correção (extrai primeiras 2 palavras significativas)
- `packages/dados/src/ia/analisador.ts` — monta `ContextoFinanceiro` a partir do banco SQLCipher
- `apps/mobile/src/screens/ChatSolis.tsx` — tela de chat: tela vazia com mascote, balões, 6 chips de sugestão, input com enviar
- `apps/mobile/src/navigation/index.tsx` — nova tab "Solis AI" (🌟) entre Metas e Invest.

Testes: 43/43 passando. Typecheck: 100% verde.

## Etapa 8 concluída (15/11/2026)

Commit: `28b6f07`.

- `llama.rn@0.13.0-rc.11` instalado; `pnpm-workspace.yaml` com `allowBuilds`; `app.json` com plugin llama.rn (enableOpenCL: false)
- `apps/mobile/src/ia/llm.ts` — download do modelo do HuggingFace (1.12 GB, `DownloadTask` com `AbortSignal`), `initLlama` com fallback automático para v1 em OOM ou modelo ausente
- `apps/mobile/src/screens/Mais.tsx` — bloco "Solis AI avançada": status, barra de progresso, botões Ativar/Remover
- `apps/mobile/src/screens/ChatSolis.tsx` — usa `gerarResposta()` (v2) quando modelo presente; badge "IA avançada / IA básica"; fallback transparente para v1
- Modelo: `Qwen/Qwen2.5-1.5B-Instruct-GGUF` Q4_K_M (Apache-2.0, 1.12 GB)
- **Pendente**: validar build nativo com llama.rn no CI; testar download e initLlama no emulador/dispositivo real

## Etapa 9: distribuição Android (em andamento, 17/11/2026)

- CI: `-PrnllamaVariants` limita o llama.rn a rnllama, v8, v8_2_dotprod, v8_2_dotprod_i8mm (+ x86_64 no emulador) e há cache do Gradle.
- Release: `git tag vX.Y.Z && git push origin vX.Y.Z` roda o job `release`, que gera um APK **só ARM 64-bit**, assina com `apksigner`, publica no GitHub Releases com o SHA-256. Antes de cada release, subir `android.versionCode` e `version` no `app.json`.
- Chave de release: gerada pelo Pedro, **nunca no Git** (`*.keystore`/`*.jks` no `.gitignore`), com backup fora do PC (pendrive + gerenciador de senhas). Perdeu a chave = não dá mais para atualizar o app instalado.
  ```bash
  keytool -genkeypair -v -keystore solis-release.keystore -alias solis -keyalg RSA -keysize 4096 -validity 10000
  ```
- Segredos do GitHub: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- Consentimento brapi.dev: chave "Buscar cotações online" em Mais (desligada por padrão, `solis_cotacoes_online_v1` no SecureStore); Investimentos só busca cotações se ligada.
- 18/11/2026: o app **nunca abria o banco** (Splash ia direto às abas e `useBanco()` quebrava; o autoteste do CI não abre telas). Ligado: Splash → Acesso (`ConfigurarAcesso` ou `Desbloquear`) → `entrar()` em `contexto/sessao.ts` → abas dentro do `BancoProvider`. Também ligados "+ Criar conta", "+" de lançamento, Importar extrato (seletor real) e Exportar backup.
- Tag com hífen (`v0.9.0-beta`) sai como pré-lançamento. O build leva ~49 min, quase tudo no passo "Build do APK" (C++ do llama.rn/SQLCipher).
- Pendente: testar no celular real o fluxo completo e a restauração; bloqueio por inatividade ainda não existe.

## Identidade visual
Paleta original do Solis (a das telas em `docs/telas-*.pdf`), claro e escuro seguindo o celular: claro Palladian `#EEE9DF` / Truffle `#A35139` / Abyssal `#1B2632`; escuro Abyssal `#1B2632` / Burning Flame `#FFB162` / Palladian `#EEE9DF`. Tokens só em `apps/mobile/src/theme/index.ts`; nenhuma cor fixa fora dele. Telas novas (Início em diante) usam `useTema()`: claro com fundo off-white `#F6F2EA` e cards brancos; escuro com fundo grafite `#0E0E13` e cards `#17171E`. Onboarding, desbloqueio, restaurar backup e criar senha ficam no visual clássico (`useTemaClassico()`, `temaClaro`/`temaEscuro`) e não mudam. Cores auxiliares neutras (`auxiliares`): preto `#000000`, branco `#FFFFFF`, off-white `#F6F2EA`. Cores de dados (receita, despesa, categorias) e de bancos seguem como semânticas.

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
10. **Levar dados para outro celular**: backup `.solis` (banco SQLCipher + salt) salvo onde a pessoa quiser (ex.: Drive pela tela de compartilhar); restauração no primeiro acesso, testando a senha antes de substituir. Sem servidor.
11. **Meu Pluggy (18/11/2026, decisão do Pedro, muda o escopo)**: o Solis vira ferramenta de **uso pessoal + portfólio**. Conexão bancária opcional via conta gratuita do Meu Pluggy de cada pessoa: Client ID/Secret/itemIds no SecureStore (`solis_pluggy_v1`), app chama `api.pluggy.ai` direto (`packages/core/src/pluggy`), grava no SQLCipher (`packages/dados/src/pluggy/sincronizar.ts`, schema v4 `externo_id`), no máximo 1x/24h ao abrir. Tutorial em `GUIDE_PLUGGY.md`. A Pluggy vê os dados bancários: isso é dito no app, no guia e no PRIVACY.md. `GET /transactions` antigo some em 31/12/2026; usamos `/v2/transactions`.

12. **Investimentos e mercado v2 (26/11/2026, v0.9.2)**: "Minha carteira" mostra só investimentos do Meu Pluggy (`GET /investments`, gravados em `ativos` com `externo_id`, schema v7); sem cadastro manual. "Mercado e taxas": Selic/CDI/IPCA, busca e "Em alta" pela brapi v2 (`/api/v2/tickers`, sem chave), favoritos em `configuracoes.mercado_favoritos`, histórico (`/api/v2/stocks/historical`) com chave pessoal opcional em Mais (`solis_brapi_v1`). "Em alta" é igual para todos (nunca pelo perfil: seria recomendação). Cotações online **ligadas por padrão** (desligar em Mais); PRIVACY.md atualizado. Metas: `externo_id` marca cofrinho do banco (sem Guardar/Retirar manual). Pop-out do banco na Início com Hoje/Semana/Mês (do calendário)/Últ. 6 meses e tipo do lançamento.
   - Pendente: validar no celular o formato real da resposta do histórico v2 (o parser aceita `results` ou `data`) e se o Meu Pluggy grátis devolve investimentos.

Futuro: iPhone e versão web.

## Decisões ainda abertas
- Etapa 8 (parcialmente resolvida): modelo escolhido = `Qwen2.5-1.5B-Instruct` Q4_K_M (Apache-2.0, 1.12 GB); distribuição = download sob demanda do HuggingFace; fallback = tenta initLlama, cai para v1 em OOM. Pendente: validar no emulador/dispositivo real; verificar se o CI do GitHub Actions consegue buildar com llama.rn.
- Etapa 10 decidida em 18/11/2026: sem servidor. Sync automático com Drive exigiria OAuth do Google; fica para depois, se pedirem. Pluggy: ver item 11.

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
