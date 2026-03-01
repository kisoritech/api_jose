const express = require('express');
const router = express.Router();
const ProdutoController = require('../controllers/ProdutoController');
const auth = require('../middlewares/authMiddleware');

router.get('/', auth, ProdutoController.listar);
router.get('/:id', auth, ProdutoController.buscar);
router.post('/', auth, ProdutoController.criar);
router.put('/:id', auth, ProdutoController.atualizar);
router.delete('/:id', auth, ProdutoController.excluir);

module.exports = router;
