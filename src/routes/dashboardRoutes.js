const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

const columnCache = new Map();

async function hasColumn(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnCache.has(cacheKey)) {
    return columnCache.get(cacheKey);
  }

  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS exists
  `, [tableName, columnName]);

  const exists = Boolean(result.rows[0]?.exists);
  columnCache.set(cacheKey, exists);
  return exists;
}

async function safeRun(res, label, fn) {
  try {
    return await fn();
  } catch (error) {
    console.error(`Erro ao buscar ${label}:`, error);
    res.status(500).json({ error: `Erro ao buscar ${label}.` });
    return null;
  }
}

router.get('/resumo', async (req, res) => {
  const data = await safeRun(res, 'resumo do dashboard', async () => {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM clientes WHERE ativo = true) AS total_clientes,
        (SELECT COUNT(*) FROM produtos WHERE ativo = true) AS total_produtos,
        (SELECT COUNT(*) FROM produtos WHERE quantidade > 0 AND ativo = true) AS produtos_disponiveis,
        COALESCE((SELECT SUM(total_final) FROM vendas WHERE status = 'concluida'), 0) AS faturamento_total,
        COALESCE((SELECT COUNT(*) FROM locacoes WHERE status IN ('ativa', 'atrasada')), 0) AS locacoes_ativas
    `);

    return result.rows[0] || {};
  });

  if (data === null) return;
  res.json(data);
});

router.get('/estoque', async (req, res) => {
  const data = await safeRun(res, 'status de estoque', async () => {
    const result = await pool.query(`
      SELECT
        id,
        nome,
        tipo,
        quantidade,
        CASE
          WHEN quantidade = 0 THEN 'esgotado'
          WHEN quantidade <= 2 THEN 'baixo'
          ELSE 'normal'
        END AS status_estoque
      FROM produtos
      WHERE ativo = true
      ORDER BY nome
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/estoque-resumido', async (req, res) => {
  const data = await safeRun(res, 'resumo de estoque', async () => {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_produtos,
        SUM(CASE WHEN quantidade = 0 THEN 1 ELSE 0 END) AS produtos_esgotados,
        SUM(CASE WHEN quantidade > 0 AND quantidade <= 2 THEN 1 ELSE 0 END) AS produtos_baixo_estoque,
        SUM(CASE WHEN quantidade > 2 THEN 1 ELSE 0 END) AS produtos_estoque_normal,
        COALESCE(SUM(quantidade), 0) AS total_itens_estoque
      FROM produtos
      WHERE ativo = true
    `);

    return result.rows[0] || {};
  });

  if (data === null) return;
  res.json(data);
});

router.get('/vendas-detalhadas', async (req, res) => {
  const data = await safeRun(res, 'vendas detalhadas', async () => {
    const result = await pool.query(`
      SELECT
        v.id AS venda_id,
        v.criado_em,
        v.forma_pagamento,
        v.status,
        v.valor_total,
        COALESCE(v.frete_valor, 0) AS frete_valor,
        COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) AS total_final,
        c.nome AS cliente_nome,
        c.cpf,
        u.nome AS vendedor
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      ORDER BY v.criado_em DESC
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/produtos-mais-vendidos', async (req, res) => {
  const data = await safeRun(res, 'produtos mais vendidos', async () => {
    const result = await pool.query(`
      SELECT
        p.id,
        p.nome,
        COALESCE(SUM(vi.quantidade), 0) AS total_vendido
      FROM produtos p
      LEFT JOIN venda_itens vi ON vi.produto_id = p.id
      GROUP BY p.id, p.nome
      ORDER BY total_vendido DESC, p.nome
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/locacoes-ativas', async (req, res) => {
  const data = await safeRun(res, 'locacoes ativas', async () => {
    const result = await pool.query(`
      SELECT
        l.id,
        p.nome AS produto,
        c.nome AS cliente,
        l.quantidade,
        l.valor_total,
        l.data_inicio,
        l.data_prevista_devolucao,
        CASE
          WHEN l.data_prevista_devolucao < NOW() THEN CURRENT_DATE - l.data_prevista_devolucao::date
          ELSE 0
        END AS dias_atraso,
        l.status
      FROM locacoes l
      LEFT JOIN produtos p ON p.id = l.produto_id
      LEFT JOIN clientes c ON c.id = l.cliente_id
      WHERE l.status IN ('ativa', 'atrasada')
      ORDER BY dias_atraso DESC, l.id DESC
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/financeiro-clientes', async (req, res) => {
  const data = await safeRun(res, 'financeiro de clientes', async () => {
    const result = await pool.query(`
      SELECT
        c.id AS cliente_id,
        c.nome,
        COALESCE(SUM(
          CASE
            WHEN f.tipo = 'debito' AND f.status = 'pendente' THEN f.valor
            ELSE 0
          END
        ), 0) AS total_em_aberto
      FROM clientes c
      LEFT JOIN financeiro_clientes f ON f.cliente_id = c.id
      GROUP BY c.id, c.nome
      ORDER BY total_em_aberto DESC, c.nome
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/cliente-historico/:clienteId', async (req, res) => {
  const data = await safeRun(res, 'historico do cliente', async () => {
    const result = await pool.query(`
      SELECT
        c.id AS cliente_id,
        c.nome,
        v.id AS venda_id,
        v.criado_em,
        COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) AS total_venda
      FROM clientes c
      LEFT JOIN vendas v ON v.cliente_id = c.id
      WHERE c.id = $1
      ORDER BY v.criado_em DESC NULLS LAST
    `, [req.params.clienteId]);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/venda-itens-margem', async (req, res) => {
  const data = await safeRun(res, 'margem de itens', async () => {
    const result = await pool.query(`
      SELECT
        vi.id,
        vi.venda_id,
        p.nome AS produto,
        vi.quantidade,
        vi.valor_unitario,
        vi.valor_total,
        p.preco_custo,
        vi.valor_unitario - p.preco_custo AS lucro_unitario,
        vi.valor_total - (p.preco_custo * vi.quantidade::numeric) AS lucro_total
      FROM venda_itens vi
      JOIN produtos p ON p.id = vi.produto_id
      ORDER BY vi.venda_id DESC, vi.id DESC
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/movimentacao-geral', async (req, res) => {
  const data = await safeRun(res, 'movimentacao geral', async () => {
    const transacoesTemOrigem = await hasColumn('transacoes', 'origem');
    const transacoesTemClienteId = await hasColumn('transacoes', 'cliente_id');

    const transacaoTipo = transacoesTemOrigem ? `COALESCE(t.origem::text, 'transacao')` : `'transacao'`;
    const transacaoClienteId = transacoesTemClienteId ? 't.cliente_id' : 'NULL::BIGINT';
    const transacaoClienteJoin = transacoesTemClienteId ? 'LEFT JOIN clientes c ON c.id = t.cliente_id' : 'LEFT JOIN clientes c ON false';

    const result = await pool.query(`
      SELECT
        'venda' AS tipo,
        v.id,
        v.cliente_id,
        c.nome AS cliente_nome,
        COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) AS valor,
        v.criado_em,
        v.status::text AS status,
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
        ${transacaoTipo} AS tipo,
        t.id,
        ${transacaoClienteId} AS cliente_id,
        c.nome AS cliente_nome,
        t.valor_total AS valor,
        t.criado_em,
        t.tipo::text AS status,
        t.produto_id,
        p.nome AS produto_nome
      FROM transacoes t
      ${transacaoClienteJoin}
      LEFT JOIN produtos p ON p.id = t.produto_id

      ORDER BY criado_em DESC, id DESC
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/resumo-operacional', async (req, res) => {
  const data = await safeRun(res, 'resumo operacional', async () => {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM vendas WHERE status = 'concluida') AS total_vendas,
        (SELECT COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) FROM vendas WHERE status = 'concluida') AS faturamento_vendas,
        (SELECT COUNT(*) FROM locacoes WHERE status IN ('ativa', 'atrasada')) AS locacoes_em_aberto,
        (SELECT COALESCE(SUM(valor_total), 0) FROM locacoes WHERE status IN ('ativa', 'atrasada')) AS valor_locacoes_abertas,
        (SELECT COUNT(*) FROM transacoes WHERE tipo = 'saida') AS total_saidas_estoque,
        (SELECT COUNT(*) FROM transacoes WHERE tipo = 'entrada') AS total_entradas_estoque,
        (SELECT COALESCE(SUM(valor), 0) FROM financeiro_clientes WHERE status = 'pendente') AS financeiro_pendente,
        (SELECT COALESCE(SUM(valor), 0) FROM financeiro_clientes WHERE status = 'pago') AS financeiro_recebido
    `);

    return result.rows[0] || {};
  });

  if (data === null) return;
  res.json(data);
});

router.get('/financeiro-origens', async (req, res) => {
  const data = await safeRun(res, 'financeiro por origem', async () => {
    const result = await pool.query(`
      SELECT
        origem,
        status,
        COUNT(*) AS total_lancamentos,
        COALESCE(SUM(valor), 0) AS valor_total
      FROM financeiro_clientes
      GROUP BY origem, status
      ORDER BY origem, status
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/financeiro-completo', async (req, res) => {
  const data = await safeRun(res, 'financeiro completo', async () => {
    const resumoResult = await pool.query(`
      SELECT
        COUNT(*) AS total_lancamentos,
        COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor ELSE 0 END), 0) AS total_debitos,
        COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor ELSE 0 END), 0) AS total_creditos,
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END), 0) AS total_pendente,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END), 0) AS total_pago,
        COALESCE(SUM(CASE WHEN status = 'cancelado' THEN valor ELSE 0 END), 0) AS total_cancelado
      FROM financeiro_clientes
    `);

    const porOrigemResult = await pool.query(`
      SELECT
        origem,
        status,
        COUNT(*) AS total_lancamentos,
        COALESCE(SUM(valor), 0) AS valor_total
      FROM financeiro_clientes
      GROUP BY origem, status
      ORDER BY origem, status
    `);

    const porClienteResult = await pool.query(`
      SELECT
        c.id AS cliente_id,
        c.nome,
        COUNT(f.id) AS total_lancamentos,
        COALESCE(SUM(CASE WHEN f.status = 'pendente' THEN f.valor ELSE 0 END), 0) AS pendente,
        COALESCE(SUM(CASE WHEN f.status = 'pago' THEN f.valor ELSE 0 END), 0) AS pago,
        COALESCE(SUM(CASE WHEN f.tipo = 'debito' THEN f.valor ELSE -f.valor END), 0) AS saldo
      FROM clientes c
      LEFT JOIN financeiro_clientes f ON f.cliente_id = c.id
      GROUP BY c.id, c.nome
      ORDER BY pendente DESC, c.nome
    `);

    const ultimosLancamentosResult = await pool.query(`
      SELECT
        f.id,
        f.cliente_id,
        c.nome AS cliente_nome,
        f.tipo,
        f.origem,
        f.referencia_id,
        f.valor,
        f.vencimento,
        f.status,
        f.criado_em
      FROM financeiro_clientes f
      LEFT JOIN clientes c ON c.id = f.cliente_id
      ORDER BY f.criado_em DESC, f.id DESC
      LIMIT 50
    `);

    return {
      resumo: resumoResult.rows[0] || {},
      por_origem: porOrigemResult.rows,
      por_cliente: porClienteResult.rows,
      ultimos_lancamentos: ultimosLancamentosResult.rows
    };
  });

  if (data === null) return;
  res.json(data);
});

router.get('/produtos-relatorio', async (req, res) => {
  const data = await safeRun(res, 'relatorio de produtos', async () => {
    const result = await pool.query(`
      SELECT
        p.id,
        p.nome,
        p.tipo,
        p.ativo,
        p.quantidade AS estoque_atual,
        p.preco_custo,
        p.preco_venda,
        p.valor_locacao,
        COALESCE(vendas.total_vendido, 0) AS total_vendido,
        COALESCE(vendas.receita_vendas, 0) AS receita_vendas,
        COALESCE(loc.total_locado, 0) AS total_locado,
        COALESCE(loc.receita_locacoes, 0) AS receita_locacoes,
        CASE
          WHEN p.quantidade = 0 THEN 'esgotado'
          WHEN p.quantidade <= 2 THEN 'baixo'
          ELSE 'normal'
        END AS status_estoque
      FROM produtos p
      LEFT JOIN (
        SELECT
          produto_id,
          SUM(quantidade) AS total_vendido,
          SUM(valor_total) AS receita_vendas
        FROM venda_itens
        GROUP BY produto_id
      ) vendas ON vendas.produto_id = p.id
      LEFT JOIN (
        SELECT
          produto_id,
          SUM(quantidade) AS total_locado,
          SUM(valor_total) AS receita_locacoes
        FROM locacao_itens
        GROUP BY produto_id
      ) loc ON loc.produto_id = p.id
      ORDER BY p.nome
    `);

    return result.rows;
  });

  if (data === null) return;
  res.json(data);
});

router.get('/vendas-relatorio', async (req, res) => {
  const data = await safeRun(res, 'relatorio de vendas', async () => {
    const resumoResult = await pool.query(`
      SELECT
        COUNT(*) AS total_vendas,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS faturamento_total,
        COALESCE(SUM(valor_total), 0) AS subtotal_produtos,
        COALESCE(SUM(COALESCE(frete_valor, 0)), 0) AS total_frete,
        COALESCE(AVG(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS ticket_medio
      FROM vendas
      WHERE status = 'concluida'
    `);

    const porPagamentoResult = await pool.query(`
      SELECT
        forma_pagamento,
        COUNT(*) AS total_vendas,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_total
      FROM vendas
      GROUP BY forma_pagamento
      ORDER BY valor_total DESC
    `);

    const listaResult = await pool.query(`
      SELECT
        v.id AS venda_id,
        v.criado_em,
        v.status,
        v.forma_pagamento,
        v.valor_total,
        COALESCE(v.frete_valor, 0) AS frete_valor,
        COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) AS total_final,
        c.nome AS cliente_nome,
        u.nome AS vendedor,
        COUNT(vi.id) AS total_itens,
        COALESCE(SUM(vi.quantidade), 0) AS total_quantidades
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN venda_itens vi ON vi.venda_id = v.id
      GROUP BY v.id, c.nome, u.nome
      ORDER BY v.criado_em DESC, v.id DESC
      LIMIT 100
    `);

    return {
      resumo: resumoResult.rows[0] || {},
      por_forma_pagamento: porPagamentoResult.rows,
      vendas: listaResult.rows
    };
  });

  if (data === null) return;
  res.json(data);
});

router.get('/locacoes-relatorio', async (req, res) => {
  const data = await safeRun(res, 'relatorio de locacoes', async () => {
    const resumoResult = await pool.query(`
      SELECT
        COUNT(*) AS total_locacoes,
        COALESCE(SUM(valor_total), 0) AS valor_total_locado,
        COUNT(*) FILTER (WHERE status = 'ativa') AS ativas,
        COUNT(*) FILTER (WHERE status = 'atrasada') AS atrasadas,
        COUNT(*) FILTER (WHERE status = 'devolvida') AS devolvidas,
        COUNT(*) FILTER (WHERE status = 'cancelada') AS canceladas
      FROM locacoes
    `);

    const porStatusResult = await pool.query(`
      SELECT
        status,
        COUNT(*) AS total_locacoes,
        COALESCE(SUM(valor_total), 0) AS valor_total
      FROM locacoes
      GROUP BY status
      ORDER BY total_locacoes DESC
    `);

    const listaResult = await pool.query(`
      SELECT
        l.id,
        l.criado_em,
        l.status,
        l.quantidade,
        l.valor_unitario,
        l.valor_total,
        l.data_inicio,
        l.data_prevista_devolucao,
        l.data_devolucao,
        CASE
          WHEN l.data_prevista_devolucao < NOW() AND l.status IN ('ativa', 'atrasada')
            THEN CURRENT_DATE - l.data_prevista_devolucao::date
          ELSE 0
        END AS dias_atraso,
        c.nome AS cliente_nome,
        p.nome AS produto_nome,
        u.nome AS usuario_nome
      FROM locacoes l
      LEFT JOIN clientes c ON c.id = l.cliente_id
      LEFT JOIN produtos p ON p.id = l.produto_id
      LEFT JOIN usuarios u ON u.id = l.usuario_id
      ORDER BY l.criado_em DESC, l.id DESC
      LIMIT 100
    `);

    return {
      resumo: resumoResult.rows[0] || {},
      por_status: porStatusResult.rows,
      locacoes: listaResult.rows
    };
  });

  if (data === null) return;
  res.json(data);
});

router.get('/auditoria-integracao', async (req, res) => {
  const data = await safeRun(res, 'auditoria de integracao', async () => {
    const financeiroTemReferencia = await hasColumn('financeiro_clientes', 'referencia_id');
    const transacoesTemOrigem = await hasColumn('transacoes', 'origem');
    const transacoesTemReferencia = await hasColumn('transacoes', 'referencia_id');

    const vendasSemFinanceiro = financeiroTemReferencia
      ? `(SELECT COUNT(*) FROM vendas v LEFT JOIN financeiro_clientes f ON f.origem = 'venda' AND f.referencia_id = v.id WHERE f.id IS NULL)`
      : '0';

    const locacoesSemFinanceiro = financeiroTemReferencia
      ? `(SELECT COUNT(*) FROM locacoes l LEFT JOIN financeiro_clientes f ON f.origem = 'locacao' AND f.referencia_id = l.id WHERE f.id IS NULL)`
      : '0';

    const vendasSemTransacao = transacoesTemOrigem && transacoesTemReferencia
      ? `(SELECT COUNT(*) FROM vendas v LEFT JOIN transacoes t ON t.origem = 'venda' AND t.referencia_id = v.id WHERE t.id IS NULL)`
      : '0';

    const locacoesSemTransacao = transacoesTemOrigem && transacoesTemReferencia
      ? `(SELECT COUNT(*) FROM locacoes l LEFT JOIN transacoes t ON t.origem = 'locacao' AND t.referencia_id = l.id WHERE t.id IS NULL)`
      : '0';

    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM vendas v LEFT JOIN venda_itens vi ON vi.venda_id = v.id WHERE vi.id IS NULL) AS vendas_sem_itens,
        ${vendasSemFinanceiro} AS vendas_sem_financeiro,
        ${vendasSemTransacao} AS vendas_sem_transacao,
        (SELECT COUNT(*) FROM locacoes l LEFT JOIN locacao_itens li ON li.locacao_id = l.id WHERE li.id IS NULL) AS locacoes_sem_itens,
        ${locacoesSemFinanceiro} AS locacoes_sem_financeiro,
        ${locacoesSemTransacao} AS locacoes_sem_transacao,
        (SELECT COUNT(*) FROM financeiro_clientes f LEFT JOIN clientes c ON c.id = f.cliente_id WHERE c.id IS NULL) AS financeiro_sem_cliente,
        (SELECT COUNT(*) FROM transacoes t LEFT JOIN produtos p ON p.id = t.produto_id WHERE p.id IS NULL) AS transacoes_sem_produto,
        (SELECT COUNT(*) FROM produtos WHERE quantidade < 0) AS produtos_estoque_negativo
    `);

    return result.rows[0] || {};
  });

  if (data === null) return;
  res.json(data);
});

module.exports = router;
