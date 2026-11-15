# Política de Privacidade — Solis

**Versão 1.0 — 15 de novembro de 2026**

## Resumo

O Solis é um app de organização financeira pessoal.
**Os seus dados ficam só no seu aparelho.** Não criamos conta, não enviamos nada para servidores nossos e não compartilhamos suas informações com terceiros.

---

## 1. Quem somos

Solis é desenvolvido por **phs-analytics** como projeto de código aberto.
Contato: `336734781+phs-analytics@users.noreply.github.com`
Repositório: <https://github.com/phs-analytics/Solis_Ai>

---

## 2. Dados que coletamos (e os que não coletamos)

### Dados que ficam só no seu aparelho

| Dado | Para quê |
|---|---|
| Contas, lançamentos e categorias que você cadastra | Funcionar o app |
| Configurações do app (tema, senha mestra) | Preferências pessoais |
| Data e hora em que você aceitou estes termos | Conformidade legal (LGPD art. 7º) |

### O que **não** coletamos

- Nome, CPF, e-mail, telefone ou qualquer dado de identificação.
- Localização, câmera, microfone ou contatos.
- Dados de uso, eventos de analytics ou logs de erro enviados para fora do aparelho.

**Princípio:** se não precisamos de um dado para o app funcionar, não pedimos.

---

## 3. Banco de dados cifrado

Todos os seus dados são armazenados em um banco SQLite cifrado com **SQLCipher** (AES-256).
A chave é derivada da sua senha mestra e guardada no **Android Keystore** do seu aparelho — um chip de segurança que impede a extração da chave mesmo com acesso físico ao aparelho.

---

## 4. Dados de mercado (a partir da Etapa 6 do desenvolvimento)

Para exibir cotações (Selic, CDI, IPCA, câmbio), o app consulta **APIs públicas do governo brasileiro** (Banco Central, Tesouro Nacional).
Essas requisições **não carregam nenhum dado pessoal** — são pedidos públicos, como acessar uma página de notícias.

---

## 5. Seus direitos (LGPD — Lei 13.709/2018)

| Direito | Como exercer |
|---|---|
| Acessar seus dados | Todos estão no app, visíveis para você |
| Exportar seus dados | Menu → Backup (exporta o banco cifrado) |
| Excluir seus dados | Menu → Configurações → Apagar todos os dados |
| Saber quais fornecedores processam seus dados | Nenhum: o app é offline |
| Revogar consentimento | Desinstale o app — os dados são apagados pelo Android |

---

## 6. Idade mínima

O Solis é indicado para maiores de **13 anos**.
Menores de 18 anos devem usar o app com ciência dos pais ou responsáveis.
Não coletamos dados que nos permitam identificar a idade do usuário.

---

## 7. Inteligência Artificial

A Solis AI roda **localmente no seu aparelho**.
- Nunca envia seus dados para servidores externos.
- Nunca retreina o modelo com seus dados sem sua permissão explícita.
- Todo conteúdo gerado pela IA é identificado como tal dentro do app.

---

## 8. Dependências de código aberto

O Solis usa bibliotecas de código aberto. As licenças são cumpridas e estão listadas em `LICENSES.md` no repositório.

---

## 9. Alterações nesta política

Mudanças serão publicadas no repositório e comunicadas dentro do app.
A data da versão em vigor fica registrada no seu aparelho junto com o momento em que você aceitou.

---

## 10. Contato

Dúvidas, solicitações de direitos ou reclamações de direitos autorais:
`336734781+phs-analytics@users.noreply.github.com`
