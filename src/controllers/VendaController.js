const VendaService = require('../services/VendaService');

class VendaController {
  async criar(req, res, next) {
    try {
      const dados = req.body;
      const usuario_id = req.user.id;
      const result = await VendaService.criarVenda(dados, usuario_id);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }
}

module.exports = new VendaController();
