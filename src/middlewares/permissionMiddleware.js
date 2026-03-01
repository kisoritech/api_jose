const pool = require('../config/database');

// Usage: permission('admin')
function permission(requiredRole) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) return res.status(401).json({ error: 'Não autenticado' });

      const [rows] = await pool.execute('SELECT perfil FROM usuarios WHERE id = ?', [req.user.id]);
      const user = rows[0];
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      if (user.perfil !== requiredRole) return res.status(403).json({ error: 'Permissão negada' });

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = permission;
