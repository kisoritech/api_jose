const pool = require('../config/database');
const AutomacaoLancamentosService = require('../services/AutomacaoLancamentosService');

function normalizeMoney(value, fallback = NaN) {
  if (value === undefined || value === null || value === '') return fallback;
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

function normalizeInteger(value, fallback = NaN) {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function mapProdutoError(error) {
  if (error?.code === '23503') {
    return { status: 400, message: 'Usuario informado nao existe para registrar o produto.' };
  }

  if (error?.code === '23505') {
    return { status: 400, message: 'Ja existe um produto com o codigo de barras informado.' };
  }

  if (error?.code === '22P02') {
    return { status: 400, message: 'Um ou mais campos numericos foram enviados em formato invalido.' };
  }

  if (error?.code === '23514') {
    return { status: 400, message: error.message };
  }

  return { status: 500, message: error?.message || 'Erro ao salvar produto.' };
}

class ProdutoController {
  async listar(req, res, next) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, nome, descricao, preco_venda, preco_custo, valor_locacao, quantidade AS estoque, tipo, codigo_barras, ativo FROM produtos'
      );
      res.json(rows);
    } catch (err) { next(err); }
  }

  async buscar(req, res, next) {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute(
        'SELECT id, nome, descricao, preco_venda, preco_custo, valor_locacao, quantidade AS estoque, tipo, codigo_barras, ativo FROM produtos WHERE id = ?',
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Produto nao encontrado' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }

  async criar(req, res) {
    const client = await pool.connect();

    try {
      const { nome, descricao, codigo_barras, tipo } = req.body;

      if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        return res.status(400).json({ error: 'Campo "nome" e obrigatorio' });
      }

      const precoVendaNormalizado = normalizeMoney(req.body.preco_venda ?? req.body.preco);
      if (!Number.isFinite(precoVendaNormalizado)) {
        return res.status(400).json({ error: 'Campo "preco_venda" (ou "preco") e obrigatorio e deve ser um numero' });
      }

      const quantidadeInicial = normalizeInteger(
        req.body.quantidade ?? req.body.estoque ?? req.body.estoque_atual,
        0
      );
      if (!Number.isInteger(quantidadeInicial) || quantidadeInicial < 0) {
        return res.status(400).json({ error: 'Campo "quantidade" deve ser um inteiro maior ou igual a zero' });
      }

      const precoCustoNormalizado = normalizeMoney(req.body.preco_custo, 0);
      if (!Number.isFinite(precoCustoNormalizado) || precoCustoNormalizado < 0) {
        return res.status(400).json({ error: 'Campo "preco_custo" deve ser um numero maior ou igual a zero' });
      }

      const valorLocacaoRaw = req.body.valor_locacao;
      const valorLocacaoNormalizado = valorLocacaoRaw === undefined || valorLocacaoRaw === null || valorLocacaoRaw === ''
        ? null
        : normalizeMoney(valorLocacaoRaw);
      if (valorLocacaoNormalizado !== null && (!Number.isFinite(valorLocacaoNormalizado) || valorLocacaoNormalizado < 0)) {
        return res.status(400).json({ error: 'Campo "valor_locacao" deve ser um numero maior ou igual a zero' });
      }

      const usuarioId = req.user?.id ?? null;

      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO produtos
         (nome, descricao, preco_venda, preco_custo, valor_locacao, quantidade, codigo_barras, tipo, criado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          nome.trim(),
          descricao ?? null,
          precoVendaNormalizado,
          precoCustoNormalizado,
          valorLocacaoNormalizado,
          0,
          codigo_barras ?? null,
          tipo ?? 'venda',
          usuarioId
        ]
      );

      const produtoId = insertResult.rows[0].id;

      if (quantidadeInicial > 0) {
        await AutomacaoLancamentosService.registrarTransacao(client, {
          produto_id: produtoId,
          usuario_id: usuarioId,
          tipo: 'entrada',
          quantidade: quantidadeInicial,
          valor_unitario: precoCustoNormalizado || precoVendaNormalizado,
          origem: 'ajuste',
          referencia_id: produtoId,
          observacao: `Estoque inicial no cadastro do produto #${produtoId}`
        });
      }

      await client.query('COMMIT');

      return res.status(201).json({
        id: produtoId,
        transacao_estoque_inicial: quantidadeInicial > 0
      });
    } catch (err) {
      await client.query('ROLLBACK');
      const mapped = mapProdutoError(err);
      return res.status(mapped.status).json({ error: mapped.message });
    } finally {
      client.release();
    }
  }

  async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, descricao, codigo_barras, tipo, ativo } = req.body;
      const preco_venda = req.body.preco_venda ?? req.body.preco;
      const preco_custo = req.body.preco_custo;
      const valor_locacao = req.body.valor_locacao;
      const quantidade = req.body.quantidade ?? req.body.estoque ?? req.body.estoque_atual;

      const fields = [];
      const params = [];

      if (nome !== undefined && nome !== null) {
        fields.push('nome = ?');
        params.push(String(nome).trim());
      }
      if (descricao !== undefined) {
        fields.push('descricao = ?');
        params.push(descricao ?? null);
      }
      if (preco_venda !== undefined && preco_venda !== null) {
        fields.push('preco_venda = ?');
        params.push(Number(preco_venda));
      }
      if (preco_custo !== undefined && preco_custo !== null) {
        fields.push('preco_custo = ?');
        params.push(Number(preco_custo));
      }
      if (valor_locacao !== undefined) {
        fields.push('valor_locacao = ?');
        params.push(valor_locacao === null ? null : Number(valor_locacao));
      }
      if (quantidade !== undefined && quantidade !== null) {
        fields.push('quantidade = ?');
        params.push(Number(quantidade));
      }
      if (codigo_barras !== undefined) {
        fields.push('codigo_barras = ?');
        params.push(codigo_barras);
      }
      if (tipo !== undefined && tipo !== null) {
        fields.push('tipo = ?');
        params.push(tipo);
      }
      if (ativo !== undefined && ativo !== null) {
        fields.push('ativo = ?');
        params.push(ativo);
      }

      if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

      params.push(id);
      const sql = `UPDATE produtos SET ${fields.join(', ')} WHERE id = ?`;
      await pool.execute(sql, params);
      res.json({ message: 'Atualizado' });
    } catch (err) { next(err); }
  }

  async excluir(req, res, next) {
    try {
      const { id } = req.params;
      await pool.execute('DELETE FROM produtos WHERE id = ?', [id]);
      res.json({ message: 'Removido' });
    } catch (err) { next(err); }
  }
}

module.exports = new ProdutoController();
