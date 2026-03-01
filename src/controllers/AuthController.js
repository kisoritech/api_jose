const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

class AuthController {
  async register(req, res, next) {
    try {
      const nome = req.body.nome || req.body.name;
      const { email, password, perfil } = req.body;
      const [rows] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
      if (rows.length) return res.status(400).json({ error: 'Email já cadastrado' });

      const hashed = await bcrypt.hash(password, 8);
      const [result] = await pool.execute(
        'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
        [nome, email, hashed, perfil || 'vendedor']
      );

      const token = generateToken({ id: result.insertId });
      res.status(201).json({ id: result.insertId, token });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const [rows] = await pool.execute('SELECT id, senha_hash FROM usuarios WHERE email = ?', [email]);
      const user = rows[0];
      if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });

      const match = await bcrypt.compare(password, user.senha_hash);
      if (!match) return res.status(400).json({ error: 'Credenciais inválidas' });

      const token = generateToken({ id: user.id });
      res.json({ token });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
