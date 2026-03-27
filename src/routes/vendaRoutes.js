const express = require('express');
const router = express.Router();
const VendaController = require('../controllers/VendaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, VendaController.listar);
router.get('/:id', authMiddleware, VendaController.buscar);
router.post('/', authMiddleware, VendaController.criar);

module.exports = router;
