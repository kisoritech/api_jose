const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const VendaController = require('../controllers/VendaController');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');

router.get('/clientes', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, nome, tipo_pessoa, email, telefone, ativo
      FROM clientes
      WHERE ativo = true
      ORDER BY nome
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/produtos', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nome,
        preco_venda,
        preco_custo,
        valor_locacao,
        quantidade,
        quantidade AS estoque,
        tipo,
        codigo_barras,
        ativo
      FROM produtos
      WHERE ativo = true
      ORDER BY nome
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/historico_vendas', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        venda_id AS id,
        criado_em,
        forma_pagamento,
        status,
        valor_total,
        frete_valor,
        total_final,
        cliente_nome,
        vendedor
      FROM vw_vendas_detalhadas
      ORDER BY criado_em DESC, venda_id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/vendas', async (req, res, next) => VendaController.listar(req, res, next));
router.get('/vendas/:id', async (req, res, next) => VendaController.buscar(req, res, next));
router.post('/salvar_venda', optionalAuth, async (req, res, next) => VendaController.criar(req, res, next));

module.exports = router;
