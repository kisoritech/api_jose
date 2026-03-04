# 📦 Changelog

## 🔄 Versão Atual - PostgreSQL Only

API agora usa **PostgreSQL** como banco de dados exclusivamente.

### Mudanças principais:

- **`src/config/database.js`** - Configuração PostgreSQL simplificada:
  - Converte placeholders `?` → `$1`, `$2`, ... (formato PostgreSQL)
  - Adiciona `RETURNING id` aos INSERTs automaticamente
  - Interface padrão para pool e transações

- **`src/utils/dbUtils.js`** - Utilitários para extração de IDs inseridos:
  - `getInsertedId(result)` - normaliza resultado do INSERT

#### Controladores/Serviços atualizados:

- `src/controllers/AuthController.js`
- `src/controllers/ClienteController.js`
- `src/controllers/ProdutoController.js`
- `src/services/VendaService.js`
- `src/services/LocacaoService.js`

Todos usam `getInsertedId()` para normalizar IDs inseridos.

---

### 2. **Schema PostgreSQL Completo**

- **`sql/schema_postgres.sql`** (novo) - Schema completo para PostgreSQL com:
  - ✅ **Tipos de dados em PostgreSQL** (NUMERIC, VARCHAR, TIMESTAMP, etc.)
  - ✅ **Enums** para perfis, tipos de pessoa, forma de pagamento, status, etc.
  - ✅ **BIGSERIAL** para IDs (64-bit)
  - ✅ **GENERATED ALWAYS AS ... STORED** para colunas calculadas
  - ✅ **Todas as tabelas** do schema original:
    - usuarios, produtos, transacoes, clientes, vendas, venda_itens
    - sincronizacoes, logs_auditoria, locacoes, financeiro_clientes
    - locacao_itens, locacao_prorrogacoes
  - ✅ **7 Views** para dashboards e relatórios
  - ✅ **11 Funções PL/pgSQL** para lógica de negócio
  - ✅ **11 Triggers** para:
    - Validação de estoque
    - Atualização automática de saldos
    - Logs de auditoria
    - Prorrogações de locação

---

### 3. **Arquivo de Ambiente Melhorado**

- **`.env.example`** - Agora documentado com:
  - Configuração simplificada para PostgreSQL
  - Duas opções de conexão (DATABASE_URL ou variáveis individuais)
  - Comentários claros

---

### 4. **Package.json Atualizado**

- Dependência: `"pg": "^8.11.3"` para PostgreSQL
- Script: `npm run seed` para popular banco com dados de teste

---

### 5. **Script de Seed (Dados de Teste)**

- **`seedData.js`** - Popula banco com dados de exemplo:
  - 4 usuários de teste (admin, gerente, 2 vendedores)
  - 3 clientes de exemplo
  - 4 produtos (notebooks, mouse, teclado, projetor)
  - 1 venda com 2 itens
  - 1 locação de teste

```bash
npm run seed
```

---

### 6. **Guia de Deploy no Render**

- **`RENDER_DEPLOY_GUIDE.md`** - Instruções completas para:
  - Deploy com PostgreSQL no Render
  - Como executar schema
  - Variáveis de ambiente
  - Health check
  - Troubleshooting

---

### 7. **README Atualizado**

- Documentação clara para PostgreSQL
- Instruções de instalação local
- Explicação da camada de abstração
- Deploy no Render simplificado
- Views e funções documentadas
- Troubleshooting expandido

---

## 🚀 Como Usar

### Local com PostgreSQL

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=sistema
DB_SSL=false

npm install
npm run dev
npm run seed  # (opcional)
```

### Deploy no Render (PostgreSQL)

1. Crie um **PostgreSQL Database** no Render
2. Crie um **Web Service** conectado ao GitHub
3. Render fornece `DATABASE_URL` automaticamente
4. Environment variables:
```
NODE_ENV=production
JWT_SECRET=seu_segredo_aqui
JWT_EXPIRES_IN=8h
```
5. Após deploy, execute o schema via Render Shell:
```bash
psql $DATABASE_URL -f sql/schema_postgres.sql
```

Ver [RENDER_DEPLOY_GUIDE.md](RENDER_DEPLOY_GUIDE.md) para detalhes completos.

---

## 🔄 Estrutura de Banco de Dados

A API utiliza **PostgreSQL** com:
- Conversão automática de placeholders `?` para `$1/$2`
- `RETURNING id` nos INSERTs
- Suporte completo a transações e views

---

## 📦 Instalando dependências

```bash
npm install
```

Dependências principais:
- `pg@^8.11.3` - PostgreSQL
- `express` - Framework web
- `bcryptjs` - Hash de senhas
- `jsonwebtoken` - Autenticação JWT
- Outras conforme necessário

---

## 🧪 Testes

Todos os endpoints funcionam com PostgreSQL. Teste localmente:

```bash
# Terminal 1
npm run dev

# Terminal 2
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"teste@test.com","password":"123456","perfil":"vendedor"}'
```

---

## 📚 Arquivos alterados

```
✅ src/config/database.js (reescrito)
✅ src/controllers/AuthController.js
✅ src/controllers/ClienteController.js
✅ src/controllers/ProdutoController.js
✅ src/services/VendaService.js
✅ src/services/LocacaoService.js
✨ src/utils/dbUtils.js (novo)
✨ sql/schema_postgres.sql (novo - 800+ linhas)
✨ seedData.js (novo - 200+ linhas)
✨ RENDER_DEPLOY_GUIDE.md (novo - 300+ linhas)
✅ .env.example (melhorado)
✅ package.json (pg + seed script)
✅ README.md (atualizado)
```

---

## ⚙️ Próximos passos recomendados

1. **Testar localmente** com PostgreSQL
2. **Executar `npm run seed`** para popular dados de teste
3. **Deploy no Render** seguindo [RENDER_DEPLOY_GUIDE.md](RENDER_DEPLOY_GUIDE.md)
4. **(Opcional) Integrar CI/CD** para rodar migrations automaticamente

---

**Versão**: 1.0.0 | **Data**: 4 de março de 2026
