const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Middleware de autenticação
const authMiddleware = require('../middlewares/authMiddleware');

// Aplicar autenticação em todas as rotas
router.use(authMiddleware);

// ========== DASHBOARD / RELATÓRIOS ==========

// GET /api/dashboard/resumo - KPIs principais
router.get('/resumo', async (req, res) => {
    try {
        const query = 'SELECT * FROM vw_dashboard_resumo';
        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar resumo do dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/dashboard/estoque - Status de estoque
router.get('/estoque', async (req, res) => {
    try {
        const query = 'SELECT * FROM vw_estoque_resumo ORDER BY nome';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar status de estoque:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/dashboard/vendas-detalhadas - Vendas com detalhes
router.get('/vendas-detalhadas', async (req, res) => {
    try {
        const query = 'SELECT * FROM vw_vendas_detalhadas ORDER BY criado_em DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar vendas detalhadas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/dashboard/produtos-mais-vendidos - Ranking de produtos
router.get('/produtos-mais-vendidos', async (req, res) => {
    try {
        const query = 'SELECT * FROM vw_produtos_mais_vendidos ORDER BY total_vendido DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtos mais vendidos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/dashboard/locacoes-ativas - Locações ativas
router.get('/locacoes-ativas', async (req, res) => {
    try {
        const query = 'SELECT * FROM vw_locacoes_ativas ORDER BY dias_atraso DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar locações ativas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/dashboard/financeiro-clientes - Resumo financeiro por cliente
router.get('/financeiro-clientes', async (req, res) => {
    try {
        const query = 'SELECT * FROM vw_financeiro_clientes ORDER BY total_em_aberto DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar financeiro de clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/dashboard/cliente-historico/:clienteId - Histórico de compras por cliente
router.get('/cliente-historico/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const query = 'SELECT * FROM vw_cliente_historico WHERE cliente_id = $1 ORDER BY criado_em DESC';
        const result = await pool.query(query, [clienteId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar histórico do cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/dashboard/venda-itens-margem - Margem de lucro por item vendido
router.get('/venda-itens-margem', async (req, res) => {
    try {
        const query = 'SELECT * FROM vw_venda_itens_margem ORDER BY venda_id DESC';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar margem de itens:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;