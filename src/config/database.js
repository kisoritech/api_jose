require('dotenv').config();
const { Pool } = require('pg');

// Configuracao da conexao
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'sistema',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(dbConfig);

function normalizeQuery(text) {
  let i = 1;
  return text.replace(/\?/g, () => `$${i++}`);
}

function ensureReturningId(text) {
  if (/^\s*INSERT\s+INTO/i.test(text) && !/RETURNING\s+id/i.test(text)) {
    return `${text} RETURNING id`;
  }

  return text;
}

function formatCompatResult(res) {
  const meta = {
    affectedRows: res.rowCount,
    insertId: res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : null
  };

  return [res.rows, meta];
}

function augmentClient(client) {
  if (client.execute) return client;

  client.execute = async function(text, params = []) {
    const pgText = ensureReturningId(normalizeQuery(text));
    const res = await client.query(pgText, params);
    return formatCompatResult(res);
  };

  client.beginTransaction = async function() {
    await client.query('BEGIN');
  };

  client.commit = async function() {
    await client.query('COMMIT');
  };

  client.rollback = async function() {
    await client.query('ROLLBACK');
  };

  return client;
}

// Compatibilidade com codigo legado de MySQL
pool.getConnection = async function() {
  const client = await this.connect();
  return augmentClient(client);
};

// Adiciona metodo 'execute' para compatibilidade com codigo estilo MySQL
pool.execute = async function(text, params = []) {
  const pgText = ensureReturningId(normalizeQuery(text));

  const client = await pool.connect();
  try {
    const res = await client.query(pgText, params);
    return formatCompatResult(res);
  } finally {
    client.release();
  }
};

module.exports = pool;
