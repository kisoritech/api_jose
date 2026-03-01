const LocacaoService = require('../services/LocacaoService');

class LocacaoController {
  async criar(req, res, next) {
    try {
      const dados = req.body;
      const usuario_id = req.user.id;
      const result = await LocacaoService.criarLocacao(dados, usuario_id);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }
}

module.exports = new LocacaoController();
