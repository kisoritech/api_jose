# 🚀 API Node.js | Express + PostgreSQL

Aplicação profissional pronta para produção com autenticação JWT, gestão de vendas, locações e estoque.

## 📋 Índice

- [Instalação Local](#instalação-local)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Deploy no Render](#deploy-no-render)
- [Troubleshooting](#troubleshooting)

---

## 🖥️ Instalação Local

### Pré-requisitos

- Node.js 18.x
- npm ou yarn
- PostgreSQL 12+

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/api.git
cd api

# 2. Instale as dependências
npm install

# 3. Crie o arquivo .env
cp .env.example .env

# 4. Configure o banco de dados PostgreSQL
psql -U seu_usuario -d seu_banco -f sql/schema_postgres.sql

# 5. Inicie em desenvolvimento
npm run dev
```

Servidor rodando em `http://localhost:3000`

---

## 🔐 Variáveis de Ambiente

Crie `.env` na raiz (copiando o arquivo de exemplo):

```bash
cp .env.example .env
```

**O aplicativo só lê `.env`**, o `.env.example` serve apenas como modelo.
Edite o `.env` com os valores desejados:

```env
NODE_ENV=development
PORT=3000

# Opção 1: Use DATABASE_URL (recomendado para Render)
# DATABASE_URL=postgres://user:password@host:5432/sistema

# Opção 2: Configure as variáveis individuais (para desenvolvimento local)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=sistema
DB_SSL=false

JWT_SECRET=supersegredo
JWT_EXPIRES_IN=8h
```

⚠️ **NUNCA commite `.env`** - Já está em `.gitignore`

---

## 📁 Estrutura

```
api/
├── src/
│   ├── config/database.js
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   ├── routes/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── sql/schema.sql
├── .env.example
├── .gitignore
├── render.yaml
├── package.json
└── README.md
```

---

## 🔌 API Endpoints

### ⚠️ Nota Importante sobre Parâmetros

- **Sempre envie um JSON válido** com `Content-Type: application/json`
- **Campos obrigatórios não podem ser `null` ou `undefined`**:
  - Produtos: `nome`, `preco_venda`
  - Clientes: `nome`
- **Campos opcionais** podem ser omitidos do request
- **Strings** são trimadas (espaços removidos)
- **Números** são convertidos para o tipo correto

---

### Autenticação

```bash
# Registrar
POST /api/auth/register
{
  "nome": "João",
  "email": "joao@example.com",
  "password": "123456",
  "perfil": "vendedor"  # admin, gerente, vendedor
}

# Login
POST /api/auth/login
{
  "email": "joao@example.com",
  "password": "123456"
}

> **Resposta** (token + dados):
> ```json
> {
>   "token": "eyJhbGciOiJIUzI1NiIs...",
>   "user": {
>     "id": 1,
>     "email": "joao@example.com",
>     "perfil": "vendedor",
>     "nome": "João"
>   }
> }
> ```

# Consultar usuário autenticado
GET /api/auth/me  (envia header Authorization: Bearer ...)

> **Nota**: se você adicionou usuários manualmente no banco com senha em texto
> simples, o endpoint de login irá detectar isso, rehash a senha e atualizar o
> registro automaticamente na primeira autenticação.
```

### Clientes

```bash
GET    /api/clientes          # Listar

GET    /api/clientes/:id      # Buscar

# Criar cliente (nome obrigatório)
POST   /api/clientes
{
  "nome": "Cliente Nome",
  "tipo_pessoa": "fisica",    # ou "juridica"
  "email": "cliente@example.com",
  "telefone": "+55 11 99999-9999"
}

# Atualizar cliente (qualquer campo é opcional)
PUT    /api/clientes/:id
{
  "nome": "Novo nome",
  "email": "novo@example.com"
}

DELETE /api/clientes/:id      # Deletar
```

### Produtos

```bash
GET    /api/produtos          # Listar
GET    /api/produtos/:id      # Buscar

# Criar produto (nome e preco_venda obrigatórios)
POST   /api/produtos
{
  "nome": "Produto Teste",
  "descricao": "Uma descrição",
  "preco_venda": 99.90,
  "estoque_atual": 50,
  "preco": 99.90          # alternativa ao preco_venda
  "estoque": 50           # alternativa ao estoque_atual
}

# Atualizar produto (qualquer campo é opcional)
PUT    /api/produtos/:id
{
  "nome": "Novo nome",
  "preco_venda": 149.90,
  "estoque_atual": 100
}

DELETE /api/produtos/:id      # Deletar
```

### Vendas

```bash
POST /api/vendas
{
  "cliente_id": 1,
  "forma_pagamento": "pix",
  "frete_valor": 10.50,
  "itens": [
    { "produto_id": 1, "quantidade": 2, "valor_unitario": 50 }
  ]
}
```

---

## 🚀 Deploy no Render

### Passo 1: GitHub

```bash
git init
git add .
git commit -m "API pronta para produção"
git branch -M main
git remote add origin https://github.com/seu-usuario/api.git
git push -u origin main
```

### Passo 2: Render Dashboard

1. [render.com](https://render.com) → **Dashboard**
2. **New** → **Web Service**
3. Conecte GitHub e selecione o repositório

### Passo 3: Configuração

| Campo | Valor |
|-------|-------|
| Name | api |
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | Free ou Starter |

### Passo 4: Environment Variables

Render fornece `DATABASE_URL` automaticamente para PostgreSQL. Configure no dashboard:

```
NODE_ENV=production

# Render fornece DATABASE_URL automaticamente, não precisa configurar DB_HOST, DB_USER, etc.

JWT_SECRET=secret_super_seguro
JWT_EXPIRES_IN=8h
```

Se preferir configurar as variáveis individuais:

```
NODE_ENV=production

DB_HOST=seu_host.postgres.render.com
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=sistema
DB_SSL=true

JWT_SECRET=secret_super_seguro
JWT_EXPIRES_IN=8h
```

### Passo 5: Deploy

Clique em **Create Web Service** - Render fará o deploy automaticamente!

---

## 🛢️ Banco de Dados em Produção

**Opção recomendada:**

- **PostgreSQL no Render** (recomendado): nativo, fácil de configurar e provê `DATABASE_URL` automaticamente

Ver [RENDER_DEPLOY_GUIDE.md](RENDER_DEPLOY_GUIDE.md) para instruções detalhadas.

---

## 🧪 Testar Localmente

### Modo desenvolvimento

```bash
# Terminal 1
npm run dev

# Terminal 2 - registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "email": "teste@test.com",
    "password": "123456",
    "perfil": "vendedor"
  }'
```

### Popular com dados de teste

```bash
npm run seed
```

Isso cria usuários, clientes, produtos e vendas de exemplo para facilitar testes.

---

## 🏗️ Estrutura de Banco de Dados

A API utiliza **PostgreSQL** como banco de dados. O arquivo `src/config/database.js` implementa:

- **Conexão via DATABASE_URL** (fornecido por Render) ou via variáveis individuais (desenvolvimento local)
- **Placeholders**: Converte automaticamente `?` para `$1,$2...` (formato PostgreSQL)
- **Insert IDs**: Normaliza com `RETURNING id` (PostgreSQL) via helper `getInsertedId()`
- **Transações**: Suporte completo via `pool.getConnection()`

Veja `src/utils/dbUtils.js` para detalhes.

---

## 🔒 Segurança em Produção

- ✅ **Helmet** - headers de segurança
- ✅ **Rate Limiting** - 100 req/15min por IP
- ✅ **CORS** - controle de origem
- ✅ **JWT** - autenticação stateless
- ✅ **bcrypt** - hash de senhas (com 8 rounds)
- ✅ **SSL/TLS** - criptografia de transporte
- ✅ **Triggers & Functions** - lógica de negócio no banco

---

## 📊 Health Check

```bash
GET /health
# { "status": "OK" }
```

Configure no Render em **Settings** → **Health Check** → **Path**: `/health`

---

## 📋 Schema e Estrutura de Dados

### PostgreSQL
`sql/schema_postgres.sql` - Schema completo para PostgreSQL com:
- Enums (tipos customizados)
- BIGSERIAL para IDs
- Funções plpgsql
- Triggers automáticos para:
  - Validação de estoque em vendas e locações
  - Atualização automática de saldos
  - Logs de auditoria
  - Prorrogações de locação

### Views Disponíveis

- `vw_estoque_resumo` - Status de estoque (esgotado/baixo/normal)
- `vw_vendas_detalhadas` - Vendas com cliente e vendedor
- `vw_venda_itens_margem` - Margem de lucro por item
- `vw_locacoes_ativas` - Locações vigentes com dias de atraso
- `vw_financeiro_clientes` - Resumo financeiro por cliente
- `vw_dashboard_resumo` - KPIs principais
- `vw_produtos_mais_vendidos` - Ranking de produtos
- `vw_cliente_historico` - Histórico de compras por cliente

---

## ❌ Troubleshooting

### Erro: "Bind parameters must not contain undefined"

Você não enviou um parâmetro obrigatório ou enviou em `undefined`.

**Solução**: Verifique os campos obrigatórios:
- **Produtos**: `nome` e `preco_venda` são obrigatórios
- **Clientes**: `nome` é obrigatório

Exemplo correto:
```bash
curl -X POST http://localhost:3000/api/produtos \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Produto Teste",
    "preco_venda": 99.90,
    "estoque_atual": 50
  }'
```

### Erro: ECONNREFUSED (banco não conecta)

```bash
# Verifique:
1. DATABASE_URL está formatada corretamente (postgres://user:pass@host:port/db)?
2. Ou DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME estão corretos?
3. Firewall permite acesso à porta 5432?
4. DB_SSL=true se usar SSL/TLS?
5. PostgreSQL está rodando?
```

### Erro: "Port is already in use"

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000 && kill -9 <PID>
```

### Erro: "JWT malformed"

Faça login novamente para gerar novo token.

---

## 📚 Documentação

- [Express.js](https://expressjs.com)
- [node-postgres (pg)](https://node-postgres.com/)
- [Render Docs](https://render.com/docs)
- [JWT.io](https://jwt.io)

---

**Versão**: 1.0.0 | **Data**: 1 de março de 2026
