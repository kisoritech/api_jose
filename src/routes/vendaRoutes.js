const express = require('express');
const router = express.Router();
const VendaController = require('../controllers/VendaController');
const auth = require('../middlewares/authMiddleware');

router.post('/', auth, VendaController.criar);

module.exports = router;
