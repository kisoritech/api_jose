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

    const creditosDebitosResult = await pool.query(`
      SELECT
        tipo,
        status,
        COUNT(*) AS total_lancamentos,
        COALESCE(SUM(valor), 0) AS valor_total
      FROM financeiro_clientes
      GROUP BY tipo, status
      ORDER BY tipo, status
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

    const operacoesResult = await pool.query(`
      SELECT
        'venda'::text AS origem_operacao,
        v.forma_pagamento::text AS tipo_operacao,
        v.id AS referencia_id,
        v.cliente_id,
        c.nome AS cliente_nome,
        COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) AS valor,
        v.status::text AS status,
        v.criado_em
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE LOWER(v.forma_pagamento::text) IN ('pix', 'dinheiro', 'cash')

      UNION ALL

      SELECT
        f.origem::text AS origem_operacao,
        f.tipo::text AS tipo_operacao,
        f.referencia_id,
        f.cliente_id,
        c.nome AS cliente_nome,
        f.valor,
        f.status::text AS status,
        f.criado_em
      FROM financeiro_clientes f
      LEFT JOIN clientes c ON c.id = f.cliente_id
      WHERE LOWER(f.tipo::text) IN ('credito', 'debito')

      ORDER BY criado_em DESC
      LIMIT 100
    `);

    const detalhesPixResult = await pool.query(`
      SELECT
        v.id AS venda_id,
        v.criado_em,
        v.status,
        COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) AS valor_pix,
        c.nome AS cliente_nome,
        c.cpf,
        u.nome AS vendedor,
        EXTRACT(EPOCH FROM (NOW() - v.criado_em)) / 86400 AS dias_desde_transacao
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE forma_pagamento IN ('pix', 'PIX')
      ORDER BY v.criado_em DESC
      LIMIT 50
    `);

    const detalhesDinheiroResult = await pool.query(`
      SELECT
        v.id AS venda_id,
        v.criado_em,
        v.status,
        COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) AS valor_dinheiro,
        c.nome AS cliente_nome,
        c.cpf,
        u.nome AS vendedor,
        EXTRACT(EPOCH FROM (NOW() - v.criado_em)) / 86400 AS dias_desde_transacao
      FROM vendas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash')
      ORDER BY v.criado_em DESC
      LIMIT 50
    `);

    const performanceMetodosResult = await pool.query(`
      SELECT
        'pix' AS metodo,
        COUNT(*) AS total_transacoes,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_total,
        COALESCE(AVG(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_medio,
        COUNT(*) FILTER (WHERE status = 'concluida') AS transacoes_concluidas,
        COALESCE(
          ROUND(((COUNT(*) FILTER (WHERE status = 'concluida')::numeric / NULLIF(COUNT(*), 0)) * 100)::numeric, 2),
          0
        ) AS taxa_sucesso
      FROM vendas
      WHERE forma_pagamento IN ('pix', 'PIX')

      UNION ALL

      SELECT
        'dinheiro' AS metodo,
        COUNT(*) AS total_transacoes,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_total,
        COALESCE(AVG(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_medio,
        COUNT(*) FILTER (WHERE status = 'concluida') AS transacoes_concluidas,
        COALESCE(
          ROUND(((COUNT(*) FILTER (WHERE status = 'concluida')::numeric / NULLIF(COUNT(*), 0)) * 100)::numeric, 2),
          0
        ) AS taxa_sucesso
      FROM vendas
      WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash')
    `);

    // Análise de PIX
    const recebimentosPixResult = await pool.query(`
      SELECT
        DATE(criado_em) AS data_recebimento,
        COUNT(*) AS qtd_transacoes,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_recebido,
        COUNT(*) FILTER (WHERE status = 'concluida') AS qtd_concluidas
      FROM vendas
      WHERE forma_pagamento IN ('pix', 'PIX') AND criado_em >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(criado_em)
      ORDER BY data_recebimento DESC
    `);

    const recebimentosDinheiroResult = await pool.query(`
      SELECT
        DATE(criado_em) AS data_recebimento,
        COUNT(*) AS qtd_transacoes,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_recebido,
        COUNT(*) FILTER (WHERE status = 'concluida') AS qtd_concluidas
      FROM vendas
      WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') AND criado_em >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(criado_em)
      ORDER BY data_recebimento DESC
    `);

    const pixResult = await pool.query(`
      SELECT
        COUNT(*) AS total_transacoes_pix,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_total_pix,
        COALESCE(AVG(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_medio_pix,
        COALESCE(MAX(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS maior_transacao_pix,
        COALESCE(MIN(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS menor_transacao_pix,
        COUNT(*) FILTER (WHERE status = 'concluida') AS pix_recebido,
        COUNT(*) FILTER (WHERE status IN ('pendente', 'cancelada')) AS pix_pendente,
        COALESCE(SUM(CASE WHEN status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS pix_valor_recebido,
        COALESCE(SUM(CASE WHEN status IN ('pendente', 'cancelada') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS pix_valor_pendente
      FROM vendas
      WHERE forma_pagamento IN ('pix', 'PIX')
    `);

    // Análise de Dinheiro
    const dinheiroResult = await pool.query(`
      SELECT
        COUNT(*) AS total_transacoes_dinheiro,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_total_dinheiro,
        COALESCE(AVG(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_medio_dinheiro,
        COALESCE(MAX(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS maior_transacao_dinheiro,
        COALESCE(MIN(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS menor_transacao_dinheiro,
        COUNT(*) FILTER (WHERE status = 'concluida') AS dinheiro_concluido,
        COUNT(*) FILTER (WHERE status IN ('pendente', 'cancelada')) AS dinheiro_nao_concluido,
        COALESCE(SUM(CASE WHEN status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS dinheiro_valor_concluido
      FROM vendas
      WHERE forma_pagamento = 'dinheiro' OR forma_pagamento = 'DINHEIRO' OR forma_pagamento = 'cash'
    `);

    // Comparação PIX vs Dinheiro
    const comparacaoResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('pix', 'PIX') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS total_pix,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS total_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('cartao', 'CARTAO', 'card') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS total_cartao,
        COALESCE(SUM(CASE WHEN forma_pagamento NOT IN ('pix', 'PIX', 'dinheiro', 'DINHEIRO', 'cash', 'cartao', 'CARTAO', 'card') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS total_outros,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('pix', 'PIX')) AS qtd_pix,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash')) AS qtd_dinheiro,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('cartao', 'CARTAO', 'card')) AS qtd_cartao
      FROM vendas
      WHERE status = 'concluida'
    `);

    // Fluxo de caixa diário (últimos 30 dias)
    const fluxoCaixaResult = await pool.query(`
      SELECT
        DATE(criado_em) AS data,
        COUNT(*) AS total_transacoes,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_dia,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('pix', 'PIX')) AS transacoes_pix,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash')) AS transacoes_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('pix', 'PIX') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS valor_pix_dia,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS valor_dinheiro_dia
      FROM vendas
      WHERE status = 'concluida' AND criado_em >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(criado_em)
      ORDER BY data DESC
    `);

    // Saldo por cliente - PIX e Dinheiro
    const saldoClienteResult = await pool.query(`
      SELECT
        c.id AS cliente_id,
        c.nome,
        COALESCE(SUM(CASE WHEN v.forma_pagamento IN ('pix', 'PIX') AND v.status = 'concluida' THEN COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) ELSE 0 END), 0) AS total_pago_pix,
        COALESCE(SUM(CASE WHEN v.forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') AND v.status = 'concluida' THEN COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) ELSE 0 END), 0) AS total_pago_dinheiro,
        COALESCE(SUM(CASE WHEN v.status = 'concluida' THEN COALESCE(v.total_final, v.valor_total + COALESCE(v.frete_valor, 0)) ELSE 0 END), 0) AS total_pago_geral,
        COUNT(*) FILTER (WHERE v.forma_pagamento IN ('pix', 'PIX') AND v.status = 'concluida') AS qtd_pix,
        COUNT(*) FILTER (WHERE v.forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') AND v.status = 'concluida') AS qtd_dinheiro
      FROM clientes c
      LEFT JOIN vendas v ON v.cliente_id = c.id
      GROUP BY c.id, c.nome
      HAVING COUNT(*) > 0
      ORDER BY total_pago_geral DESC
      LIMIT 30
    `);

    // Tendência de uso PIX vs Dinheiro (últimos 12 meses)
    const tendenciaResult = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', criado_em), 'YYYY-MM') AS mes,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('pix', 'PIX')) AS transacoes_pix,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash')) AS transacoes_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('pix', 'PIX') AND status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS valor_pix_mes,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') AND status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS valor_dinheiro_mes
      FROM vendas
      WHERE criado_em >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', criado_em)
      ORDER BY mes DESC
    `);

    return {
      resumo: resumoResult.rows[0] || {},
      por_origem: porOrigemResult.rows,
      creditos_debitos: creditosDebitosResult.rows,
      por_cliente: porClienteResult.rows,
      ultimos_lancamentos: ultimosLancamentosResult.rows,
      operacoes: operacoesResult.rows,
      detalhes_pix: detalhesPixResult.rows,
      detalhes_dinheiro: detalhesDinheiroResult.rows,
      performance_metodos: performanceMetodosResult.rows,
      recebimentos_pix_7dias: recebimentosPixResult.rows,
      recebimentos_dinheiro_7dias: recebimentosDinheiroResult.rows,
      analise_pix: pixResult.rows[0] || {},
      analise_dinheiro: dinheiroResult.rows[0] || {},
      comparacao_metodos: comparacaoResult.rows[0] || {},
      fluxo_caixa_diario: fluxoCaixaResult.rows,
      saldo_por_cliente: saldoClienteResult.rows,
      tendencia_pagamentos: tendenciaResult.rows
    };
  });

  if (data === null) return;
  res.json(data);
});
router.get('/saldo-caixa-real', async (req, res) => {
  const data = await safeRun(res, 'saldo de caixa', async () => {
    // Saldo atual de caixa
    const saldoCaixaResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('pix', 'PIX') AND status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS caixa_pix_recebido,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') AND status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS caixa_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('cartao', 'CARTAO', 'card') AND status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS caixa_cartao,
        COALESCE(SUM(CASE WHEN status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS saldo_total_recebido,
        COALESCE(SUM(CASE WHEN status IN ('pendente', 'cancelada') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS saldo_pendente_cancelado
      FROM vendas
    `);

    // Entradas do dia - PIX
    const entradasPixHojeResult = await pool.query(`
      SELECT
        COUNT(*) AS qtd_pix_hoje,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_pix_hoje
      FROM vendas
      WHERE forma_pagamento IN ('pix', 'PIX')
        AND DATE(criado_em) = CURRENT_DATE
        AND status = 'concluida'
    `);

    // Entradas do dia - Dinheiro
    const entradasDinheiroHojeResult = await pool.query(`
      SELECT
        COUNT(*) AS qtd_dinheiro_hoje,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS valor_dinheiro_hoje
      FROM vendas
      WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash')
        AND DATE(criado_em) = CURRENT_DATE
        AND status = 'concluida'
    `);

    // Resumo por hora - hoje
    const resumoPorHoraResult = await pool.query(`
      SELECT
        EXTRACT(HOUR FROM criado_em)::INT AS hora,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('pix', 'PIX')) AS transacoes_pix,
        COUNT(*) FILTER (WHERE forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash')) AS transacoes_dinheiro,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('pix', 'PIX') AND status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS valor_pix_hora,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') AND status = 'concluida' THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS valor_dinheiro_hora
      FROM vendas
      WHERE DATE(criado_em) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM criado_em)
      ORDER BY hora
    `);

    // Meta vs Realizado - Últimos 30 dias
    const metaVsRealizadoResult = await pool.query(`
      SELECT
        DATE(criado_em) AS data,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('pix', 'PIX') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS arrecadacao_pix,
        COALESCE(SUM(CASE WHEN forma_pagamento IN ('dinheiro', 'DINHEIRO', 'cash') THEN COALESCE(total_final, valor_total + COALESCE(frete_valor, 0)) ELSE 0 END), 0) AS arrecadacao_dinheiro,
        COALESCE(SUM(COALESCE(total_final, valor_total + COALESCE(frete_valor, 0))), 0) AS arrecadacao_total
      FROM vendas
      WHERE criado_em >= NOW() - INTERVAL '30 days' AND status = 'concluida'
      GROUP BY DATE(criado_em)
      ORDER BY data DESC
    `);

    return {
      saldo_caixa: saldoCaixaResult.rows[0] || {},
      entradas_pix_hoje: entradasPixHojeResult.rows[0] || {},
      entradas_dinheiro_hoje: entradasDinheiroHojeResult.rows[0] || {},
      resumo_por_hora_hoje: resumoPorHoraResult.rows,
      meta_vs_realizado_30dias: metaVsRealizadoResult.rows
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
