const pool = require('../config/database');
const { getInsertedId } = require('../utils/dbUtils');

class ProdutoController {
  async listar(req, res, next) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, nome, descricao, preco_venda, quantidade AS estoque, tipo, codigo_barras FROM produtos'
      );
      res.json(rows);
    } catch (err) { next(err); }
  }

  async buscar(req, res, next) {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute(
        'SELECT id, nome, descricao, preco_venda, quantidade AS estoque, tipo, codigo_barras FROM produtos WHERE id = ?',
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }

  async criar(req, res, next) {
    try {
      const { nome, descricao } = req.body;
      
      // validação: nome é obrigatório
      if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        return res.status(400).json({ error: 'Campo "nome" é obrigatório' });
      }

      // accept `preco` for backwards compatibility as `preco_venda`
      const preco_venda = req.body.preco_venda ?? req.body.preco;
      
      // validação: preco é obrigatório
      if (preco_venda === undefined || preco_venda === null || isNaN(Number(preco_venda))) {
        return res.status(400).json({ error: 'Campo "preco_venda" (ou "preco") é obrigatório e deve ser um número' });
      }

      const quantidade = req.body.quantidade ?? req.body.estoque ?? 0;
      const desc = descricao ?? null; // permite null para descrição

      const [result] = await pool.execute(
        'INSERT INTO produtos (nome, descricao, preco_venda, quantidade) VALUES (?, ?, ?, ?)',
        [nome.trim(), desc, Number(preco_venda), Number(quantidade)]
      );
      res.status(201).json({ id: getInsertedId(result) });
    } catch (err) { next(err); }
  }

  async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, descricao } = req.body;
      const preco_venda = req.body.preco_venda ?? req.body.preco;
      const quantidade = req.body.quantidade ?? req.body.estoque;

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
      if (quantidade !== undefined && quantidade !== null) { 
        fields.push('quantidade = ?'); 
        params.push(Number(quantidade)); 
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
