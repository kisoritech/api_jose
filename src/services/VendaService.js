const pool = require('../config/database');
const { getInsertedId } = require('../utils/dbUtils');

class VendaService {

  async criarVenda(dados, usuario_id) {

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();


      // calcular valor_total a partir dos itens
      let valor_total = 0;
      for (let item of dados.itens) {
        const q = Number(item.quantidade || 0);
        const v = Number(item.valor_unitario || 0);
        valor_total += q * v;
      }

      const [vendaResult] = await connection.execute(
        `INSERT INTO vendas (usuario_id, cliente_id, valor_total, forma_pagamento, frete_valor)
         VALUES (?, ?, ?, ?, ?)`,
        [usuario_id, dados.cliente_id, valor_total, dados.forma_pagamento, dados.frete_valor || 0]
      );

      const vendaId = getInsertedId(vendaResult);

      for (let item of dados.itens) {
        await connection.execute(
          `INSERT INTO venda_itens 
          (venda_id, produto_id, quantidade, valor_unitario)
          VALUES (?, ?, ?, ?)`,
          [vendaId, item.produto_id, item.quantidade, item.valor_unitario]
        );
      }

      await connection.commit();

      return { message: 'Venda criada com sucesso', vendaId };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

}

module.exports = new VendaService();
