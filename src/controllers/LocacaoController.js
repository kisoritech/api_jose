const LocacaoService = require('../services/LocacaoService');

class LocacaoController {
  async listar(req, res, next) {
    try {
      const result = await LocacaoService.listarLocacoes();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async buscar(req, res, next) {
    try {
      const result = await LocacaoService.buscarLocacao(req.params.id);
      if (!result) {
        return res.status(404).json({ error: 'Locacao nao encontrada.' });
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async criar(req, res, next) {
    try {
      const dados = req.body;
      const usuario_id = req.user.id;
      const result = await LocacaoService.criarLocacao(dados, usuario_id);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async atualizarStatus(req, res, next) {
    try {
      const result = await LocacaoService.atualizarStatusLocacao(
        req.params.id,
        req.body,
        req.user.id
      );

      if (!result) {
        return res.status(404).json({ error: 'Locacao nao encontrada.' });
      }

      return res.json(result);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new LocacaoController();
