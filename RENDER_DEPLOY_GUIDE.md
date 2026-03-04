# 🚀 Guia de Deploy no Render (MySQL + PostgreSQL)

Esta API foi atualizada para suportar tanto **MySQL** quanto **PostgreSQL**. Este guia explica como fazer deploy em ambos os casos no **Render**.

## 📋 Pré-requisitos

- Conta em [render.com](https://render.com)
- Repositório GitHub com o código da API
- Banco de dados externo (Railway para MySQL, ou Render para PostgreSQL)

---

## 🔧 Opção 1: Deploy com PostgreSQL (Recomendado para Render)

PostgreSQL é nativo no Render e muito mais fácil de configurar.

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

Render fornecerá automaticamente uma **Internal Database URL**. Anote ela para depois.

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

DB_TYPE=postgres
# Render exporta automatically, não precisa configurar DATABASE_URL manualmente

JWT_SECRET=seu_segredo_super_seguro_aqui
JWT_EXPIRES_IN=8h
```

⚠️ **Importante**: Render **automaticamente** configura `DATABASE_URL` para serviços PostgreSQL, então você não precisa definir `DB_HOST`, `DB_USER`, etc.

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

---

## 🔧 Opção 2: Deploy com MySQL (via Railway)

Se preferir MySQL, você precisará de um serviço externo como **Railway**.

### Passo 1: Criar MySQL no Railway

1. Acesse [railway.app](https://railway.app)
2. **New Project** → **MySQL**
3. Preencha as credenciais
4. Copie as variáveis de conexão

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

DB_TYPE=mysql

DB_HOST=seu_host.mysql.railway.app
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=sistema
DB_SSL=true

JWT_SECRET=seu_segredo_super_seguro_aqui
JWT_EXPIRES_IN=8h
```

### Passo 4: Executar o Schema

Conecte ao MySQL do Railway e rode:

```bash
mysql -h seu_host.mysql.railway.app -u root -p sistema < sql/schema.sql
```

---

## 📡 Estrutura da Abstração de Banco

A API implementa uma **camada de abstração** que permite alternar entre MySQL e PostgreSQL sem mudar o código dos controllers/services. Aqui está como funciona:

### `src/config/database.js`

```javascript
// Detecta DB_TYPE do .env
const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();

if (dbType === 'postgres' || dbType === 'pg') {
  // Usa pg (PostgreSQL)
  // Converte `?` → `$1`, `$2`, etc. automaticamente
  // Adiciona RETURNING id a inserts
} else {
  // Usa mysql2 (MySQL)
}
```

### Como funciona a compatibilidade:

1. **Placeholders**: MySQL usa `?`, PostgreSQL usa `$1/$2/...` → convertemos automaticamente
2. **Insert IDs**: MySQL tem `result.insertId`, PostgreSQL usa `RETURNING id` → normalizamos com `getInsertedId(result)`
3. **Transactions**: interface é idêntica para ambos

### Utilidade `dbUtils.js`

```javascript
// Extrai o ID inserido de forma genérica
function getInsertedId(result) {
  if (result.insertId !== undefined) return result.insertId;     // MySQL
  if (result.rows && result.rows[0] && result.rows[0].id !== undefined) 
    return result.rows[0].id;  // PostgreSQL
  return null;
}
```

---

## 🔄 Migrando de MySQL para PostgreSQL

Se você tem dados em MySQL e quer migrar para PostgreSQL:

1. **Exportar dados do MySQL**:
```bash
mysqldump -u root -p sistema > dados.sql
```

2. **Adaptar o schema PostgreSQL** (se necessário):
   - Os tipos de dados são compatíveis (NUMERIC → NUMERIC, VARCHAR → VARCHAR, etc.)
   - Enums podem precisar de ajuste manual

3. **Importar no PostgreSQL**:
```bash
psql $DATABASE_URL < sql/schema_postgres.sql
psql $DATABASE_URL < dados_adaptados.sql
```

---

## 🧪 Testar Localmente

### Com MySQL

```bash
# .env
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=sistema

npm run dev
```

### Com PostgreSQL

```bash
# .env
DB_TYPE=postgres
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=sistema

npm run dev
```

---

## ❌ Troubleshooting

### "Bind parameters must not contain undefined" (PostgreSQL)

Verifique que todos os placeholders têm valores correspondentes em `params`.

### "DATABASE_URL does not start with postgresql:// or postgres://"

Certifique-se de que a `DATABASE_URL` está no formato correto:
```
postgres://user:password@host:port/database
```

### Erro de conexão ao conectar ao PostgreSQL do Render

- Verifique se o **Internal Server** está conectado corretamente
- Use a **Internal Database URL** se estiver em um ambiente Render
- Render bloqueia conexões externas por padrão em planos Free

### Views e Triggers não funcionam

Verifique se você rodou o schema correto:
- MySQL: `sql/schema.sql`
- PostgreSQL: `sql/schema_postgres.sql`

---

## 📊 Health Check

Render pode monitorar a saúde da sua API. Configure em **Settings** → **Health Check**:

- **Path**: `/health`
- **Check interval**: 60 segundos

---

## 📚 Referências

- [Render Docs](https://render.com/docs)
- [PostgreSQL Enums](https://www.postgresql.org/docs/current/datatype-enum.html)
- [mysql2/promise](https://github.com/sidorares/node-mysql2)
- [pg (node-postgres)](https://node-postgres.com/)

---

**Versão**: 1.0.0 | **Data**: 3 de março de 2026
