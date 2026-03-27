const pool = require('../config/database');
const { getInsertedId } = require('../utils/dbUtils');
const AutomacaoLancamentosService = require('./AutomacaoLancamentosService');

function normalizeMoney(value) {
  if (value === undefined || value === null || value === '') return NaN;
  if (typeof value === 'number') return value;

  const cleaned = String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/^r\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function normalizeDateTime(value) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return `${value} 00:00:00`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function mapLocacaoError(error) {
  if (error?.status) return error;
  if (error?.code === 'P0001') return { status: 400, message: error.message };
  if (error?.code === '23503') return { status: 400, message: 'Cliente, usuario ou produto informado nao existe.' };
  if (error?.code === '22P02') return { status: 400, message: 'Um ou mais valores enviados estao em formato invalido.' };
  return { status: 500, message: error?.message || 'Erro ao processar locacao.' };
}

class LocacaoService {
  async listarLocacoes() {
    const result = await pool.query(`
      SELECT
        l.id,
        l.produto_id,
        p.nome AS produto_nome,
        l.usuario_id,
        l.cliente_id,
        c.nome AS cliente_nome,
        l.quantidade,
        l.valor_unitario,
        l.valor_total,
        l.data_inicio,
        l.data_prevista_devolucao,
        l.data_devolucao,
        l.status,
        l.observacao,
        l.criado_em
      FROM locacoes l
      LEFT JOIN produtos p ON p.id = l.produto_id
      LEFT JOIN clientes c ON c.id = l.cliente_id
      ORDER BY l.criado_em DESC, l.id DESC
    `);

    return result.rows;
  }

  async buscarLocacao(id) {
    const result = await pool.query(`
      SELECT
        l.id,
        l.produto_id,
        p.nome AS produto_nome,
        l.usuario_id,
        l.cliente_id,
        c.nome AS cliente_nome,
        l.quantidade,
        l.valor_unitario,
        l.valor_total,
        l.data_inicio,
        l.data_prevista_devolucao,
        l.data_devolucao,
        l.status,
        l.observacao,
        l.criado_em
      FROM locacoes l
      LEFT JOIN produtos p ON p.id = l.produto_id
      LEFT JOIN clientes c ON c.id = l.cliente_id
      WHERE l.id = $1
    `, [id]);

    if (!result.rows[0]) return null;

    const itensResult = await pool.query(`
      SELECT
        id,
        locacao_id,
        produto_id,
        quantidade,
        valor_unitario,
        valor_total,
        data_prevista_devolucao,
        status
      FROM locacao_itens
      WHERE locacao_id = $1
      ORDER BY id
    `, [id]);

    return {
      ...result.rows[0],
      itens: itensResult.rows
    };
  }

  async criarLocacao(dados, usuario_id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const produto_id = normalizeInteger(dados.produto_id ?? dados.id_produto ?? dados.produto);
      const cliente_id = normalizeInteger(dados.cliente_id ?? dados.cliente);
      const quantidade = normalizeInteger(dados.quantidade);
      const valor_unitario = normalizeMoney(dados.valor_unitario ?? dados.valor ?? dados.preco ?? dados.preco_venda ?? dados.valor_locacao);
      const data_inicio = normalizeDateTime(dados.data_inicio);
      const data_prevista_devolucao = normalizeDateTime(dados.data_prevista_devolucao);
      const observacao = dados.observacao ?? null;

      if (!Number.isInteger(produto_id) || !Number.isInteger(cliente_id)) {
        throw { status: 400, message: 'Locacao exige produto_id e cliente_id validos.' };
      }

      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        throw { status: 400, message: 'Quantidade da locacao deve ser um inteiro positivo.' };
      }

      if (!Number.isFinite(valor_unitario) || valor_unitario <= 0) {
        throw { status: 400, message: 'Valor unitario da locacao deve ser maior que zero.' };
      }

      if (!data_inicio || !data_prevista_devolucao) {
        throw { status: 400, message: 'Data de inicio e data prevista de devolucao sao obrigatorias.' };
      }

      if (new Date(data_prevista_devolucao) <= new Date(data_inicio)) {
        throw { status: 400, message: 'A data prevista de devolucao deve ser posterior a data de inicio.' };
      }

      const produtoResult = await connection.query(`
        SELECT id, nome, tipo, ativo, quantidade
        FROM produtos
        WHERE id = $1
      `, [produto_id]);

      const produto = produtoResult.rows[0];
      if (!produto) {
        throw { status: 400, message: 'Produto informado nao existe.' };
      }

      if (!produto.ativo) {
        throw { status: 400, message: 'Produto inativo nao pode ser locado.' };
      }

      if (!['aluguel', 'ambos'].includes(produto.tipo)) {
        throw { status: 400, message: 'Produto informado nao esta habilitado para locacao.' };
      }

      const [result] = await connection.execute(
        `INSERT INTO locacoes
        (produto_id, usuario_id, cliente_id, quantidade,
         valor_unitario, data_inicio, data_prevista_devolucao, observacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          produto_id,
          usuario_id,
          cliente_id,
          quantidade,
          valor_unitario,
          data_inicio,
          data_prevista_devolucao,
          observacao
        ]
      );

      const locacaoId = getInsertedId(result);
      const valorTotal = quantidade * valor_unitario;

      await AutomacaoLancamentosService.garantirLocacaoItem(connection, {
        locacao_id: locacaoId,
        produto_id,
        quantidade,
        valor_unitario,
        valor_total: valorTotal,
        data_prevista_devolucao: String(data_prevista_devolucao).slice(0, 10),
        status: 'alugado'
      });

      await AutomacaoLancamentosService.registrarTransacao(connection, {
        produto_id,
        usuario_id,
        cliente_id,
        tipo: 'saida',
        quantidade,
        valor_unitario,
        origem: 'locacao',
        referencia_id: locacaoId,
        criado_em: data_inicio,
        observacao: `Locacao #${locacaoId}`
      });

      await AutomacaoLancamentosService.garantirFinanceiroCliente(connection, {
        cliente_id,
        tipo: 'debito',
        origem: 'locacao',
        referencia_id: locacaoId,
        valor: valorTotal,
        vencimento: String(data_prevista_devolucao).slice(0, 10),
        status: 'pendente'
      });

      await connection.commit();
      return await this.buscarLocacao(locacaoId);
    } catch (err) {
      await connection.rollback();
      throw mapLocacaoError(err);
    } finally {
      connection.release();
    }
  }

}

module.exports = new LocacaoService();
