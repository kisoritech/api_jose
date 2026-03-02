const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const auth = require('../middlewares/authMiddleware');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// retorna informações do usuário logado
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
