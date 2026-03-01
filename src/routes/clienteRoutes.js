const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/ClienteController');
const auth = require('../middlewares/authMiddleware');

router.get('/', auth, ClienteController.listar);
router.get('/:id', auth, ClienteController.buscar);
router.post('/', auth, ClienteController.criar);
router.put('/:id', auth, ClienteController.atualizar);
router.delete('/:id', auth, ClienteController.excluir);

module.exports = router;
