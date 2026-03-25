const express = require('express');
const router = express.Router();
const VendaController = require('../controllers/VendaController');
const authMiddleware = require('../middlewares/authMiddleware'); // Assumindo que exista conforme README

// Rota para criar venda
// POST /api/vendas
// Requer autenticação para pegar o usuario_id
router.post('/', authMiddleware, VendaController.criar);

module.exports = router;