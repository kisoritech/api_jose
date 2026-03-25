/**
 * Normaliza a obtenção do ID inserido, funcionando tanto para
 * drivers MySQL (result.insertId) quanto PostgreSQL adaptado (result.insertId via wrapper)
 */
function getInsertedId(result) {
  // Se o wrapper do database.js retornar um objeto meta com insertId
  if (result && result.insertId) return result.insertId;
  return null;
}

module.exports = { getInsertedId };