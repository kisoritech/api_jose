# 🚀 API Node.js | Express + MySQL

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
- MySQL 5.7+

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/api.git
cd api

# 2. Instale as dependências
npm install

# 3. Crie o arquivo .env
cp .env.example .env

# 4. Configure o banco MySQL
mysql -u seu_usuario -p seu_banco < sql/schema.sql

# 5. Inicie em desenvolvimento
npm run dev
```

Servidor rodando em `http://localhost:3000`

---

## 🔐 Variáveis de Ambiente

Crie `.env` na raiz:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_USER=root
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
POST   /api/clientes          # Criar
PUT    /api/clientes/:id      # Atualizar
DELETE /api/clientes/:id      # Deletar
```

### Produtos

```bash
GET    /api/produtos          # Listar
GET    /api/produtos/:id      # Buscar
POST   /api/produtos          # Criar
PUT    /api/produtos/:id      # Atualizar
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

```
NODE_ENV=production

DB_HOST=seu_host.mysql.railway.app
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

**Opções recomendadas:**

- **Railway** (melhor custo): [railway.app](https://railway.app)
- **PlanetScale** (serverless): [planetscale.com](https://planetscale.com)
- **AWS RDS** (robusto): AWS Console

---

## 🧪 Testar Localmente

```bash
# Terminal 1
npm run dev

# Terminal 2
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "email": "teste@test.com",
    "password": "123456",
    "perfil": "vendedor"
  }'
```

---

## 🔒 Segurança em Produção

- ✅ **Helmet** - headers de segurança
- ✅ **Rate Limiting** - 100 req/15min por IP
- ✅ **CORS** - controle de origem
- ✅ **JWT** - autenticação stateless
- ✅ **bcrypt** - hash de senhas
- ✅ **SSL/TLS** - criptografia de banco

---

## 📊 Health Check

```bash
GET /health
# { "status": "OK" }
```

Configure no Render em **Health Check Path**: `/health`

---

## ❌ Troubleshooting

### Erro: ECONNREFUSED (banco não conecta)

```bash
# Verifica:
1. DB_HOST está correto?
2. DB_USER e DB_PASSWORD estão certas?
3. Firewall permite acesso?
4. Se externo, DB_SSL=true?
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
- [MySQL2/Promise](https://github.com/sidorares/node-mysql2)
- [Render Docs](https://render.com/docs)
- [JWT.io](https://jwt.io)

---

**Versão**: 1.0.0 | **Data**: 1 de março de 2026
