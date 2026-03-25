const pool = require('../config/database');
const { getInsertedId } = require('../utils/dbUtils');

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
      if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }

  async criar(req, res, next) {
    try {
      const { nome, descricao, codigo_barras, tipo } = req.body;
      
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

      const quantidade = req.body.quantidade ?? req.body.estoque ?? req.body.estoque_atual ?? 0;
      const preco_custo = req.body.preco_custo ?? 0;
      const valor_locacao = req.body.valor_locacao ?? null;

      const [result] = await pool.execute(
        `INSERT INTO produtos 
         (nome, descricao, preco_venda, preco_custo, valor_locacao, quantidade, codigo_barras, tipo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nome.trim(), 
          descricao ?? null, 
          Number(preco_venda),
          Number(preco_custo),
          valor_locacao !== null ? Number(valor_locacao) : null,
          Number(quantidade),
          codigo_barras ?? null,
          tipo ?? 'venda'
        ]
      );
      res.status(201).json({ id: getInsertedId(result) });
    } catch (err) { next(err); }
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
