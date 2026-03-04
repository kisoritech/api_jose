# 🚀 Guia de Deploy no Render (PostgreSQL)

Esta API utiliza **PostgreSQL** como banco de dados. Este guia explica como fazer deploy no **Render**.

## 📋 Pré-requisitos

- Conta em [render.com](https://render.com)
- Repositório GitHub com o código da API

---

## 🔧 Deploy com PostgreSQL no Render

PostgreSQL é nativo no Render e muito fácil de configurar.

### Passo 1: Criar um PostgreSQL Database no Render

1. Acesse [render.com](https://render.com) → **Dashboard**
2. Clique em **New +** → **PostgreSQL**
3. Preencha:
   - **Name**: `sistema-db` (ou seu nome)
   - **Database**: `sistema`
   - **User**: `postgres`
   - **Region**: escolha sua região
   - **Plan**: Free (válido por 90 dias) ou Starter (pago)
4. Clique **Create Database**

Render fornecerá automaticamente uma `DATABASE_URL`. Anote ela para depois.

### Passo 2: Deploy da API

1. Acesse [render.com](https://render.com) → **Dashboard**
2. **New +** → **Web Service**
3. Conecte seu repositório GitHub
4. Preencha:
   - **Name**: `sistema-api` (ou seu nome)
   - **Environment**: Node
   - **Region**: mesma do banco (ex: São Paulo)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free ou Starter

### Passo 3: Environment Variables

Na tela de criação do Web Service, role para **Environment**:

```
NODE_ENV=production
PORT=3000

JWT_SECRET=seu_segredo_super_seguro_aqui
JWT_EXPIRES_IN=8h
```

⚠️ **Importante**: Render **automaticamente** configura `DATABASE_URL` para serviços PostgreSQL. A API lê esta variável diretamente, então você não precisa adicionar `DB_HOST`, `DB_USER`, etc. manualmente.

### Passo 4: Executar o Schema

Após o deploy ser bem-sucedido, você precisa executar o schema PostgreSQL:

**Opção A: Via Render Console**

1. Acesse o Web Service criado
2. Clique em **Shell** → **Connect**
3. Rode:
```bash
psql $DATABASE_URL -f sql/schema_postgres.sql
```

**Opção B: Conectar localmente com `psql`**

Se tiver PostgreSQL instalado localmente:

```bash
# Copie a DATABASE_URL do Render
DATABASE_URL="postgres://user:pass@host:5432/sistema"

# Rode o schema:
psql "$DATABASE_URL" -f sql/schema_postgres.sql
```

✅ **Pronto!** Sua API está rodando com PostgreSQL.

### Passo 2: Deploy da API (Render)

1. Acesse [render.com](https://render.com) → **Dashboard**
2. **New +** → **Web Service**
3. Conecte GitHub e preencha:
   - **Name**: `sistema-api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Passo 3: Environment Variables

```
NODE_ENV=production
PORT=3000


---

## 📡 Como a API se Conecta ao PostgreSQL

A configuração está em `src/config/database.js`:

```javascript
// Lê DATABASE_URL automaticamente fornecido pelo Render
// Ou usa variáveis individuais (DB_HOST, DB_USER, etc.) em desenvolvimento

const pgConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(pgConfig);
```

---

## 🧪 Testar Localmente com PostgreSQL

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=sistema
DB_SSL=false

npm run dev
```

---

## ❌ Troubleshooting

### Erro: "Bind parameters must not contain undefined"

Verifique que todos os placeholders têm valores correspondentes nos parâmetros.

### Erro de conexão ao conectar ao PostgreSQL do Render

- Verifique se o **Internal Server** está conectado corretamente
- Use a **Internal Database URL** para melhor performance
- Render bloqueia conexões externas por padrão em planos Free

### Views e Triggers não funcionam

Verifique se você rodou o schema PostgreSQL correto:
```bash
psql $DATABASE_URL -f sql/schema_postgres.sql
```

---

## 📊 Health Check

Render pode monitorar a saúde da sua API. Configure em **Settings** → **Health Check**:

- **Path**: `/health`
- **Check interval**: 60 segundos

---

## 📚 Referências

- [Render Docs](https://render.com/docs)
- [PostgreSQL](https://www.postgresql.org/)
- [node-postgres (pg)](https://node-postgres.com/)

---

**Versão**: 1.0.0 | **Data**: 4 de março de 2026
