const express = require('express');
const router = express.Router();
const LocacaoController = require('../controllers/LocacaoController');
const auth = require('../middlewares/authMiddleware');

router.get('/', auth, LocacaoController.listar);
router.get('/:id', auth, LocacaoController.buscar);
router.post('/', auth, LocacaoController.criar);
router.put('/:id/status', auth, LocacaoController.atualizarStatus);

module.exports = router;
