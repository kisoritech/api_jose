const pool = require('../config/database');

class ClienteController {
  async listar(req, res, next) {
    try {
      const [rows] = await pool.execute('SELECT * FROM clientes');
      res.json(rows);
    } catch (err) { next(err); }
  }

  async buscar(req, res, next) {
    try {
      const { id } = req.params;
      const [rows] = await pool.execute('SELECT * FROM clientes WHERE id = ?', [id]);
      if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }

  async criar(req, res, next) {
    try {
      const { nome, email, telefone } = req.body;
      const [result] = await pool.execute(
        'INSERT INTO clientes (nome, email, telefone) VALUES (?, ?, ?)',
        [nome, email, telefone]
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) { next(err); }
  }

  async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, email, telefone } = req.body;
      await pool.execute(
        'UPDATE clientes SET nome = ?, email = ?, telefone = ? WHERE id = ?',
        [nome, email, telefone, id]
      );
      res.json({ message: 'Atualizado' });
    } catch (err) { next(err); }
  }

  async excluir(req, res, next) {
    try {
      const { id } = req.params;
      await pool.execute('DELETE FROM clientes WHERE id = ?', [id]);
      res.json({ message: 'Removido' });
    } catch (err) { next(err); }
  }
}

module.exports = new ClienteController();
