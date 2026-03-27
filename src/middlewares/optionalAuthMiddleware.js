const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return next();
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersegredo');
    req.user = { id: decoded.id };
  } catch (err) {
    // Rota legada continua operando mesmo sem token valido.
  }

  return next();
};
