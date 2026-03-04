const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { getInsertedId } = require('../utils/dbUtils');

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

      const newId = getInsertedId(result);
      const token = generateToken({ id: newId });
      res.status(201).json({ id: newId, token });
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

      // se senha_hash não parece um bcrypt (prefixo $2), atualizamos
      if (!user.senha_hash.startsWith('$2')) {
        // hash antigo em texto simples, substitui
        const newHash = await bcrypt.hash(user.senha_hash, 8);
        await pool.execute('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [newHash, user.id]);
        user.senha_hash = newHash;
      }

      const match = await bcrypt.compare(password, user.senha_hash);
      if (!match) return res.status(400).json({ error: 'Credenciais inválidas' });

      const token = generateToken({ id: user.id });
       // also return basic user info so client can use immediately
       res.json({
         token,
         user: {
           id: user.id,
           email: user.email,
           perfil: user.perfil,
           nome: user.nome
         }
       });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
