const tableColumnsCache = new Map();
const tableExistsCache = new Map();

async function tableExists(client, tableName) {
  const cacheKey = tableName;
  if (tableExistsCache.has(cacheKey)) {
    return tableExistsCache.get(cacheKey);
  }

  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
    ) AS exists
  `, [tableName]);

  const exists = Boolean(result.rows[0]?.exists);
  tableExistsCache.set(cacheKey, exists);
  return exists;
}

async function getTableColumns(client, tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }

  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
  `, [tableName]);

  const columns = new Set(result.rows.map((row) => row.column_name));
  tableColumnsCache.set(tableName, columns);
  return columns;
}

async function tableHasColumn(client, tableName, columnName) {
  const columns = await getTableColumns(client, tableName);
  return columns.has(columnName);
}

class AutomacaoLancamentosService {
  async registrarTransacao(client, payload) {
    const transacoesExiste = await tableExists(client, 'transacoes');
    if (!transacoesExiste) return { skipped: true, reason: 'Tabela transacoes inexistente.' };

    const columns = await getTableColumns(client, 'transacoes');
    const hasOrigem = columns.has('origem');

    if (payload.origem === 'venda' && !hasOrigem) {
      return { skipped: true, reason: 'Schema antigo sem coluna origem em transacoes.' };
    }

    const insertColumns = ['produto_id', 'usuario_id', 'tipo', 'quantidade', 'valor_unitario'];
    const values = [
      payload.produto_id,
      payload.usuario_id,
      payload.tipo,
      payload.quantidade,
      payload.valor_unitario
    ];

    if (columns.has('observacao')) {
      insertColumns.push('observacao');
      values.push(payload.observacao || null);
    }

    if (columns.has('criado_em') && payload.criado_em) {
      insertColumns.push('criado_em');
      values.push(payload.criado_em);
    }

    if (columns.has('cliente_id')) {
      insertColumns.push('cliente_id');
      values.push(payload.cliente_id ?? null);
    }

    if (columns.has('origem')) {
      insertColumns.push('origem');
      values.push(payload.origem ?? null);
    }

    if (columns.has('referencia_id')) {
      insertColumns.push('referencia_id');
      values.push(payload.referencia_id ?? null);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      INSERT INTO transacoes (${insertColumns.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `;

    const result = await client.query(query, values);
    return result.rows[0] || null;
  }

  async garantirFinanceiroCliente(client, payload) {
    const financeiroExiste = await tableExists(client, 'financeiro_clientes');
    if (!financeiroExiste) return { skipped: true, reason: 'Tabela financeiro_clientes inexistente.' };

    const existing = await client.query(`
      SELECT id
      FROM financeiro_clientes
      WHERE cliente_id = $1
        AND origem = $2
        AND referencia_id = $3
      LIMIT 1
    `, [payload.cliente_id, payload.origem, payload.referencia_id]);

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const result = await client.query(`
      INSERT INTO financeiro_clientes (
        cliente_id,
        tipo,
        origem,
        referencia_id,
        valor,
        vencimento,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      payload.cliente_id,
      payload.tipo || 'debito',
      payload.origem,
      payload.referencia_id,
      payload.valor,
      payload.vencimento || null,
      payload.status || 'pendente'
    ]);

    return result.rows[0] || null;
  }

  async garantirLocacaoItem(client, payload) {
    const locacaoItensExiste = await tableExists(client, 'locacao_itens');
    if (!locacaoItensExiste) return { skipped: true, reason: 'Tabela locacao_itens inexistente.' };

    const existing = await client.query(`
      SELECT id
      FROM locacao_itens
      WHERE locacao_id = $1
        AND produto_id = $2
      LIMIT 1
    `, [payload.locacao_id, payload.produto_id]);

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const result = await client.query(`
      INSERT INTO locacao_itens (
        locacao_id,
        produto_id,
        quantidade,
        valor_unitario,
        valor_total,
        data_prevista_devolucao,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      payload.locacao_id,
      payload.produto_id,
      payload.quantidade,
      payload.valor_unitario,
      payload.valor_total,
      payload.data_prevista_devolucao,
      payload.status || 'alugado'
    ]);

    return result.rows[0] || null;
  }
}

module.exports = new AutomacaoLancamentosService();
