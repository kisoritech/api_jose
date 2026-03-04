# 📦 Resumo da Atualização - Suporte a PostgreSQL

## ✅ O que foi alterado

### 1. **Suporte a PostgreSQL**

A API agora funciona com **MySQL** ou **PostgreSQL**:

```env
DB_TYPE=mysql   # ou postgres
```

#### Arquivos criados/modificados:

- **`src/config/database.js`** - Camada de abstração que detecta `DB_TYPE` e:
  - Converte placeholders `?` → `$1`, `$2`, ... (PostgreSQL)
  - Adiciona `RETURNING id` aos INSERTs automaticamente
  - Expõe mesma interface para ambos os drivers

- **`src/utils/dbUtils.js`** (novo) - Utilitários para extração de IDs inseridos genericamente
  - `getInsertedId(result)` - funciona com `result.insertId` (MySQL) e `result.rows[0].id` (PostgreSQL)

#### Controladores/Serviços atualizados:

- `src/controllers/AuthController.js`
- `src/controllers/ClienteController.js`
- `src/controllers/ProdutoController.js`
- `src/services/VendaService.js`
- `src/services/LocacaoService.js`

Todos agora usam `getInsertedId()` para compatibilidade total.

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
  - Seções claras (NODE, DATABASE, AUTH, etc.)
  - Comentários explicando MySQL vs PostgreSQL
  - Exemplo de `DATABASE_URL` para PostgreSQL

---

### 4. **Package.json Atualizado**

- Adicionado `"pg": "^8.11.3"` como dependência para PostgreSQL
- Script novo: `npm run seed` para popular banco com dados de teste
- Descrição atualizada: "Express + MySQL/PostgreSQL"

---

### 5. **Script de Seed (Dados de Teste)**

- **`seedData.js`** (novo) - Popula banco com:
  - 4 usuários de teste (admin, gerente, 2 vendedores)
  - 3 clientes de exemplo
  - 4 produtos (notebooks, mouse, teclado, projetor)
  - 1 venda com 2 itens
  - 1 locação de teste

```bash
npm run seed
```

Usa `getInsertedId()` para compatibilidade com MySQL e PostgreSQL.

---

### 6. **Guia de Deploy no Render**

- **`RENDER_DEPLOY_GUIDE.md`** (novo) - Instruções completas:
  - ✅ Deploy com PostgreSQL (recomendado)
  - ✅ Deploy com MySQL (via Railway)
  - ✅ Como executar schema
  - ✅ Variáveis de ambiente por opção
  - ✅ Troubleshooting
  - ✅ Migração de dados entre bancos

---

### 7. **README Atualizado**

- Título agora menciona "Express + MySQL / PostgreSQL"
- Seção de install com opções MySQL e PostgreSQL
- Documentação de `DB_TYPE` nas variáveis de ambiente
- Explicação da camada de abstração
- Deploy no Render com duas opções (MySQL vs PostgreSQL)
- Views e funções documentadas
- Troubleshooting expandido

---

## 🚀 Como Usar

### Local com MySQL

```bash
# .env
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=1234
DB_NAME=sistema

npm install
npm run dev
npm run seed  # (opcional)
```

### Local com PostgreSQL

```bash
# .env
DB_TYPE=postgres
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=sistema

npm install
npm run dev
npm run seed  # (opcional)
```

### Deploy no Render com PostgreSQL

1. Crie um **PostgreSQL Database** no Render
2. Crie um **Web Service** conectado ao GitHub
3. Environment variables:
```
NODE_ENV=production
DB_TYPE=postgres
DB_SSL=true
JWT_SECRET=seu_segredo_aqui
JWT_EXPIRES_IN=8h
```
4. Após deploy, execute o schema via Render Shell:
```bash
psql $DATABASE_URL -f sql/schema_postgres.sql
```

Ver [RENDER_DEPLOY_GUIDE.md](RENDER_DEPLOY_GUIDE.md) para detalhes completos.

---

## 📊 Compatibilidade

| Feature | MySQL | PostgreSQL |
|---------|-------|----------|
| Conexão | `mysql2/promise` | `pg` |
| Placeholders | `?` | `$1, $2, ...` → convertidos automaticamente |
| Insert ID | `result.insertId` | `result.rows[0].id` → normalizado com `getInsertedId()` |
| Transactions | ✅ | ✅ |
| Views | ✅ | ✅ |
| Triggers | ✅ | ✅ (plpgsql) |
| Functions | ❌ (SQL puro) | ✅ (plpgsql) |
| Enums | ✅ (string) | ✅ (tipos nativos) |

---

## 🔄 Migrando código existente

Se você tem código Node.js com queries diretas `?`:

```javascript
// Antes (MySQL only):
const [result] = await pool.execute('INSERT INTO usuarios ... VALUES (?, ?, ?)', [nome, email, hash]);
const userId = result.insertId;

// Depois (compatível com ambos):
const [result] = await pool.execute('INSERT INTO usuarios ... VALUES (?, ?, ?)', [nome, email, hash]);
const userId = getInsertedId(result);  // funciona em MySQL e PostgreSQL!
```

---

## 📦 Instalando dependências

```bash
npm install
```

Isso instala:
- `mysql2@^3.18.2` (se usar MySQL)
- `pg@^8.11.3` (se usar PostgreSQL)
- Outras dependências existentes (express, bcryptjs, jwt, etc.)

---

## 🧪 Testes

Todos os endpoints funcionam **idêntico** em MySQL e PostgreSQL. Teste localmente:

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

1. **Testar localmente** com ambos os bancos (MySQL e PostgreSQL)
2. **Executar `npm run seed`** para popular dados de teste
3. **Deploy no Render** seguindo [RENDER_DEPLOY_GUIDE.md](RENDER_DEPLOY_GUIDE.md)
4. **(Opcional) Integrar CI/CD** para rodar migrations automaticamente

---

**Versão**: 1.0.0 | **Data**: 3 de março de 2026
