const pool = require('../config/database');
const { getInsertedId } = require('../utils/dbUtils');
const AutomacaoLancamentosService = require('./AutomacaoLancamentosService');

const STATUS_LOCACAO_VALIDOS = new Set(['ativa', 'devolvida', 'atrasada', 'cancelada']);
const STATUS_LOCACAO_FINAIS = new Set(['devolvida', 'cancelada']);

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

function normalizeStatus(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return STATUS_LOCACAO_VALIDOS.has(normalized) ? normalized : null;
}

function dateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
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

    const prorrogacoesResult = await pool.query(`
      SELECT
        lp.id,
        lp.locacao_item_id,
        lp.data_anterior,
        lp.nova_data,
        lp.motivo,
        lp.ajustado_por,
        u.nome AS ajustado_por_nome,
        lp.criado_em
      FROM locacao_prorrogacoes lp
      INNER JOIN locacao_itens li ON li.id = lp.locacao_item_id
      LEFT JOIN usuarios u ON u.id = lp.ajustado_por
      WHERE li.locacao_id = $1
      ORDER BY lp.criado_em DESC, lp.id DESC
    `, [id]);

    return {
      ...result.rows[0],
      itens: itensResult.rows,
      prorrogacoes: prorrogacoesResult.rows
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

  async atualizarStatusLocacao(id, dados, usuario_id) {
    const connection = await pool.getConnection();
    let transactionOpen = false;

    try {
      await connection.beginTransaction();
      transactionOpen = true;

      const locacaoId = normalizeInteger(id);
      const status = normalizeStatus(dados.status);

      if (!Number.isInteger(locacaoId)) {
        throw { status: 400, message: 'Id da locacao invalido.' };
      }

      if (!status) {
        throw { status: 400, message: 'Status da locacao invalido. Use ativa, devolvida, atrasada ou cancelada.' };
      }

      const locacaoResult = await connection.query(`
        SELECT
          l.id,
          l.produto_id,
          l.usuario_id,
          l.cliente_id,
          l.quantidade,
          l.valor_unitario,
          l.valor_total,
          l.data_inicio,
          l.data_prevista_devolucao,
          l.data_devolucao,
          l.status
        FROM locacoes l
        WHERE l.id = $1
        FOR UPDATE
      `, [locacaoId]);

      const locacao = locacaoResult.rows[0];
      if (!locacao) {
        await connection.rollback();
        transactionOpen = false;
        return null;
      }

      const itensResult = await connection.query(`
        SELECT id, data_prevista_devolucao, status
        FROM locacao_itens
        WHERE locacao_id = $1
        ORDER BY id
        FOR UPDATE
      `, [locacaoId]);

      const locacaoItem = itensResult.rows[0];
      if (!locacaoItem) {
        throw { status: 400, message: 'Locacao sem item vinculado. Revise os dados antes de alterar o status.' };
      }

      if (STATUS_LOCACAO_FINAIS.has(locacao.status) && status !== locacao.status) {
        throw { status: 400, message: `Locacao ${locacao.status} nao pode ser alterada para ${status}.` };
      }

      if (locacao.status === status && STATUS_LOCACAO_FINAIS.has(status)) {
        await connection.commit();
        transactionOpen = false;
        return await this.buscarLocacao(locacaoId);
      }

      if (status === 'ativa') {
        await connection.query(`
          UPDATE locacoes
          SET status = 'ativa',
              data_devolucao = NULL
          WHERE id = $1
        `, [locacaoId]);

        await connection.query(`
          UPDATE locacao_itens
          SET status = 'alugado'
          WHERE locacao_id = $1
        `, [locacaoId]);

        await connection.query(`
          UPDATE financeiro_clientes
          SET status = 'pago'
          WHERE cliente_id = $1
            AND origem = 'locacao'
            AND referencia_id = $2
            AND tipo = 'debito'
            AND status <> 'cancelado'
        `, [locacao.cliente_id, locacaoId]);
      }

      if (status === 'devolvida') {
        const dataDevolucao = normalizeDateTime(dados.data_devolucao) || new Date().toISOString();

        await connection.query(`
          UPDATE locacoes
          SET status = 'devolvida',
              data_devolucao = $2
          WHERE id = $1
        `, [locacaoId, dataDevolucao]);

        await connection.query(`
          UPDATE locacao_itens
          SET status = 'devolvido'
          WHERE locacao_id = $1
        `, [locacaoId]);

        if (locacao.status !== 'devolvida') {
          await AutomacaoLancamentosService.registrarTransacao(connection, {
            produto_id: locacao.produto_id,
            usuario_id,
            cliente_id: locacao.cliente_id,
            tipo: 'entrada',
            quantidade: locacao.quantidade,
            valor_unitario: locacao.valor_unitario,
            origem: 'locacao',
            referencia_id: locacaoId,
            observacao: `Devolucao da locacao #${locacaoId}`
          });
        }
      }

      if (status === 'cancelada') {
        await connection.query(`
          UPDATE locacoes
          SET status = 'cancelada'
          WHERE id = $1
        `, [locacaoId]);

        await connection.query(`
          UPDATE locacao_itens
          SET status = 'cancelado'
          WHERE locacao_id = $1
        `, [locacaoId]);

        if (locacao.status !== 'cancelada') {
          await AutomacaoLancamentosService.registrarTransacao(connection, {
            produto_id: locacao.produto_id,
            usuario_id,
            cliente_id: locacao.cliente_id,
            tipo: 'entrada',
            quantidade: locacao.quantidade,
            valor_unitario: locacao.valor_unitario,
            origem: 'locacao',
            referencia_id: locacaoId,
            observacao: `Cancelamento da locacao #${locacaoId}`
          });
        }

        await connection.query(`
          UPDATE financeiro_clientes
          SET status = 'cancelado'
          WHERE cliente_id = $1
            AND origem = 'locacao'
            AND referencia_id = $2
            AND tipo = 'debito'
        `, [locacao.cliente_id, locacaoId]);

        const refundResult = await connection.query(`
          SELECT id
          FROM financeiro_clientes
          WHERE cliente_id = $1
            AND origem = 'ajuste'
            AND referencia_id = $2
            AND tipo = 'credito'
          LIMIT 1
        `, [locacao.cliente_id, locacaoId]);

        if (!refundResult.rows[0]) {
          await connection.query(`
            INSERT INTO financeiro_clientes (
              cliente_id,
              tipo,
              origem,
              referencia_id,
              valor,
              vencimento,
              status
            )
            VALUES ($1, 'credito', 'ajuste', $2, $3, CURRENT_DATE, 'pago')
          `, [locacao.cliente_id, locacaoId, locacao.valor_total]);
        }
      }

      if (status === 'atrasada') {
        const novaDataPrevista = normalizeDateTime(
          dados.nova_data_prevista_devolucao ?? dados.data_prevista_devolucao ?? dados.nova_data
        );

        if (!novaDataPrevista) {
          throw { status: 400, message: 'Ao marcar como atrasada informe nova_data_prevista_devolucao.' };
        }

        if (new Date(novaDataPrevista) <= new Date(locacao.data_prevista_devolucao)) {
          throw { status: 400, message: 'A nova data prevista deve ser posterior ao prazo atual da locacao.' };
        }

        await connection.query(`
          INSERT INTO locacao_prorrogacoes (
            locacao_item_id,
            data_anterior,
            nova_data,
            motivo,
            ajustado_por
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
          locacaoItem.id,
          dateOnly(locacao.data_prevista_devolucao),
          dateOnly(novaDataPrevista),
          dados.motivo ?? dados.observacao ?? 'Prorrogacao automatica por atraso',
          usuario_id
        ]);

        await connection.query(`
          UPDATE locacoes
          SET status = 'atrasada',
              data_prevista_devolucao = $2
          WHERE id = $1
        `, [locacaoId, novaDataPrevista]);

        await connection.query(`
          UPDATE locacao_itens
          SET status = 'atrasado',
              data_prevista_devolucao = $2
          WHERE locacao_id = $1
        `, [locacaoId, dateOnly(novaDataPrevista)]);

        await connection.query(`
          UPDATE financeiro_clientes
          SET vencimento = $3
          WHERE cliente_id = $1
            AND origem = 'locacao'
            AND referencia_id = $2
            AND tipo = 'debito'
            AND status <> 'cancelado'
        `, [locacao.cliente_id, locacaoId, dateOnly(novaDataPrevista)]);
      }

      await connection.commit();
      transactionOpen = false;
      return await this.buscarLocacao(locacaoId);
    } catch (err) {
      if (transactionOpen) {
        await connection.rollback();
      }
      throw mapLocacaoError(err);
    } finally {
      connection.release();
    }
  }

}

module.exports = new LocacaoService();
