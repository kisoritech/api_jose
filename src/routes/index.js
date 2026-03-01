const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const clienteRoutes = require('./clienteRoutes');
const produtoRoutes = require('./produtoRoutes');
const vendaRoutes = require('./vendaRoutes');
const locacaoRoutes = require('./locacaoRoutes');

router.use('/auth', authRoutes);
router.use('/clientes', clienteRoutes);
router.use('/produtos', produtoRoutes);
router.use('/vendas', vendaRoutes);
router.use('/locacoes', locacaoRoutes);

module.exports = router;
