const pool = require('../config/database');

class VendaController {
  async criar(req, res, next) {
    // Obtemos um cliente dedicado do pool para realizar a transação
    const client = await pool.connect();
    
    try {
      const { cliente_id, forma_pagamento, frete_valor, itens } = req.body;
      const usuario_id = req.user ? req.user.id : null; // Obtido do token JWT

      // Validação básica
      if (!cliente_id || !itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: 'Informe o cliente_id e pelo menos um item.' });
      }
      if (!forma_pagamento) {
        return res.status(400).json({ error: 'Forma de pagamento é obrigatória.' });
      }

      // Início da Transação
      await client.query('BEGIN');

      // 1. Inserir a venda (cabeçalho)
      // Inserimos valor_total como 0 inicialmente. 
      // A trigger trg_after_insert_venda_itens irá atualizar este valor conforme os itens entram.
      const sqlVenda = `
        INSERT INTO vendas 
        (usuario_id, cliente_id, valor_total, forma_pagamento, frete_valor, status)
        VALUES ($1, $2, 0, $3, $4, 'concluida')
        RETURNING id
      `;
      
      const valuesVenda = [usuario_id, cliente_id, forma_pagamento, frete_valor || 0];
      const resVenda = await client.query(sqlVenda, valuesVenda);
      const vendaId = resVenda.rows[0].id;

      // 2. Inserir os itens
      const sqlItem = `
        INSERT INTO venda_itens 
        (venda_id, produto_id, quantidade, valor_unitario)
        VALUES ($1, $2, $3, $4)
      `;

      for (const item of itens) {
        // Validações de item
        if (!item.produto_id || !item.quantidade || !item.valor_unitario) {
          throw new Error('Dados do item incompletos (produto_id, quantidade, valor_unitario)');
        }

        await client.query(sqlItem, [
          vendaId,
          item.produto_id,
          item.quantidade,
          item.valor_unitario
        ]);
      }

      // Confirma a transação
      await client.query('COMMIT');

      // Buscamos a venda atualizada (com os totais calculados pelas triggers) para retornar
      const resFinal = await client.query('SELECT * FROM vendas WHERE id = $1', [vendaId]);
      
      return res.status(201).json(resFinal.rows[0]);

    } catch (error) {
      // Em caso de qualquer erro, desfazemos tudo
      await client.query('ROLLBACK');
      // Repassamos o erro para o middleware de tratamento (ou retornamos direto)
      console.error('Erro na venda:', error);
      return res.status(500).json({ error: error.message || 'Erro ao processar venda' });
    } finally {
      client.release(); // Libera a conexão de volta para o pool
    }
  }
}

module.exports = new VendaController();