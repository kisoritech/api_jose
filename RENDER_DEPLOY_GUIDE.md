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

Se voce criar um banco PostgreSQL no proprio Render, ele fornecerá automaticamente uma `DATABASE_URL`. Se for usar Supabase, voce deve copiar a string de conexao do Supabase e cadastrá-la no serviço depois.

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

⚠️ **Importante**:

- Se o banco estiver no **Render**, a `DATABASE_URL` costuma ser configurada automaticamente.
- Se o banco estiver no **Supabase**, adicione manualmente `DATABASE_URL` ou `SUPABASE_DB_URL` com a string de conexao PostgreSQL do projeto.
- Nao use `SUPABASE_URL` nem `SUPABASE_SERVICE_ROLE_KEY` nesta API, porque o codigo atual conecta ao banco via `pg`.

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
// Lê SUPABASE_DB_URL / SUPABASE_DATABASE_URL ou DATABASE_URL
// Ou usa variáveis individuais em desenvolvimento
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
