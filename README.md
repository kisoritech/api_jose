# API Node.js | Express + PostgreSQL / Supabase

API para gestao de clientes, produtos, vendas, locacoes, estoque, transacoes e financeiro, com autenticacao JWT, rotas legadas de compatibilidade e dashboard analitico.

## Visao Geral

Esta API foi ajustada para trabalhar de forma mais consistente com PostgreSQL, incluindo bancos hospedados no Supabase, e com o schema operacional do projeto. O backend agora:

- normaliza payloads vindos do front
- trata melhor erros de enum, foreign key, estoque e validacao
- suporta rotas `/api/...` e tambem rotas legadas usadas por telas antigas
- automatiza reflexos de vendas e locacoes em `transacoes`, `locacao_itens` e `financeiro_clientes`
- expoe endpoints de dashboard, relatorios completos e auditoria

## Melhorias Implementadas

### 1. Compatibilidade com PostgreSQL

- wrapper de compatibilidade em `src/config/database.js`
- suporte a `getConnection`, `execute`, `beginTransaction`, `commit` e `rollback`
- adaptacao de codigo legado originalmente escrito no estilo MySQL

### 2. Vendas mais consistentes

- normalizacao de `forma_pagamento`, `frete_valor`, datas e itens
- calculo de `valor_total` antes da gravacao da venda
- criacao automatica dos reflexos em `transacoes` e `financeiro_clientes`
- suporte a payload novo e payload legado

### 3. Locacoes mais automaticas

- validacao de produto, cliente, quantidade, datas e tipo do produto
- criacao automatica de `locacao_itens`
- geracao automatica de `transacoes`
- geracao automatica de `financeiro_clientes`
- atualizacao de status com reflexos automaticos em estoque, financeiro e prorrogacoes
- listagem e detalhe de locacoes na API

### 4. Dashboard, relatorios e auditoria

- endpoints para resumo operacional
- endpoint de movimentacao geral
- endpoint de financeiro por origem
- endpoint de auditoria de integracao entre tabelas
- relatorio financeiro completo
- relatorio de produtos com estoque, vendas e locacoes
- relatorio de vendas com ticket medio e formas de pagamento
- relatorio de locacoes com status e atraso

## Fluxo Operacional

### Produto

`POST /api/produtos`

Fluxo:

1. recebe os dados do produto e a `quantidade` inicial
2. grava o produto com estoque zerado
3. se a `quantidade` for maior que zero, registra uma `transacao` de `entrada`
4. a trigger de `transacoes` atualiza o estoque do produto
5. retorna o `id` do produto e indica se houve transacao de estoque inicial

### Venda

`POST /api/vendas`

Fluxo:

1. recebe `cliente_id`, `forma_pagamento`, `frete_valor` e `itens`
2. normaliza os dados vindos do front
3. calcula o total da venda
4. grava em `vendas`
5. grava os itens em `venda_itens`
6. registra movimentos em `transacoes`
7. garante o lancamento em `financeiro_clientes`
8. retorna a venda consolidada

### Locacao

`POST /api/locacoes`

Fluxo:

1. recebe produto, cliente, quantidade, valor e datas
2. valida consistencia de negocio
3. grava em `locacoes`
4. cria `locacao_itens`
5. registra movimento em `transacoes`
6. garante o lancamento em `financeiro_clientes`
7. retorna a locacao consolidada

### Status da Locacao

`PUT /api/locacoes/:id/status`

Fluxo:

1. recebe o novo `status` da locacao
2. valida se a locacao pode mudar para esse status
3. aplica os reflexos automaticos em `locacoes`, `locacao_itens`, `transacoes`, `financeiro_clientes` e `locacao_prorrogacoes`
4. retorna a locacao consolidada com `itens` e `prorrogacoes`

## Estrutura do Projeto

Principais caminhos:

- `src/app.js`: configuracao do Express
- `src/server.js`: inicializacao do servidor
- `src/config/database.js`: conexao PostgreSQL / Supabase
- `src/controllers/AuthController.js`: autenticacao
- `src/controllers/VendaController.js`: vendas
- `src/controllers/LocacaoController.js`: locacoes
- `src/services/LocacaoService.js`: regras de locacao
- `src/services/AutomacaoLancamentosService.js`: automacoes de transacao e financeiro
- `src/routes/index.js`: roteamento principal `/api`
- `src/routes/legacyRoutes.js`: compatibilidade com rotas antigas
- `src/routes/dashboardRoutes.js`: dashboard, relatorios e auditoria
- `public/index.html`: UI de teste da API
- `public/app.js`: logica da UI de teste
- `sql/schema_postgres.sql`: schema principal
- `sql/migrations/2026-03-27_automacao_vendas_locacoes.sql`: migration de automacao
- `sql/checks/auditoria_integracao.sql`: auditoria SQL
- `TESTING_GUIDE.md`: guia de testes e payloads

## Instalacao

### Requisitos

- Node.js 20+
- PostgreSQL 12+ ou Supabase Postgres

### Passos

```bash
npm install
```

Crie o `.env`.

Para Supabase, prefira a string de conexao completa:

```env
NODE_ENV=development
PORT=3000
SUPABASE_DB_URL=postgresql://postgres:[SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres
DB_SSL=true
JWT_SECRET=seu_segredo
JWT_EXPIRES_IN=8h
```

Se preferir usar variaveis separadas, a API tambem aceita:

```env
SUPABASE_DB_HOST=db.[PROJECT-REF].supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=sua_senha
SUPABASE_DB_NAME=postgres
SUPABASE_DB_SSL=true
```

Hospedagens genericas continuam funcionando com `DATABASE_URL` ou `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`.

Rode o schema principal:

```bash
psql -U seu_usuario -d seu_banco -f sql/schema_postgres.sql
```

No Supabase, esse comando pode ser executado no SQL Editor, no Database CLI, ou via `psql` apontando para a conexao do projeto.

Rode a migration de automacao:

```bash
psql -U seu_usuario -d seu_banco -f sql/migrations/2026-03-27_automacao_vendas_locacoes.sql
```

Inicie a API:

```bash
npm run dev
```

Base local:

```text
http://localhost:3000
```

Base publicada:

```text
https://api-jose-jhbt.onrender.com
```

## Autenticacao

Rotas publicas:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /health`

Todas as demais rotas `/api/...` exigem:

```text
Authorization: Bearer {token}
```

### Registrar usuario

```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"nome\":\"Joao\",\"email\":\"joao@email.com\",\"password\":\"123456\",\"perfil\":\"vendedor\"}"
```

### Fazer login

```bash
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"joao@email.com\",\"password\":\"123456\"}"
```

## Rotas da API

### Health

- `GET /health`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Clientes

- `GET /api/clientes`
- `GET /api/clientes/:id`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`

### Produtos

- `GET /api/produtos`
- `GET /api/produtos/:id`
- `POST /api/produtos`
- `PUT /api/produtos/:id`
- `DELETE /api/produtos/:id`

### Vendas

- `GET /api/vendas`
- `GET /api/vendas/:id`
- `POST /api/vendas`

### Locacoes

- `GET /api/locacoes`
- `GET /api/locacoes/:id`
- `POST /api/locacoes`
- `PUT /api/locacoes/:id/status`

### Dashboard

#### Resumos Gerais
- `GET /api/dashboard/resumo` - inclui totais gerais e totais recebidos por PIX e dinheiro
- `GET /api/dashboard/estoque`
- `GET /api/dashboard/estoque-resumido`
- `GET /api/dashboard/resumo-operacional`
- `GET /api/dashboard/movimentacao-geral`

#### Detalhes Operacionais
- `GET /api/dashboard/vendas-detalhadas`
- `GET /api/dashboard/produtos-mais-vendidos`
- `GET /api/dashboard/locacoes-ativas`
- `GET /api/dashboard/financeiro-clientes`
- `GET /api/dashboard/cliente-historico/:clienteId`
- `GET /api/dashboard/venda-itens-margem`

#### Financeiro Completo (Novo)
- `GET /api/dashboard/financeiro-completo` - Análise financeira completa com PIX, Dinheiro e comparações
- `GET /api/dashboard/saldo-caixa-real` - Saldo de caixa em tempo real
- `GET /dashboard/financeiro-completo` - alias compativel sem prefixo `/api`
- `GET /financeiro-completo` - alias direto para consultas e testes

#### Relatórios Completos
- `GET /api/dashboard/financeiro-origens`
- `GET /api/dashboard/produtos-relatorio`
- `GET /api/dashboard/vendas-relatorio`
- `GET /api/dashboard/locacoes-relatorio`

#### Auditoria
- `GET /api/dashboard/auditoria-integracao`

## Rotas Legadas

Essas rotas existem para telas antigas que ainda nao usam `/api`.

- `GET /clientes`
- `GET /produtos`
- `GET /historico_vendas`
- `GET /vendas`
- `GET /vendas/:id`
- `POST /salvar_venda`

## Como Consultar a API

### 1. Health check

```bash
curl http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "OK"
}
```

### 2. Listar clientes

```bash
curl -X GET http://localhost:3000/api/clientes ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta exemplo:

```json
[
  {
    "id": 2,
    "tipo_pessoa": "juridica",
    "nome": "Empresa XYZ Ltda",
    "email": "contato@xyz.com",
    "telefone": "11999999999",
    "ativo": true
  }
]
```

### 3. Criar um cliente

```bash
curl -X POST http://localhost:3000/api/clientes ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"nome\":\"Cliente Novo\",\"tipo_pessoa\":\"fisica\",\"email\":\"cliente@email.com\",\"telefone\":\"11988887777\"}"
```

### 4. Listar produtos

```bash
curl -X GET http://localhost:3000/api/produtos ^
  -H "Authorization: Bearer SEU_TOKEN"
```

### 5. Criar um produto

```bash
curl -X POST http://localhost:3000/api/produtos ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"nome\":\"Produto Teste\",\"preco_venda\":59.9,\"preco_custo\":30,\"quantidade\":8,\"tipo\":\"ambos\"}"
```

Resposta exemplo:

```json
{
  "id": 12,
  "transacao_estoque_inicial": true
}
```

Ao cadastrar com `quantidade: 8`, a API cria o produto com estoque inicial zerado e registra uma linha em `transacoes` semelhante a:

```json
{
  "produto_id": 12,
  "usuario_id": 1,
  "tipo": "entrada",
  "quantidade": 8,
  "valor_unitario": 30,
  "origem": "ajuste",
  "referencia_id": 12,
  "observacao": "Estoque inicial no cadastro do produto #12"
}
```

Isso faz com que o historico de movimentacao fique vinculado ao produto desde o cadastro, e o estoque final em `produtos.quantidade` continue em `8`, sem duplicidade.

### 6. Criar venda

```bash
curl -X POST http://localhost:3000/api/vendas ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"cliente_id\":2,\"forma_pagamento\":\"Dinheiro\",\"frete_valor\":\"R$ 22,50\",\"itens\":[{\"produto_id\":1,\"quantidade\":2,\"valor_unitario\":10.5}]}"
```

Resposta exemplo:

```json
{
  "id": 15,
  "usuario_id": 1,
  "cliente_id": 2,
  "valor_total": "21.00",
  "frete_valor": "22.50",
  "total_final": "43.50",
  "forma_pagamento": "dinheiro",
  "status": "concluida",
  "cliente_nome": "Empresa XYZ Ltda",
  "vendedor": "Jose"
}
```

### 7. Consultar uma venda

```bash
curl -X GET http://localhost:3000/api/vendas/15 ^
  -H "Authorization: Bearer SEU_TOKEN"
```

### 8. Criar locacao

```bash
curl -X POST http://localhost:3000/api/locacoes ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"produto_id\":4,\"cliente_id\":2,\"quantidade\":1,\"valor_unitario\":\"200,00\",\"data_inicio\":\"2026-03-27T10:00:00Z\",\"data_prevista_devolucao\":\"2026-04-03T10:00:00Z\"}"
```

Resposta exemplo:

```json
{
  "id": 8,
  "produto_id": 4,
  "produto_nome": "Caixa de Som",
  "cliente_id": 2,
  "cliente_nome": "Empresa XYZ Ltda",
  "quantidade": 1,
  "valor_unitario": "200.00",
  "valor_total": "200.00",
  "status": "ativa",
  "itens": [
    {
      "id": 5,
      "locacao_id": 8,
      "produto_id": 4,
      "quantidade": 1,
      "valor_unitario": "200.00",
      "valor_total": "200.00"
    }
  ]
}
```

### 9. Consultar resumo do dashboard

```bash
curl -X GET http://localhost:3000/api/dashboard/resumo ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta exemplo:

```json
{
  "total_clientes": "12",
  "total_produtos": "30",
  "produtos_disponiveis": "24",
  "faturamento_total": "12500.00",
  "total_pix": "8200.00",
  "total_dinheiro": "2300.00",
  "locacoes_ativas": "4"
}
```

### 10. Consultar movimentacao geral

```bash
curl -X GET http://localhost:3000/api/dashboard/movimentacao-geral ^
  -H "Authorization: Bearer SEU_TOKEN"
```

### 11. Consultar resumo operacional

```bash
curl -X GET http://localhost:3000/api/dashboard/resumo-operacional ^
  -H "Authorization: Bearer SEU_TOKEN"
```

### 12. Consultar financeiro por origem

```bash
curl -X GET http://localhost:3000/api/dashboard/financeiro-origens ^
  -H "Authorization: Bearer SEU_TOKEN"
```

### 13. Consultar financeiro completo

```bash
curl -X GET http://localhost:3000/api/dashboard/financeiro-completo ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta exemplo:

```json
{
  "resumo": {
    "total_lancamentos": "18",
    "total_debitos": "5300.00",
    "total_creditos": "1200.00",
    "total_pendente": "2800.00",
    "total_pago": "3500.00",
    "total_cancelado": "200.00"
  },
  "por_origem": [],
  "por_cliente": [],
  "ultimos_lancamentos": []
}
```

### 14. Consultar relatorio de produtos

```bash
curl -X GET http://localhost:3000/api/dashboard/produtos-relatorio ^
  -H "Authorization: Bearer SEU_TOKEN"
```

### 15. Consultar relatorio de vendas

```bash
curl -X GET http://localhost:3000/api/dashboard/vendas-relatorio ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta exemplo:

```json
{
  "resumo": {
    "total_vendas": "10",
    "faturamento_total": "25340.50",
    "subtotal_produtos": "24700.50",
    "total_frete": "640.00",
    "ticket_medio": "2534.05"
  },
  "por_forma_pagamento": [],
  "vendas": []
}
```

### 16. Consultar relatorio de locacoes

```bash
curl -X GET http://localhost:3000/api/dashboard/locacoes-relatorio ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta exemplo:

```json
{
  "resumo": {
    "total_locacoes": "6",
    "valor_total_locado": "1600.00",
    "ativas": "3",
    "atrasadas": "1",
    "devolvidas": "2",
    "canceladas": "0"
  },
  "por_status": [],
  "locacoes": []
}
```

### 17. Consultar auditoria de integracao

```bash
curl -X GET http://localhost:3000/api/dashboard/auditoria-integracao ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Resposta exemplo:

```json
{
  "vendas_sem_itens": "0",
  "vendas_sem_financeiro": "0",
  "vendas_sem_transacao": "0",
  "locacoes_sem_itens": "0",
  "locacoes_sem_financeiro": "0",
  "locacoes_sem_transacao": "0",
  "financeiro_sem_cliente": "0",
  "transacoes_sem_produto": "0",
  "produtos_estoque_negativo": "0"
}
```

### 18. Usar a rota legada de venda

```bash
curl -X POST http://localhost:3000/salvar_venda ^
  -H "Content-Type: application/json" ^
  -d "{\"cliente\":2,\"forma_pagamento\":\"Dinheiro\",\"frete_valor\":\"R$ 10,00\",\"items\":[{\"produto\":1,\"quantidade\":1,\"valor\":\"10,00\"}]}"
```

## Formatos de Payload Aceitos

### Venda nova

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

### Locacao

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

### Atualizar status da locacao

Payload base:

```json
{
  "status": "ativa"
}
```

Status suportados:

- `ativa`: confirma o recebimento financeiro da locacao e marca o debito em `financeiro_clientes` como `pago`
- `devolvida`: preenche `data_devolucao` automaticamente e registra a entrada do produto no estoque sem criar ajuste financeiro
- `cancelada`: devolve o produto ao estoque, cancela o debito da locacao e cria um credito de reembolso para o cliente
- `atrasada`: exige `nova_data_prevista_devolucao` e gera uma linha em `locacao_prorrogacoes`, atualizando tambem o novo prazo da locacao

Exemplo para devolucao:

```json
{
  "status": "devolvida"
}
```

Exemplo para cancelamento:

```json
{
  "status": "cancelada"
}
```

Exemplo para atraso com prorrogacao:

```json
{
  "status": "atrasada",
  "nova_data_prevista_devolucao": "2026-04-10T10:00:00Z",
  "motivo": "Cliente solicitou mais dias de uso"
}
```

## Integracoes Entre Tabelas

Com a migration aplicada, a API passa a refletir automaticamente:

- `produtos` -> `transacoes` ao registrar estoque inicial no cadastro
- `vendas` -> `venda_itens`
- `vendas` -> `transacoes`
- `vendas` -> `financeiro_clientes`
- `locacoes` -> `locacao_itens`
- `locacoes` -> `transacoes`
- `locacoes` -> `financeiro_clientes`
- `locacoes` -> `locacao_prorrogacoes` ao atualizar para `atrasada`

## Regras de Status da Locacao

- `ativa` e o status padrao na criacao, e a rota de atualizacao pode ser usada para confirmar o recebimento financeiro da locacao
- `devolvida` registra `data_devolucao` automaticamente e devolve o item ao estoque com uma transacao de entrada
- `cancelada` devolve o item ao estoque, cancela o debito original e cria um credito de reembolso para o cliente
- `atrasada` cria a prorrogacao, atualiza o novo prazo em `locacoes` e `locacao_itens`, e ajusta o vencimento financeiro da locacao

## Relatorios Completos do Dashboard

Use estes endpoints quando precisar de leitura mais detalhada e mais exata para painel administrativo:

- `GET /api/dashboard/financeiro-completo`
- `GET /dashboard/financeiro-completo`
- `GET /financeiro-completo`
- `GET /api/dashboard/produtos-relatorio`
- `GET /api/dashboard/vendas-relatorio`
- `GET /api/dashboard/locacoes-relatorio`
- `GET /api/dashboard/auditoria-integracao`

## Novos Endpoints de Financeiro Completo

### 19. Financeiro Completo com Análise de PIX e Dinheiro

```bash
curl -X GET http://localhost:3000/api/dashboard/financeiro-completo ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Aliases equivalentes para compatibilidade:

```bash
curl -X GET http://localhost:3000/dashboard/financeiro-completo ^
  -H "Authorization: Bearer SEU_TOKEN"

curl -X GET http://localhost:3000/financeiro-completo ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Retorna estrutura completa de financeiro:

```json
{
  "resumo": {
    "total_lancamentos": "50",
    "total_debitos": "15000.00",
    "total_creditos": "3000.00",
    "total_pendente": "5000.00",
    "total_pago": "13000.00",
    "total_cancelado": "0.00"
  },
  "por_origem": [
    {
      "origem": "venda",
      "status": "pago",
      "total_lancamentos": "25",
      "valor_total": "10000.00"
    }
  ],
  "por_cliente": [
    {
      "cliente_id": 2,
      "nome": "Empresa XYZ",
      "total_lancamentos": "8",
      "pendente": "500.00",
      "pago": "3500.00",
      "saldo": "3000.00"
    }
  ],
  "ultimos_lancamentos": [],
  "analise_pix": {
    "total_transacoes_pix": "35",
    "valor_total_pix": "8500.00",
    "valor_medio_pix": "242.86",
    "maior_transacao_pix": "850.00",
    "menor_transacao_pix": "50.00",
    "pix_recebido": "32",
    "pix_pendente": "3",
    "pix_valor_recebido": "8200.00",
    "pix_valor_pendente": "300.00"
  },
  "analise_dinheiro": {
    "total_transacoes_dinheiro": "15",
    "valor_total_dinheiro": "4500.00",
    "valor_medio_dinheiro": "300.00",
    "maior_transacao_dinheiro": "950.00",
    "menor_transacao_dinheiro": "100.00",
    "dinheiro_concluido": "14",
    "dinheiro_nao_concluido": "1",
    "dinheiro_valor_concluido": "4350.00"
  },
  "comparacao_metodos": {
    "total_pix": "8500.00",
    "total_dinheiro": "4500.00",
    "total_cartao": "2500.00",
    "total_outros": "0.00",
    "qtd_pix": "35",
    "qtd_dinheiro": "15",
    "qtd_cartao": "10"
  },
  "fluxo_caixa_diario": [
    {
      "data": "2026-05-12",
      "total_transacoes": "5",
      "valor_dia": "1200.00",
      "transacoes_pix": "3",
      "transacoes_dinheiro": "2",
      "valor_pix_dia": "750.00",
      "valor_dinheiro_dia": "450.00"
    }
  ],
  "saldo_por_cliente": [
    {
      "cliente_id": 2,
      "nome": "Empresa XYZ",
      "total_pago_pix": "3500.00",
      "total_pago_dinheiro": "1500.00",
      "total_pago_geral": "5000.00",
      "qtd_pix": "8",
      "qtd_dinheiro": "4"
    }
  ],
  "tendencia_pagamentos": [
    {
      "mes": "2026-05",
      "transacoes_pix": "35",
      "transacoes_dinheiro": "15",
      "valor_pix_mes": "8500.00",
      "valor_dinheiro_mes": "4500.00"
    }
  ]
}
```

**Elementos principais:**

- **resumo**: Total geral, débitos/créditos, status de pagamento
- **operacoes**: Lista unificada de PIX, dinheiro, creditos e debitos
- **creditos_debitos**: Totais por tipo e status financeiro
- **detalhes_pix / detalhes_dinheiro**: Ultimas transacoes por metodo
- **performance_metodos**: Taxa de sucesso de PIX e dinheiro
- **analise_pix**: Estatísticas completas de transações PIX
- **analise_dinheiro**: Estatísticas completas de transações em dinheiro
- **comparacao_metodos**: PIX vs Dinheiro vs Cartão vs Outros
- **fluxo_caixa_diario**: Movimentação diária dos últimos 30 dias
- **saldo_por_cliente**: Top 30 clientes com separação por método
- **tendencia_pagamentos**: Últimos 12 meses de pagamentos

### 20. Saldo de Caixa em Tempo Real

```bash
curl -X GET http://localhost:3000/api/dashboard/saldo-caixa-real ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Retorna saldo atualizado:

```json
{
  "saldo_caixa": {
    "caixa_pix_recebido": "8200.00",
    "caixa_dinheiro": "4350.00",
    "caixa_cartao": "2300.00",
    "saldo_total_recebido": "14850.00",
    "saldo_pendente_cancelado": "300.00"
  },
  "entradas_pix_hoje": {
    "qtd_pix_hoje": "3",
    "valor_pix_hoje": "750.00"
  },
  "entradas_dinheiro_hoje": {
    "qtd_dinheiro_hoje": "2",
    "valor_dinheiro_hoje": "450.00"
  },
  "resumo_por_hora_hoje": [
    {
      "hora": 9,
      "transacoes_pix": "2",
      "transacoes_dinheiro": "0",
      "valor_pix_hora": "500.00",
      "valor_dinheiro_hora": "0.00"
    },
    {
      "hora": 10,
      "transacoes_pix": "1",
      "transacoes_dinheiro": "2",
      "valor_pix_hora": "250.00",
      "valor_dinheiro_hora": "450.00"
    }
  ],
  "meta_vs_realizado_30dias": [
    {
      "data": "2026-05-12",
      "arrecadacao_pix": "750.00",
      "arrecadacao_dinheiro": "450.00",
      "arrecadacao_total": "1200.00"
    }
  ]
}
```

**Elementos principais:**

- **saldo_caixa**: Saldo total acumulado de todos os métodos
- **entradas_pix_hoje**: Recebimentos PIX do dia atual
- **entradas_dinheiro_hoje**: Recebimentos em dinheiro do dia atual
- **resumo_por_hora_hoje**: Movimentação por hora do dia
- **meta_vs_realizado_30dias**: Comparação de arrecadação dos últimos 30 dias

## Auditoria e Conferencia

### Endpoint de auditoria

`GET /api/dashboard/auditoria-integracao`

Verifica:

- vendas sem itens
- vendas sem financeiro
- vendas sem transacao
- locacoes sem itens
- locacoes sem financeiro
- locacoes sem transacao
- financeiro sem cliente
- transacoes sem produto
- produtos com estoque negativo

### Auditoria SQL direta

```bash
psql -U seu_usuario -d seu_banco -f sql/checks/auditoria_integracao.sql
```

## Testes

Use o guia completo:

- [TESTING_GUIDE.md](/c:/Users/jvang/api/TESTING_GUIDE.md)

Ele contem:

- checklist banco -> API -> dashboard
- payloads prontos
- consultas SQL de validacao
- endpoints recomendados para o front

## UI de Teste

A interface estatica em `public/index.html` oferece:

- login e registro
- venda rapida
- locacao rapida
- atalhos para clientes, produtos, vendas e locacoes
- atalhos para os relatorios e auditorias do dashboard
- construtor generico de requisicoes

## Observacoes Importantes

- a API continua usando o mesmo schema relacional; no Supabase a mudanca principal fica na conexao e no provisionamento do banco
- para producao no Supabase, mantenha `DB_SSL=true`
- para automacao completa, aplique a migration em `sql/migrations`
- sem a migration, parte do fluxo em `transacoes` pode ficar limitado
- o projeto ainda suporta rotas legadas para nao quebrar telas existentes
- erros de validacao agora retornam respostas mais claras em vez de `500` generico sempre que possivel

## Troubleshooting

### Erro ao salvar venda

Verifique:

- se `forma_pagamento` bate com os enums esperados
- se o cliente existe
- se os produtos existem
- se ha estoque suficiente
- se a migration foi aplicada

### Erro em locacao

Verifique:

- se o produto esta com tipo `aluguel` ou `ambos`
- se a data prevista de devolucao e posterior a data de inicio
- se o cliente existe
- se o produto esta ativo

### Dashboard inconsistente

Consulte:

- `GET /api/dashboard/financeiro-completo`
- `GET /api/dashboard/produtos-relatorio`
- `GET /api/dashboard/vendas-relatorio`
- `GET /api/dashboard/locacoes-relatorio`
- `GET /api/dashboard/auditoria-integracao`
- `sql/checks/auditoria_integracao.sql`
