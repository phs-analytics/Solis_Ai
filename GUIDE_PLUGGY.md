# Conectar seus bancos com o Meu Pluggy

O Solis pode buscar saldos e lançamentos dos seus bancos de forma automática, usando a sua **conta gratuita do Meu Pluggy** (uso pessoal da Pluggy). Isso é **opcional**: sem isso, o Solis funciona normalmente com lançamentos manuais e importação de OFX/CSV.

## Como funciona

```
Seu banco ──Open Finance──▶ Meu Pluggy ──API (HTTPS)──▶ Solis no seu celular ──▶ banco cifrado (SQLCipher)
```

- Você conecta seus bancos **no site do Meu Pluggy**, não no Solis. O Solis nunca vê a senha do seu banco.
- O Solis chama `https://api.pluggy.ai` **direto do seu celular**. Não existe servidor do Solis no meio.
- Saldos e lançamentos são gravados só no seu aparelho, no banco cifrado com a sua senha.
- O Meu Pluggy atualiza seus bancos **uma vez a cada 24 horas**. Ao abrir, o Solis busca o que há de novo, no máximo uma vez por dia; o botão "Buscar agora" força uma busca.

## Antes de começar: o que a Pluggy vê

Leia a [política da Pluggy](https://www.pluggy.ai/legal). Em resumo, com base nela:

- A Pluggy **recebe e guarda** os dados dos bancos que você conectar (saldos, extratos, investimentos) e dados de cadastro.
- Ela pode usar **parceiros** para coletar e processar dados, e os dados podem ser guardados **fora do Brasil**.
- A exclusão a pedido leva cerca de 15 dias, com exceções (ordem judicial, uso interno anonimizado).

Se isso não serve para você, use a importação de OFX/CSV: nada passa por terceiros.

## Passo a passo

### 1. Criar a conta no Meu Pluggy
Acesse o [Meu Pluggy](https://www.pluggy.ai/meu-pluggy) e crie sua conta gratuita. O plano pessoal permite até 5 conexões.

### 2. Conectar seus bancos
No Meu Pluggy, conecte cada banco. A autorização acontece no app do próprio banco, pelo Open Finance. Você pode revogar quando quiser, pelo banco ou pelo Meu Pluggy.

### 3. Gerar o Client ID e o Client Secret
Siga o [guia de API do Meu Pluggy](https://meu.pluggy.ai/api-guide) para criar suas credenciais no painel (Dashboard).

- O **Client Secret aparece uma vez só**. Cole direto no Solis ou num gerenciador de senhas.
- Não existe "apiKey fixa": a chave da API vale 2 horas. Por isso o Solis guarda o Client ID e o Secret e gera a chave quando precisa.

### 4. Copiar o itemId de cada banco
Cada banco conectado tem um **itemId**. Ele aparece no painel, na lista de itens conectados (veja o [guia de uso pessoal](https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use)). O Meu Pluggy **não permite** listar itens pela API, então é preciso copiar à mão.

Se você reautorizar um banco, o itemId pode mudar. Aí é só atualizar no Solis.

### 5. Colar no Solis
No app: **Mais → Conexão bancária (Meu Pluggy)**.

1. Cole o **Client ID** e o **Client Secret**.
2. Cole os **itemIds**, um por linha.
3. Toque em **Testar e salvar**. O Solis testa as credenciais e cada item antes de salvar, e já faz a primeira busca (últimos 90 dias).

Pronto. A cada abertura do app (se passou 24h), o Solis busca os lançamentos novos.

## Segurança

| O quê | Onde fica |
|---|---|
| Client ID, Client Secret e itemIds | Armazenamento seguro do Android (Keystore), só neste aparelho |
| Saldos e lançamentos | Banco SQLCipher (AES-256) cifrado com a sua senha |
| Senha do banco | Nunca passa pelo Solis |

- O Client Secret dá acesso de leitura a **todas** as contas que você conectou. Não mande para ninguém e não coloque em capturas de tela ou issues.
- Perdeu o celular? Gere um novo Secret no painel do Meu Pluggy; o antigo deixa de valer.
- **Desconectar** no Solis apaga as credenciais do aparelho. Os lançamentos já baixados continuam no app.

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| "Client ID ou Client Secret inválidos" | Gere um novo Secret no painel e cole de novo. |
| "Item não encontrado" | Confira o itemId; ele pode ter mudado depois de reautorizar o banco. |
| "Muitas requisições" | Espere 1 minuto. |
| Nada novo depois de "Buscar agora" | O Meu Pluggy só atualiza a cada 24h. |

## Limites desta integração

- Lançamentos **pendentes** não entram; aparecem quando forem confirmados.
- Cartão de crédito entra como uma conta com saldo negativo (o valor usado).
- Não há busca em segundo plano com o app fechado.
- Feito para **uso pessoal**. Uso comercial da API exige plano pago da Pluggy.
