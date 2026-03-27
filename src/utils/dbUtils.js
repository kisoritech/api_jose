/**
 * Normaliza a obtencao do ID inserido, funcionando tanto para
 * drivers MySQL (result.insertId) quanto para wrappers em PostgreSQL.
 */
function getInsertedId(result) {
  if (!result) return null;

  if (result.insertId) return result.insertId;

  if (Array.isArray(result) && result[0] && result[0].id) {
    return result[0].id;
  }

  if (result.id) return result.id;

  return null;
}

module.exports = { getInsertedId };
