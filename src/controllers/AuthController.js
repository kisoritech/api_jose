const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

const PERFIS_VALIDOS = new Set(['admin', 'gerente', 'vendedor']);

function normalizePerfil(perfil) {
  if (!perfil) return 'vendedor';
  return String(perfil).trim().toLowerCase();
}

function isValidEmail(email) {
  return typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
}

function handleDatabaseError(err, next) {
  if (err.code === '23505') {
    return next({ status: 400, message: 'Email ja cadastrado' });
  }

  if (err.code === '22P02' || err.code === '23514') {
    return next({ status: 400, message: 'Dados invalidos para cadastro' });
  }

  if (err.code === '42703' || err.code === '42P01') {
    return next({ status: 500, message: 'Estrutura do banco de dados incompativel com a API' });
  }

  return next(err);
}

class AuthController {
  async register(req, res, next) {
    try {
      const nome = String(req.body.nome || req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const perfil = normalizePerfil(req.body.perfil);

      if (!nome) {
        return res.status(400).json({ error: 'Campo "nome" e obrigatorio' });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Email invalido' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
      }

      if (!PERFIS_VALIDOS.has(perfil)) {
        return res.status(400).json({ error: 'Perfil invalido. Use admin, gerente ou vendedor.' });
      }

      const existingUser = await pool.query(
        'SELECT id FROM usuarios WHERE email = $1 LIMIT 1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email ja cadastrado' });
      }

      const hashed = await bcrypt.hash(password, 8);
      const insertResult = await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, perfil)
         VALUES ($1, $2, $3, $4)
         RETURNING id, nome, email, perfil`,
        [nome, email, hashed, perfil]
      );

      const newUser = insertResult.rows[0];
      const token = generateToken({ id: newUser.id });

      return res.status(201).json({
        id: newUser.id,
        token,
        user: newUser
      });
    } catch (err) {
      return handleDatabaseError(err, next);
    }
  }

  async login(req, res, next) {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');

      if (!isValidEmail(email) || !password) {
        return res.status(400).json({ error: 'Credenciais invalidas' });
      }

      const result = await pool.query(
        'SELECT id, senha_hash, nome, perfil, ultimo_login FROM usuarios WHERE email = $1 LIMIT 1',
        [email]
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(400).json({ error: 'Credenciais invalidas' });
      }

      if (!user.senha_hash.startsWith('$2')) {
        const newHash = await bcrypt.hash(user.senha_hash, 8);
        await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [newHash, user.id]);
        user.senha_hash = newHash;
      }

      const match = await bcrypt.compare(password, user.senha_hash);
      if (!match) {
        return res.status(400).json({ error: 'Credenciais invalidas' });
      }

      const now = new Date();
      await pool.query('UPDATE usuarios SET ultimo_login = $1 WHERE id = $2', [now, user.id]);

      const token = generateToken({ id: user.id });
      return res.json({
        token,
        user: {
          id: user.id,
          email,
          nome: user.nome,
          perfil: user.perfil,
          ultimo_login: user.ultimo_login
        }
      });
    } catch (err) {
      return handleDatabaseError(err, next);
    }
  }
}

module.exports = new AuthController();
