# API Testing Guide - PostgreSQL

Todos os exemplos trabalham com PostgreSQL conforme configurado em `.env`.

## 🔐 Autenticação

### 1. Registrar novo usuário

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "email": "joao@example.com",
    "password": "123456",
    "perfil": "vendedor"
  }'
```

**Resposta**:
```json
{
  "id": 1,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
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

**Resposta**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "joao@example.com",
    "perfil": "vendedor",
    "nome": "João Silva"
  }
}
```

### 3. Consultar usuário autenticado

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 👥 Clientes

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
    "telefone": "11987654321",
    "cidade": "São Paulo",
    "estado": "SP"
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

## 📦 Produtos

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
    "nome": "Notebook Dell",
    "descricao": "Notebook de alta performance",
    "preco_venda": 3500.00,
    "preco_custo": 2500.00,
    "estoque_atual": 10,
    "codigo_barras": "7890123456789",
    "tipo": "venda"
  }'
```

### Atualizar produto

```bash
curl -X PUT http://localhost:3000/api/produtos/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "preco_venda": 3999.00,
    "estoque_atual": 15
  }'
```

### Deletar produto

```bash
curl -X DELETE http://localhost:3000/api/produtos/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 💰 Vendas

### Criar venda (completa)

```bash
curl -X POST http://localhost:3000/api/vendas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": 1,
    "forma_pagamento": "pix",
    "frete_valor": 50.00,
    "itens": [
      {
        "produto_id": 1,
        "quantidade": 2,
        "valor_unitario": 3500.00
      },
      {
        "produto_id": 2,
        "quantidade": 5,
        "valor_unitario": 89.90
      }
    ]
  }'
```

**Resposta**:
```json
{
  "message": "Venda criada com sucesso",
  "vendaId": 123
}
```

---

## 🏠 Locações

### Criar locação

```bash
curl -X POST http://localhost:3000/api/locacoes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 4,
    "cliente_id": 2,
    "quantidade": 1,
    "valor_unitario": 200.00,
    "data_inicio": "2026-03-03T10:00:00Z",
    "data_prevista_devolucao": "2026-04-03T10:00:00Z"
  }'
```

### Listar locações

```bash
curl -X GET http://localhost:3000/api/locacoes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Buscar locação por ID

```bash
curl -X GET http://localhost:3000/api/locacoes/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## ✅ Checklist de Validação

### 1. Banco

- Rode o schema principal e depois a migration `sql/migrations/2026-03-27_automacao_vendas_locacoes.sql`
- Confirme se `transacoes` possui `cliente_id`, `origem` e `referencia_id`
- Confirme se as funções `fn_financeiro_venda`, `fn_financeiro_locacao`, `fn_before_insert_transacoes` e `fn_after_insert_transacoes` foram atualizadas
- Confirme se existem dados mínimos em `usuarios`, `clientes` e `produtos`

### 2. API

- Faça login e obtenha um token JWT válido
- Teste `GET /api/clientes` e `GET /api/produtos`
- Teste `POST /api/vendas`
- Teste `POST /api/locacoes`
- Depois valide `GET /api/dashboard/movimentacao-geral`
- Valide também `GET /api/dashboard/resumo-operacional`
- Confira se `GET /api/dashboard/financeiro-origens` retorna venda e locacao

### 3. Pós-gravação no banco

- Após venda, confira registros em `vendas`, `venda_itens`, `transacoes` e `financeiro_clientes`
- Após locação, confira registros em `locacoes`, `locacao_itens`, `transacoes` e `financeiro_clientes`
- Confira se o estoque foi reduzido apenas uma vez por operação
- Confira se não houve duplicidade em `financeiro_clientes`

---

## 🧪 Payloads Prontos

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

### Locação completa

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

### Consultas SQL de conferência

```sql
SELECT * FROM vendas ORDER BY id DESC LIMIT 5;
SELECT * FROM venda_itens ORDER BY id DESC LIMIT 10;
SELECT * FROM locacoes ORDER BY id DESC LIMIT 5;
SELECT * FROM locacao_itens ORDER BY id DESC LIMIT 10;
SELECT * FROM transacoes ORDER BY id DESC LIMIT 20;
SELECT * FROM financeiro_clientes ORDER BY id DESC LIMIT 20;
```

---

## 📊 Dashboard

### Endpoints novos para o front

```bash
curl -X GET http://localhost:3000/api/dashboard/movimentacao-geral \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/resumo-operacional \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/financeiro-origens \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

curl -X GET http://localhost:3000/api/dashboard/auditoria-integracao \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Sugestão de consumo no front

- Use `resumo-operacional` para cards principais
- Use `movimentacao-geral` para timeline única de vendas, locações e transações
- Use `financeiro-origens` para gráfico de pendências por origem
- Use `auditoria-integracao` em tela administrativa para detectar falhas de sincronização
- Continue usando `vendas-detalhadas`, `locacoes-ativas` e `financeiro-clientes` para tabelas detalhadas

### Auditoria SQL direta

```bash
psql -U seu_usuario -d seu_banco -f sql/checks/auditoria_integracao.sql
```

---

## 🧪 Dados de Teste Rápidos

Para popular o banco automaticamente com dados de teste:

```bash
npm run seed
```

Isso cria:
- 4 usuários de teste (admin, gerente, 2 vendedores)
- 3 clientes
- 4 produtos
- 1 venda com 2 itens
- 1 locação

**Login de teste**:
- Email: `admin@sistema.com`
- Senha: `123456`

---

## 📊 Health Check

```bash
curl -X GET http://localhost:3000/health
```

**Resposta**:
```json
{
  "status": "OK"
}
```

---

## 🔍 Configuração do Banco de Dados

### PostgreSQL

Configure em `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=sistema
DB_SSL=false
```

Depois:
```bash
npm run dev
```

---

## 🛠️ Tips para Debug

### Ver todas as requisições no console

```bash
# Ative morgan logging em src/app.js
# Já está configurado por padrão
npm run dev
```

### Checando status do banco

```bash
# PostgreSQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuarios;"
```

### Regenerando o schema

```bash
# PostgreSQL
psql $DATABASE_URL < sql/schema_postgres.sql
```

---

## 📚 Endpoints Completos

| Método | Endpoint | Autenticado | Descrição |
|--------|----------|:-----------:|-----------|
| POST | `/api/auth/register` | ❌ | Registrar usuário |
| POST | `/api/auth/login` | ❌ | Fazer login |
| GET | `/api/auth/me` | ✅ | Dados do usuário |
| GET | `/api/clientes` | ✅ | Listar clientes |
| GET | `/api/clientes/:id` | ✅ | Buscar cliente |
| POST | `/api/clientes` | ✅ | Criar cliente |
| PUT | `/api/clientes/:id` | ✅ | Atualizar cliente |
| DELETE | `/api/clientes/:id` | ✅ | Deletar cliente |
| GET | `/api/produtos` | ✅ | Listar produtos |
| GET | `/api/produtos/:id` | ✅ | Buscar produto |
| POST | `/api/produtos` | ✅ | Criar produto |
| PUT | `/api/produtos/:id` | ✅ | Atualizar produto |
| DELETE | `/api/produtos/:id` | ✅ | Deletar produto |
| POST | `/api/vendas` | ✅ | Criar venda |
| POST | `/api/locacoes` | ✅ | Criar locação |
| GET | `/health` | ❌ | Health check |

---

**Versão**: 1.0.0 | Date: 03/03/2026
