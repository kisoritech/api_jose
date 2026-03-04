// helpers for working with results returned by our database abstraction

function getInsertedId(result) {
  if (!result) return null;
  if (result.insertId !== undefined) return result.insertId;
  if (result.rows && result.rows[0] && result.rows[0].id !== undefined) return result.rows[0].id;
  return null;
}

module.exports = {
  getInsertedId,
};
