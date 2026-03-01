const pool = require('../config/database');

class ProdutoController {
  async listar(req, res, next) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, nome, descricao, preco_venda AS preco, estoque_atual AS estoque, tipo, codigo_barras FROM produtos'
      );
      res.json(rows);
    } catch (err) { next(err); }
  }

  async buscar(req, res, next) {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute(
        'SELECT id, nome, descricao, preco_venda AS preco, estoque_atual AS estoque, tipo, codigo_barras FROM produtos WHERE id = ?',
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }

  async criar(req, res, next) {
    try {
      const { nome, descricao } = req.body;
      // accept `preco` for backwards compatibility as `preco_venda`
      const preco_venda = req.body.preco_venda ?? req.body.preco ?? 0;
      const estoque_atual = req.body.estoque_atual ?? req.body.estoque ?? 0;

      const [result] = await pool.execute(
        'INSERT INTO produtos (nome, descricao, preco_venda, estoque_atual) VALUES (?, ?, ?, ?)',
        [nome, descricao, preco_venda, estoque_atual]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) { next(err); }
  }

  async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, descricao } = req.body;
      const preco_venda = req.body.preco_venda ?? req.body.preco;
      const estoque_atual = req.body.estoque_atual ?? req.body.estoque;

      const fields = [];
      const params = [];
      if (nome !== undefined) { fields.push('nome = ?'); params.push(nome); }
      if (descricao !== undefined) { fields.push('descricao = ?'); params.push(descricao); }
      if (preco_venda !== undefined) { fields.push('preco_venda = ?'); params.push(preco_venda); }
      if (estoque_atual !== undefined) { fields.push('estoque_atual = ?'); params.push(estoque_atual); }

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
