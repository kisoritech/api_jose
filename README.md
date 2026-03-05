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
# === NODE / SERVER ===
NODE_ENV=development     # development | production
PORT=3000

# === DATABASE (PostgreSQL) ===
# Opção 1: Use DATABASE_URL (fornecido automaticamente pelo Render em produção)
# Formato: postgres://user:password@host:5432/dbname
# DATABASE_URL=postgres://user:pass@host:5432/sistema

# Opção 2: Configure as variáveis individuais (para desenvolvimento local)
DB_HOST=localhost        # Host do PostgreSQL
DB_PORT=5432             # Porta PostgreSQL (padrão: 5432)
DB_USER=postgres         # Usuário PostgreSQL
DB_PASSWORD=sua_senha    # Senha PostgreSQL
DB_NAME=sistema          # Nome do banco de dados
DB_SSL=false             # true para SSL/TLS (recomendado em produção)

# === AUTHENTICATION (JWT) ===
JWT_SECRET=seu_segredo_super_seguro_aqui    # Chave secreta para assinar JWT
JWT_EXPIRES_IN=8h                           # Tempo de expiração do token (ex: 8h, 24h, 7d)
```

**⚠️ Segurança:**
- **NUNCA commite `.env`** - Já está em `.gitignore`
- Gere um `JWT_SECRET` forte em produção
- Use `DB_SSL=true` em produção com PostgreSQL externo
- Mude `NODE_ENV=production` antes de fazer deploy

---

### Variáveis Opcionais

```env
# === LOGGING ===
LOG_LEVEL=info           # debug | info | warn | error

# === CORS ===
CORS_ORIGIN=*            # Use * para desenvolvimento, restrinja em produção

# === RATE LIMITING ===
RATE_LIMIT_WINDOW_MS=900000    # Janela de tempo em ms (15 min = 900000)
RATE_LIMIT_MAX_REQUESTS=100    # Máximo de requisições por IP
```

---

## 📁 Estrutura do Projeto

```
api/
├── src/
│   ├── app.js                    # Aplicação Express com middlewares
│   ├── server.js                 # Inicialização do servidor
│   ├── config/
│   │   └── database.js           # Configuração PostgreSQL
│   ├── controllers/
│   │   ├── AuthController.js     # Autenticação (register, login)
│   │   ├── ClienteController.js  # CRUD de clientes
│   │   ├── ProdutoController.js  # CRUD de produtos
│   │   ├── VendaController.js    # Criação de vendas
│   │   └── LocacaoController.js  # Criação de locações
│   ├── middlewares/
│   │   ├── authMiddleware.js     # Validação de JWT
│   │   ├── errorMiddleware.js    # Tratamento de erros global
│   │   └── permissionMiddleware.js # Controle de permissões
│   ├── routes/
│   │   ├── index.js              # Roteamento central
│   │   ├── authRoutes.js         # Rotas de autenticação
│   │   ├── clienteRoutes.js      # Rotas de clientes
│   │   ├── produtoRoutes.js      # Rotas de produtos
│   │   ├── vendaRoutes.js        # Rotas de vendas
│   │   └── locacaoRoutes.js      # Rotas de locações
│   ├── services/
│   │   ├── VendaService.js       # Lógica de criação de vendas
│   │   └── LocacaoService.js     # Lógica de criação de locações
│   └── utils/
│       ├── dbUtils.js            # Utilitários de banco de dados
│       └── generateToken.js      # Geração de JWT
├── sql/
│   └── schema_postgres.sql       # Schema completo PostgreSQL
├── .env.example                  # Variáveis de ambiente (modelo)
├── .gitignore                    # Arquivos ignorados no git
├── package.json                  # Dependências Node.js
├── seedData.js                   # Script para popular BD
├── README.md                     # Este arquivo
├── CHANGELOG.md                  # Histórico de alterações
├── RENDER_DEPLOY_GUIDE.md        # Guia de deploy Render
├── TESTING_GUIDE.md              # Guia de testes
└── PRODUCTION_CHECKLIST.md       # Checklist produção
```

---

## 🔌 Endpoints da API

Todos os endpoints (exceto `/health`, `/api/auth/register` e `/api/auth/login`) requerem autenticação via **Bearer Token**.

### 📌 Health Check

```bash
GET /health
```

**Resposta** (sem autenticação):
```json
{ "status": "OK" }
```

---

### ⚠️ Nota Importante sobre Parâmetros

- **Sempre envie um JSON válido** com `Content-Type: application/json`
- **Campos obrigatórios não podem ser `null` ou `undefined`**:
  - Produtos: `nome`, `preco_venda`
  - Clientes: `nome`
- **Campos opcionais** podem ser omitidos do request
- **Strings** são trimadas (espaços removidos)
- **Números** são convertidos para o tipo correto

---

### 🔐 Autenticação

#### Registrar novo usuário
```bash
POST /api/auth/register
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@example.com",
  "password": "123456",
  "perfil": "vendedor"  # admin | gerente | vendedor
}
```

**Resposta** (201):
```json
{
  "id": 1,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "perfil": "vendedor"
  }
}
```

#### Fazer login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "password": "123456"
}
```

**Resposta** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "perfil": "vendedor"
  }
}
```

#### Obter dados do usuário autenticado
```bash
GET /api/auth/me
Authorization: Bearer {token}
```

**Resposta** (200):
```json
{
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "perfil": "vendedor"
  }
}
```

> **Nota**: se você adicionou usuários manualmente no banco com senha em texto simples, o endpoint de login irá detectar, rehash a senha e atualizar o registro automaticamente.

---

### 👥 Clientes (Requer Autenticação)

#### Listar todos os clientes
```bash
GET /api/clientes
Authorization: Bearer {token}
```

#### Buscar cliente por ID
```bash
GET /api/clientes/:id
Authorization: Bearer {token}
```

#### Criar cliente
```bash
POST /api/clientes
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Empresa ABC",
  "tipo_pessoa": "juridica",  # fisica | juridica
  "email": "contato@abc.com",
  "telefone": "+55 11 99999-9999"
}
```

**Campos obrigatórios**: `nome`

#### Atualizar cliente
```bash
PUT /api/clientes/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Novo Nome",
  "email": "novo@example.com",
  "telefone": "+55 11 88888-8888"
}
```

#### Deletar cliente
```bash
DELETE /api/clientes/:id
Authorization: Bearer {token}
```

---

### 📦 Produtos (Requer Autenticação)

#### Listar todos os produtos
```bash
GET /api/produtos
Authorization: Bearer {token}
```

#### Buscar produto por ID
```bash
GET /api/produtos/:id
Authorization: Bearer {token}
```

#### Criar produto
```bash
POST /api/produtos
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Notebook Dell",
  "descricao": "Notebook profissional 16GB RAM",
  "preco_venda": 3500.00,
  "quantidade_disponivel": 10
}
```

**Campos obrigatórios**: `nome`, `preco_venda`

#### Atualizar produto
```bash
PUT /api/produtos/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Notebook HP",
  "preco_venda": 3200.00,
  "quantidade_disponivel": 15,
  "descricao": "Novo modelo"
}
```

#### Deletar produto
```bash
DELETE /api/produtos/:id
Authorization: Bearer {token}
```

---

### 💳 Vendas (Requer Autenticação)

#### Criar venda
```bash
POST /api/vendas
Authorization: Bearer {token}
Content-Type: application/json

{
  "cliente_id": 1,
  "forma_pagamento": "pix",  # pix | credito | debito | boleto | cheque
  "frete_valor": 50.00,
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 2,
      "valor_unitario": 3500.00
    },
    {
      "produto_id": 2,
      "quantidade": 1,
      "valor_unitario": 1200.00
    }
  ]
}
```

**Resposta** (201):
```json
{
  "id": 1,
  "cliente_id": 1,
  "valor_total": 8200.00,
  "itens": 2,
  "status": "concluido"
}
```

---

### 📅 Locações (Requer Autenticação)

#### Criar locação
```bash
POST /api/locacoes
Authorization: Bearer {token}
Content-Type: application/json

{
  "cliente_id": 1,
  "forma_pagamento": "pix",
  "data_inicio": "2026-03-05",
  "quantidade_dias": 30,
  "frete_valor": 50.00,
  "itens": [
    {
      "produto_id": 1,
      "quantidade": 2,
      "valor_diario": 100.00
    }
  ]
}
```

**Resposta** (201):
```json
{
  "id": 1,
  "cliente_id": 1,
  "valor_total": 6050.00,
  "status": "ativa"
}
```

---

## 📊 Tabela de Referência Rápida

| Método | Endpoint | Autenticado | Descrição |
|--------|----------|:----------:|-----------|
| GET | `/health` | ❌ | Health check |
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

### Modo Desenvolvimento

```bash
# Terminal 1 - inicie o servidor
npm run dev

# Terminal 2 - execute os testes abaixo
```

### Exemplo 1: Registrar Usuário

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
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@example.com",
    "perfil": "vendedor"
  }
}
```

### Exemplo 2: Fazer Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "123456"
  }'
```

### Exemplo 3: Obter Dados do Usuário

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Exemplo 4: Criar um Produto

```bash
curl -X POST http://localhost:3000/api/produtos \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook Dell XPS",
    "descricao": "Notebook profissional 16GB RAM",
    "preco_venda": 3500.00,
    "quantidade_disponivel": 10
  }'
```

### Exemplo 5: Listar Todos os Produtos

```bash
curl -X GET http://localhost:3000/api/produtos \
  -H "Authorization: Bearer {seu_token_aqui}"
```

### Exemplo 6: Criar um Cliente

```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Authorization: Bearer {seu_token_aqui}" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Empresa ABC Ltda",
    "tipo_pessoa": "juridica",
    "email": "contato@abc.com",
    "telefone": "+55 11 99999-9999"
  }'
```

### Exemplo 7: Criar uma Venda

```bash
curl -X POST http://localhost:3000/api/vendas \
  -H "Authorization: Bearer {seu_token_aqui}" \
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
      }
    ]
  }'
```

### Usar com Postman / Insomnia

**Postman:**
1. Importe as variáveis de ambiente:
   - Crie um Environment com as variáveis: `baseUrl`, `token`
   - `baseUrl` = `http://localhost:3000`
2. Após login, copie o `token` da resposta
3. Configure a variável `token` em Environment
4. Use `{{baseUrl}}/api/...` e `Bearer {{token}}` nos headers

**Insomnia:**
1. Configure base URL: `http://localhost:3000`
2. Use `_` (underscore) para variáveis: `{{ _.baseUrl }}`
3. Copie o token após login
4. Use em Auth → Bearer Token

### UI de Teste no Navegador

Uma página de teste está disponível em `public/index.html` e também no caminho raiz `/` quando o servidor está rodando. Ela facilita operações comuns sem usar `curl` ou Postman:

- Acesse: `http://localhost:3000` (desenvolvimento)
- Funcionalidades:
  - Login e registro de usuário (salva token em `localStorage`)
  - Copiar token para a área de transferência
  - Construir e enviar requisições (GET/POST/PUT/DELETE) com ou sem o header `Authorization`
  - Painel com a resposta em JSON

Uso rápido:

1. Inicie a aplicação:
```bash
npm run dev
```
2. Abra `http://localhost:3000` no navegador
3. Faça login ou registre um usuário; copie o token e use nos seus testes

Observação: a UI destina-se a testes e desenvolvimento; não a exponha em produção sem proteção adicional.

---

### Exemplos com Postman

1. **Importe o `.env`** como variáveis de ambiente
2. **Faça login** e salve o token:
   - Response → Test → `pm.environment.set("token", pm.response.json().token)`
3. **Use `{{token}}`** nos headers de Authorization

---

## ✔️ Checklist Pronto para Usar

### Desenvolvimento Local
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL rodando
- [ ] `.env` configurado com credenciais locais
- [ ] `npm install` executado
- [ ] `npm run dev` funciona sem erros
- [ ] `/health` retorna 200 OK

### Antes de Deploy
- [ ] Testes realizados com sucesso localmente
- [ ] `npm run seed` popula dados de teste
- [ ] Todos os endpoints testados com token válido
- [ ] Variáveis sensíveis foram para `.env`
- [ ] `.env` não foi commitado (verificar `.gitignore`)
- [ ] `NODE_ENV=production` antes de fazer build

### Pós-Deploy em Produção
- [ ] Health check (`/health`) retorna 200
- [ ] Registro e login funcionam
- [ ] HTTPS está ativo (certificado SSL)
- [ ] Rate limiting está ativo (protege contra abuso)
- [ ] Logs estão sendo registrados
- [ ] Backups do banco configurados

### Popular com Dados de Teste

```bash
npm run seed
```

Isso cria automaticamente:
- 4 usuários de teste (admin, gerente, 2 vendedores)
- 3 clientes de exemplo
- 4 produtos de exemplo
- 1 venda com 2 itens
- 1 locação de teste

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

A API implementa múltiplas camadas de segurança:

- ✅ **Helmet.js** - Headers de segurança HTTP
- ✅ **CORS** - Controle de requisições de origem cruzada
- ✅ **Rate Limiting** - 100 requisições por IP a cada 15 minutos
- ✅ **JWT (JSON Web Tokens)** - Autenticação stateless com expiração
- ✅ **bcryptjs** - Hash seguro de senhas (10 rounds de salt)
- ✅ **SSL/TLS** - Criptografia de transporte em produção
- ✅ **Database Triggers** - Validações no banco de dados
- ✅ **Input Validation** - Sanitização de entrada em todos os endpoints
- ✅ **Environment Variables** - Não versionam dados sensíveis (`.env` no `.gitignore`)

**Boas Práticas Implementadas:**
- Senha nunca é retornada nas respostas
- Tokens com expiração automática (padrão: 8 horas)
- Detecção e rehash automático de senhas hashadas incorretamente
- Logging de requisições via Morgan
- Isolamento de dados por usuário autenticado

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

## ❌ Troubleshooting - Problemas Comuns e Soluções

### 1️⃣ Erro: "Bind parameters must not contain undefined"

**Causa**: Um parâmetro obrigatório não foi enviado ou é `undefined`.

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
    "quantidade_disponivel": 50
  }'
```

---

### 2️⃣ Erro: ECONNREFUSED (banco não conecta)

**Causa**: A API não consegue conectar ao PostgreSQL.

**Solução**: Verifique:
1. PostgreSQL está rodando?
2. `DATABASE_URL` está formatada corretamente? (postgres://user:pass@host:port/db)
3. Ou `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` estão corretos?
4. Firewall permite conexão na porta 5432?
5. `DB_SSL=true` se conectar via SSL/TLS?

```bash
# Teste conexão localmente
psql -h localhost -U postgres -d sistema

# Se usar DATABASE_URL
psql "your_database_url_here"
```

---

### 3️⃣ Erro: "Port is already in use"

**Causa**: Porta 3000 já está em uso.

**Solução**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID 12345 /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Ou use outra porta
PORT=3001 npm run dev
```

---

### 4️⃣ Erro: "JWT malformed" ou "Invalid token"

**Causa**: Token JWT expirado, inválido ou mal formatado.

**Solução**:
1. Faça login novamente para gerar novo token
2. Certifique-se que está enviando o token no header: `Authorization: Bearer {token}`
3. Não inclua "Bearer " duas vezes

Exemplo correto:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." http://localhost:3000/api/auth/me
```

---

### 5️⃣ Erro: "401 Unauthorized"

**Causa**: Autenticação falhou ou token ausente.

**Solução**:
1. Verifique se o endpoint requer autenticação (consulte tabela de endpoints)
2. Envie o token no header: `Authorization: Bearer {seu_token}`
3. Verifique se o token não expirou
4. Faça login novamente

---

### 6️⃣ Erro: "Too many requests" (Rate Limiting)

**Causa**: Excedeu o limite de 100 requisições por 15 minutos.

**Solução**:
1. Aguarde 15 minutos
2. Ou configure `RATE_LIMIT_MAX_REQUESTS` em `.env`
3. Em desenvolvimento, desative rate limiting:
```javascript
// Em src/app.js, comentar a linha:
// app.use(limiter);
```

---

### 7️⃣ Erro: "Content-Type application/json required"

**Causa**: Não enviou `Content-Type: application/json` no header.

**Solução**: Adicione o header em todas as requisições POST/PUT:
```bash
curl -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"nome": "Cliente"}'
```

---

### 8️⃣ Erro: "FATAL: database 'sistema' does not exist"

**Causa**: O banco de dados não foi criado.

**Solução**:
```bash
# Conecte ao PostgreSQL como superuser
psql -U postgres -h localhost

# Crie o banco
CREATE DATABASE sistema;

# Saia e execute o schema
psql -U postgres -d sistema -f sql/schema_postgres.sql
```

---

### 9️⃣ Erro em Produção: "DATABASE_URL environment variable not found"

**Causa**: Render não forneceu `DATABASE_URL` automaticamente.

**Solução**:
1. Crie um PostgreSQL Database no Render primeiro
2. Conecte ao seu Web Service na aba "Environment"
3. Render fornecerá `DATABASE_URL` automaticamente

---

### 🔟 Erro: "Client has already been closed"

**Causa**: Problema com transação ou conexão ao banco.

**Solução**:
1. Verifique se `pool.getConnection()` foi chamado corretamente
2. Certifique-se de fazer `release()` ou `commit()` / `rollback()`
3. Reinicie a API: `npm run dev`

---

## 🔍 Debug e Logs

### Ver logs em tempo real
```bash
npm run dev
```

Você verá logs como:
```
POST /api/auth/login 200 45.234 ms
GET /api/produtos 200 12.123 ms
```

### Ativar logging verbose
```javascript
// Em src/app.js
app.use(morgan('verbose'));
```

### Testar conectividade
```bash
curl http://localhost:3000/health
# Resposta: { "status": "OK" }

---

## 📚 Documentação

- [Express.js](https://expressjs.com)
- [node-postgres (pg)](https://node-postgres.com/)
- [Render Docs](https://render.com/docs)
- [JWT.io](https://jwt.io)

---

**Versão**: 1.0.0 | **Data**: 4 de março de 2026 | **Status**: ✅ Pronto para Produção
