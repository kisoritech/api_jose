# API Testing Guide - PostgreSQL

Todos os exemplos abaixo consideram a API rodando em:

```text
http://localhost:3000
```

Base publicada atual:

```text
https://api-jose-jhbt.onrender.com
```

## Autenticacao

### 1. Registrar novo usuario

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Joao Silva",
    "email": "joao@example.com",
    "password": "123456",
    "perfil": "vendedor"
  }'
```

### 2. Fazer login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "123456"
  }'
```

### 3. Consultar usuario autenticado

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## Clientes

### Listar todos

```bash
curl -X GET http://localhost:3000/api/clientes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Buscar por ID

```bash
curl -X GET http://localhost:3000/api/clientes/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Criar cliente

```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Empresa XYZ",
    "tipo_pessoa": "juridica",
    "email": "contato@xyz.com",
    "telefone": "11987654321"
  }'
```

### Atualizar cliente

```bash
curl -X PUT http://localhost:3000/api/clientes/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@email.com",
    "telefone": "11999999999"
  }'
```

### Deletar cliente

```bash
curl -X DELETE http://localhost:3000/api/clientes/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## Produtos

### Listar todos

```bash
curl -X GET http://localhost:3000/api/produtos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Buscar por ID

```bash
curl -X GET http://localhost:3000/api/produtos/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Criar produto

```bash
curl -X POST http://localhost:3000/api/produtos \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Produto Teste",
    "preco_venda": 59.90,
    "preco_custo": 30.00,
    "quantidade": 10,
    "tipo": "ambos"
  }'
```

### Atualizar produto

```bash
curl -X PUT http://localhost:3000/api/produtos/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "preco_venda": 79.90,
    "quantidade": 15
  }'
```

---

## Vendas

### Criar venda

```bash
curl -X POST http://localhost:3000/api/vendas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 2,
    "data": "2026-03-27",
    "forma_pagamento": "Dinheiro",
    "frete_valor": "R$ 22,50",
    "itens": [
      {
        "produto_id": 1,
        "quantidade": 2,
        "valor_unitario": 10.5
      },
      {
        "produto_id": 3,
        "quantidade": 1,
        "valor_unitario": "59,90"
      }
    ]
  }'
```

### Listar vendas

```bash
curl -X GET http://localhost:3000/api/vendas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Buscar venda por ID

```bash
curl -X GET http://localhost:3000/api/vendas/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Venda legada

```bash
curl -X POST http://localhost:3000/salvar_venda \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": 2,
    "data": "2026-03-27",
    "forma_pagamento": "Dinheiro",
    "frete_valor": "R$ 12,00",
    "items": [
      {
        "produto": 1,
        "quantidade": 1,
        "valor": "10,00"
      }
    ]
  }'
```

---

## Locacoes

### Criar locacao

```bash
curl -X POST http://localhost:3000/api/locacoes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 4,
    "cliente_id": 2,
    "quantidade": 1,
    "valor_unitario": "200,00",
    "data_inicio": "2026-03-27T10:00:00Z",
    "data_prevista_devolucao": "2026-04-03T10:00:00Z",
    "observacao": "Locacao criada pela tela principal"
  }'
```

### Listar locacoes

```bash
curl -X GET http://localhost:3000/api/locacoes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Buscar locacao por ID

```bash
curl -X GET http://localhost:3000/api/locacoes/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## Checklist de Validacao

### 1. Banco

- rode `sql/schema_postgres.sql`
- rode `sql/migrations/2026-03-27_automacao_vendas_locacoes.sql`
- confirme se `transacoes` possui `cliente_id`, `origem` e `referencia_id`
- confirme se existem dados em `usuarios`, `clientes` e `produtos`

### 2. API

- faca login e obtenha um token JWT valido
- teste `GET /api/clientes`
- teste `GET /api/produtos`
- teste `POST /api/vendas`
- teste `POST /api/locacoes`
- teste `GET /api/dashboard/resumo`
- teste `GET /api/dashboard/movimentacao-geral`
- teste `GET /api/dashboard/resumo-operacional`
- teste `GET /api/dashboard/financeiro-completo`
- teste `GET /api/dashboard/produtos-relatorio`
- teste `GET /api/dashboard/vendas-relatorio`
- teste `GET /api/dashboard/locacoes-relatorio`
- teste `GET /api/dashboard/auditoria-integracao`

### 3. Pos-gravacao no banco

- apos venda, confira `vendas`, `venda_itens`, `transacoes` e `financeiro_clientes`
- apos locacao, confira `locacoes`, `locacao_itens`, `transacoes` e `financeiro_clientes`
- confira se o estoque foi reduzido apenas uma vez por operacao
- confira se nao houve duplicidade em `financeiro_clientes`

---

## Payloads Prontos

### Venda completa

```json
{
  "cliente_id": 2,
  "data": "2026-03-27",
  "forma_pagamento": "Dinheiro",
  "frete_valor": "R$ 22,50",
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 2,
      "valor_unitario": 10.5
    },
    {
      "produto_id": 3,
      "quantidade": 1,
      "valor_unitario": "59,90"
    }
  ]
}
```

### Venda legada

```json
{
  "cliente": 2,
  "data": "2026-03-27",
  "forma_pagamento": "Dinheiro",
  "frete_valor": "R$ 12,00",
  "items": [
    {
      "produto": 1,
      "quantidade": 1,
      "valor": "10,00"
    }
  ]
}
```

### Locacao completa

```json
{
  "produto_id": 4,
  "cliente_id": 2,
  "quantidade": 1,
  "valor_unitario": "200,00",
  "data_inicio": "2026-03-27T10:00:00Z",
  "data_prevista_devolucao": "2026-04-03T10:00:00Z",
  "observacao": "Locacao criada pela tela principal"
}
```

---

## Dashboard

### Endpoints principais

```bash
curl -X GET http://localhost:3000/api/dashboard/resumo \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/movimentacao-geral \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/resumo-operacional \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/financeiro-origens \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Relatorios completos

```bash
curl -X GET http://localhost:3000/api/dashboard/financeiro-completo \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/produtos-relatorio \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/vendas-relatorio \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/locacoes-relatorio \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Auditoria de integracao

```bash
curl -X GET http://localhost:3000/api/dashboard/auditoria-integracao \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Sugestao de consumo no front

- use `resumo-operacional` para cards principais
- use `movimentacao-geral` para timeline unica de vendas, locacoes e transacoes
- use `financeiro-origens` para grafico de pendencias por origem
- use `financeiro-completo` para relatorio financeiro administrativo
- use `produtos-relatorio` para status de estoque e desempenho por produto
- use `vendas-relatorio` para ticket medio e acompanhamento comercial
- use `locacoes-relatorio` para status e atrasos de locacao
- use `auditoria-integracao` em tela administrativa para detectar falhas

---

## Consultas SQL de Conferencia

```sql
SELECT * FROM vendas ORDER BY id DESC LIMIT 5;
SELECT * FROM venda_itens ORDER BY id DESC LIMIT 10;
SELECT * FROM locacoes ORDER BY id DESC LIMIT 5;
SELECT * FROM locacao_itens ORDER BY id DESC LIMIT 10;
SELECT * FROM transacoes ORDER BY id DESC LIMIT 20;
SELECT * FROM financeiro_clientes ORDER BY id DESC LIMIT 20;
```

### Auditoria SQL direta

```bash
psql -U seu_usuario -d seu_banco -f sql/checks/auditoria_integracao.sql
```

---

## Dados de Teste Rapidos

Para popular o banco automaticamente com dados de teste:

```bash
npm run seed
```

Isso cria:

- 4 usuarios de teste
- 3 clientes
- 4 produtos
- 1 venda com 2 itens
- 1 locacao

Login de teste:

- Email: `admin@sistema.com`
- Senha: `123456`

---

## Health Check

```bash
curl -X GET http://localhost:3000/health
```

Resposta:

```json
{
  "status": "OK"
}
```
