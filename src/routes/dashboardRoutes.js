const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

async function safeQuery(res, label, query, params = [], pick = 'rows') {
  try {
    const result = await pool.query(query, params);
    return pick === 'row' ? result.rows[0] || null : result.rows;
  } catch (error) {
    console.error(`Erro ao buscar ${label}:`, error);
    res.status(500).json({ error: `Erro ao buscar ${label}.` });
    return null;
  }
}

router.get('/resumo', async (req, res) => {
  const data = await safeQuery(
    res,
    'resumo do dashboard',
    'SELECT * FROM vw_dashboard_resumo',
    [],
    'row'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/estoque', async (req, res) => {
  const data = await safeQuery(
    res,
    'status de estoque',
    'SELECT * FROM vw_estoque_resumo ORDER BY nome'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/estoque-resumido', async (req, res) => {
  const data = await safeQuery(
    res,
    'resumo de estoque',
    'SELECT * FROM vw_dashboard_estoque',
    [],
    'row'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/vendas-detalhadas', async (req, res) => {
  const data = await safeQuery(
    res,
    'vendas detalhadas',
    'SELECT * FROM vw_vendas_detalhadas ORDER BY criado_em DESC'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/produtos-mais-vendidos', async (req, res) => {
  const data = await safeQuery(
    res,
    'produtos mais vendidos',
    'SELECT * FROM vw_produtos_mais_vendidos ORDER BY total_vendido DESC'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/locacoes-ativas', async (req, res) => {
  const data = await safeQuery(
    res,
    'locacoes ativas',
    'SELECT * FROM vw_locacoes_ativas ORDER BY dias_atraso DESC'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/financeiro-clientes', async (req, res) => {
  const data = await safeQuery(
    res,
    'financeiro de clientes',
    'SELECT * FROM vw_financeiro_clientes ORDER BY total_em_aberto DESC'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/cliente-historico/:clienteId', async (req, res) => {
  const data = await safeQuery(
    res,
    'historico do cliente',
    'SELECT * FROM vw_cliente_historico WHERE cliente_id = $1 ORDER BY criado_em DESC',
    [req.params.clienteId]
  );
  if (data === null) return;
  res.json(data);
});

router.get('/venda-itens-margem', async (req, res) => {
  const data = await safeQuery(
    res,
    'margem de itens',
    'SELECT * FROM vw_venda_itens_margem ORDER BY venda_id DESC'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/movimentacao-geral', async (req, res) => {
  const data = await safeQuery(
    res,
    'movimentacao geral',
    `
      SELECT
        'venda' AS tipo,
        v.id,
        v.cliente_id,
        c.nome AS cliente_nome,
        v.total_final AS valor,
        v.criado_em,
        v.status,
        NULL::BIGINT AS produto_id,
        NULL::VARCHAR AS produto_nome
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id

      UNION ALL

      SELECT
        'locacao' AS tipo,
        l.id,
        l.cliente_id,
        c.nome AS cliente_nome,
        l.valor_total AS valor,
        l.criado_em,
        l.status::text AS status,
        l.produto_id,
        p.nome AS produto_nome
      FROM locacoes l
      LEFT JOIN clientes c ON c.id = l.cliente_id
      LEFT JOIN produtos p ON p.id = l.produto_id

      UNION ALL

      SELECT
        COALESCE(t.origem::text, 'transacao') AS tipo,
        t.id,
        t.cliente_id,
        c.nome AS cliente_nome,
        t.valor_total AS valor,
        t.criado_em,
        t.tipo::text AS status,
        t.produto_id,
        p.nome AS produto_nome
      FROM transacoes t
      LEFT JOIN clientes c ON c.id = t.cliente_id
      LEFT JOIN produtos p ON p.id = t.produto_id

      ORDER BY criado_em DESC, id DESC
    `
  );
  if (data === null) return;
  res.json(data);
});

router.get('/resumo-operacional', async (req, res) => {
  const data = await safeQuery(
    res,
    'resumo operacional',
    `
      SELECT
        (SELECT COUNT(*) FROM vendas WHERE status = 'concluida') AS total_vendas,
        (SELECT COALESCE(SUM(total_final), 0) FROM vendas WHERE status = 'concluida') AS faturamento_vendas,
        (SELECT COUNT(*) FROM locacoes WHERE status IN ('ativa', 'atrasada')) AS locacoes_em_aberto,
        (SELECT COALESCE(SUM(valor_total), 0) FROM locacoes WHERE status IN ('ativa', 'atrasada')) AS valor_locacoes_abertas,
        (SELECT COUNT(*) FROM transacoes WHERE tipo = 'saida') AS total_saidas_estoque,
        (SELECT COUNT(*) FROM transacoes WHERE tipo = 'entrada') AS total_entradas_estoque,
        (SELECT COALESCE(SUM(valor), 0) FROM financeiro_clientes WHERE status = 'pendente') AS financeiro_pendente,
        (SELECT COALESCE(SUM(valor), 0) FROM financeiro_clientes WHERE status = 'pago') AS financeiro_recebido
    `,
    [],
    'row'
  );
  if (data === null) return;
  res.json(data);
});

router.get('/financeiro-origens', async (req, res) => {
  const data = await safeQuery(
    res,
    'financeiro por origem',
    `
      SELECT
        origem,
        status,
        COUNT(*) AS total_lancamentos,
        COALESCE(SUM(valor), 0) AS valor_total
      FROM financeiro_clientes
      GROUP BY origem, status
      ORDER BY origem, status
    `
  );
  if (data === null) return;
  res.json(data);
});

router.get('/auditoria-integracao', async (req, res) => {
  const data = await safeQuery(
    res,
    'auditoria de integracao',
    `
      SELECT
        (SELECT COUNT(*)
         FROM vendas v
         LEFT JOIN venda_itens vi ON vi.venda_id = v.id
         WHERE vi.id IS NULL) AS vendas_sem_itens,

        (SELECT COUNT(*)
         FROM vendas v
         LEFT JOIN financeiro_clientes f
           ON f.origem = 'venda'
          AND f.referencia_id = v.id
         WHERE f.id IS NULL) AS vendas_sem_financeiro,

        (SELECT COUNT(*)
         FROM vendas v
         LEFT JOIN transacoes t
           ON t.origem = 'venda'
          AND t.referencia_id = v.id
         WHERE t.id IS NULL) AS vendas_sem_transacao,

        (SELECT COUNT(*)
         FROM locacoes l
         LEFT JOIN locacao_itens li ON li.locacao_id = l.id
         WHERE li.id IS NULL) AS locacoes_sem_itens,

        (SELECT COUNT(*)
         FROM locacoes l
         LEFT JOIN financeiro_clientes f
           ON f.origem = 'locacao'
          AND f.referencia_id = l.id
         WHERE f.id IS NULL) AS locacoes_sem_financeiro,

        (SELECT COUNT(*)
         FROM locacoes l
         LEFT JOIN transacoes t
           ON t.origem = 'locacao'
          AND t.referencia_id = l.id
         WHERE t.id IS NULL) AS locacoes_sem_transacao,

        (SELECT COUNT(*)
         FROM financeiro_clientes f
         LEFT JOIN clientes c ON c.id = f.cliente_id
         WHERE c.id IS NULL) AS financeiro_sem_cliente,

        (SELECT COUNT(*)
         FROM transacoes t
         LEFT JOIN produtos p ON p.id = t.produto_id
         WHERE p.id IS NULL) AS transacoes_sem_produto,

        (SELECT COUNT(*)
         FROM produtos
         WHERE quantidade < 0) AS produtos_estoque_negativo
    `,
    [],
    'row'
  );
  if (data === null) return;
  res.json(data);
});

module.exports = router;
