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
      const { nome, email, telefone, tipo_pessoa } = req.body;
      
      // validação: nome é obrigatório
      if (!nome || typeof nome !== 'string' || nome.trim() === '') {
        return res.status(400).json({ error: 'Campo "nome" é obrigatório' });
      }

      const [result] = await pool.execute(
        'INSERT INTO clientes (nome, email, telefone, tipo_pessoa) VALUES (?, ?, ?, ?)',
        [nome.trim(), email ?? null, telefone ?? null, tipo_pessoa ?? 'fisica']
      );
      res.status(201).json({ id: result.insertId });
    } catch (err) { next(err); }
  }

  async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, email, telefone, tipo_pessoa } = req.body;

      const fields = [];
      const params = [];
      
      if (nome !== undefined && nome !== null) { 
        fields.push('nome = ?'); 
        params.push(String(nome).trim()); 
      }
      if (email !== undefined) { 
        fields.push('email = ?'); 
        params.push(email ?? null); 
      }
      if (telefone !== undefined) { 
        fields.push('telefone = ?'); 
        params.push(telefone ?? null); 
      }
      if (tipo_pessoa !== undefined) { 
        fields.push('tipo_pessoa = ?'); 
        params.push(tipo_pessoa); 
      }

      if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });

      params.push(id);
      const sql = `UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`;
      await pool.execute(sql, params);
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
