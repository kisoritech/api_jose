const pool = require('../config/database');
const AutomacaoLancamentosService = require('../services/AutomacaoLancamentosService');

function normalizeEnum(value, map) {
  if (value === undefined || value === null) return null;

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return map[normalized] || normalized;
}

function normalizeMoney(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  const cleaned = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/^r\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function normalizeDate(value) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return `${value} 00:00:00`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function mapPgError(error) {
  if (!error) return { status: 500, message: 'Erro ao processar venda' };

  if (error.code === 'P0001') {
    return { status: 400, message: error.message };
  }

  if (error.code === '22P02') {
    return { status: 400, message: 'Um ou mais valores enviados estao em formato invalido.' };
  }

  if (error.code === '23503') {
    return { status: 400, message: 'Cliente, usuario ou produto informado nao existe.' };
  }

  if (error.code === '23514') {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: error.message || 'Erro ao processar venda' };
}

class VendaController {
  async listar(req, res, next) {
    try {
      const result = await pool.query(`
        SELECT
          venda_id AS id,
          criado_em,
          forma_pagamento,
          status,
          valor_total,
          frete_valor,
          total_final,
          cliente_nome,
          vendedor
        FROM vw_vendas_detalhadas
        ORDER BY criado_em DESC, venda_id DESC
      `);

      return res.json(result.rows);
    } catch (err) {
      return next(err);
    }
  }

  async buscar(req, res, next) {
    try {
      const { id } = req.params;
      const vendaResult = await pool.query(`
        SELECT
          v.id,
          v.usuario_id,
          v.cliente_id,
          v.valor_total,
          v.frete_valor,
          v.total_final,
          v.forma_pagamento,
          v.status,
          v.frete_tipo,
          v.frete_status,
          v.codigo_rastreio,
          v.criado_em,
          c.nome AS cliente_nome,
          u.nome AS vendedor
        FROM vendas v
        LEFT JOIN clientes c ON c.id = v.cliente_id
        LEFT JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.id = $1
      `, [id]);

      if (!vendaResult.rows[0]) {
        return res.status(404).json({ error: 'Venda nao encontrada.' });
      }

      const itensResult = await pool.query(`
        SELECT
          vi.id,
          vi.venda_id,
          vi.produto_id,
          p.nome AS produto_nome,
          vi.quantidade,
          vi.valor_unitario,
          vi.valor_total,
          vi.frete_rateado
        FROM venda_itens vi
        LEFT JOIN produtos p ON p.id = vi.produto_id
        WHERE vi.venda_id = $1
        ORDER BY vi.id
      `, [id]);

      return res.json({
        ...vendaResult.rows[0],
        itens: itensResult.rows
      });
    } catch (err) {
      return next(err);
    }
  }

  async criar(req, res, next) {
    const client = await pool.connect();

    try {
      const {
        cliente_id,
        cliente,
        forma_pagamento,
        frete_valor,
        itens,
        items,
        data
      } = req.body;

      const usuario_id = req.user ? req.user.id : null;
      const itensRecebidos = Array.isArray(itens) ? itens : items;
      const formaPagamentoNormalizada = normalizeEnum(forma_pagamento, {
        dinheiro: 'dinheiro',
        pix: 'pix',
        cartao: 'cartao',
        boleto: 'boleto'
      });
      const freteValorNormalizado = normalizeMoney(frete_valor);
      const dataVenda = normalizeDate(data);

      let clienteIdNormalizado = normalizeInteger(cliente_id);
      if (!Number.isInteger(clienteIdNormalizado) && cliente !== undefined) {
        clienteIdNormalizado = normalizeInteger(cliente);
      }

      if (!Number.isInteger(clienteIdNormalizado) || !itensRecebidos || !Array.isArray(itensRecebidos) || itensRecebidos.length === 0) {
        return res.status(400).json({ error: 'Informe o cliente_id e pelo menos um item.' });
      }

      if (!formaPagamentoNormalizada) {
        return res.status(400).json({ error: 'Forma de pagamento e obrigatoria.' });
      }

      if (Number.isNaN(freteValorNormalizado)) {
        return res.status(400).json({ error: 'Frete invalido.' });
      }

      await client.query('BEGIN');

      const itensNormalizados = [];
      let valorTotalCalculado = 0;
      for (const item of itensRecebidos) {
        const quantidade = normalizeInteger(item.quantidade);
        const valorUnitario = normalizeMoney(item.valor_unitario ?? item.valor ?? item.preco ?? item.preco_venda);
        let produtoId = normalizeInteger(item.produto_id ?? item.id_produto ?? item.produto);

        if (!Number.isInteger(produtoId) && item.produto_nome) {
          const produtoPorNome = await client.query(
            'SELECT id FROM produtos WHERE lower(nome) = lower($1) LIMIT 1',
            [String(item.produto_nome).trim()]
          );
          produtoId = produtoPorNome.rows[0]?.id;
        }

        if (!Number.isInteger(produtoId) && typeof item.produto === 'string') {
          const produtoPorNome = await client.query(
            'SELECT id FROM produtos WHERE lower(nome) = lower($1) LIMIT 1',
            [String(item.produto).trim()]
          );
          produtoId = produtoPorNome.rows[0]?.id;
        }

        if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade <= 0 || !Number.isFinite(valorUnitario) || valorUnitario <= 0) {
          throw { status: 400, message: 'Cada item deve ter produto_id, quantidade e valor_unitario validos.' };
        }

        itensNormalizados.push({
          produto_id: produtoId,
          quantidade,
          valor_unitario: valorUnitario
        });

        valorTotalCalculado += quantidade * valorUnitario;
      }

      let sqlVenda = `
        INSERT INTO vendas
        (usuario_id, cliente_id, valor_total, forma_pagamento, frete_valor, status)
        VALUES ($1, $2, $3, $4, $5, 'concluida')
        RETURNING id
      `;
      let valuesVenda = [usuario_id, clienteIdNormalizado, valorTotalCalculado, formaPagamentoNormalizada, freteValorNormalizado];

      if (dataVenda) {
        sqlVenda = `
          INSERT INTO vendas
          (usuario_id, cliente_id, valor_total, forma_pagamento, frete_valor, status, criado_em)
          VALUES ($1, $2, $3, $4, $5, 'concluida', $6)
          RETURNING id
        `;
        valuesVenda = [usuario_id, clienteIdNormalizado, valorTotalCalculado, formaPagamentoNormalizada, freteValorNormalizado, dataVenda];
      }

      const resVenda = await client.query(sqlVenda, valuesVenda);
      const vendaId = resVenda.rows[0].id;

      const sqlItem = `
        INSERT INTO venda_itens
        (venda_id, produto_id, quantidade, valor_unitario)
        VALUES ($1, $2, $3, $4)
      `;

      for (const item of itensNormalizados) {
        await client.query(sqlItem, [
          vendaId,
          item.produto_id,
          item.quantidade,
          item.valor_unitario
        ]);

        await AutomacaoLancamentosService.registrarTransacao(client, {
          produto_id: item.produto_id,
          usuario_id,
          cliente_id: clienteIdNormalizado,
          tipo: 'saida',
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          origem: 'venda',
          referencia_id: vendaId,
          criado_em: dataVenda,
          observacao: `Venda #${vendaId}`
        });
      }

      await AutomacaoLancamentosService.garantirFinanceiroCliente(client, {
        cliente_id: clienteIdNormalizado,
        tipo: 'debito',
        origem: 'venda',
        referencia_id: vendaId,
        valor: valorTotalCalculado + freteValorNormalizado,
        vencimento: dataVenda ? String(dataVenda).slice(0, 10) : null,
        status: 'pendente'
      });

      await client.query('COMMIT');

      const resFinal = await client.query(`
        SELECT
          v.*,
          c.nome AS cliente_nome,
          u.nome AS vendedor
        FROM vendas v
        LEFT JOIN clientes c ON c.id = v.cliente_id
        LEFT JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.id = $1
      `, [vendaId]);

      return res.status(201).json(resFinal.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro na venda:', error);

      const mapped = error.status
        ? { status: error.status, message: error.message }
        : mapPgError(error);

      return res.status(mapped.status).json({ error: mapped.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new VendaController();
