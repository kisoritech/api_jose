const express = require('express');
const router = express.Router();
const LocacaoController = require('../controllers/LocacaoController');
const auth = require('../middlewares/authMiddleware');

router.post('/', auth, LocacaoController.criar);

module.exports = router;
