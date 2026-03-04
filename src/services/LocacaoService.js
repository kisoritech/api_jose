const pool = require('../config/database');
const { getInsertedId } = require('../utils/dbUtils');

class LocacaoService {

  async criarLocacao(dados, usuario_id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO locacoes
        (produto_id, usuario_id, cliente_id, quantidade,
         valor_unitario, data_inicio, data_prevista_devolucao)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          dados.produto_id,
          usuario_id,
          dados.cliente_id,
          dados.quantidade,
          dados.valor_unitario,
          dados.data_inicio,
          dados.data_prevista_devolucao
        ]
      );

      await connection.commit();
      return { id: getInsertedId(result) };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

}

module.exports = new LocacaoService();
