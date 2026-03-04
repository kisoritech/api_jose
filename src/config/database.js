/*
  Database configuration for PostgreSQL (pg).
  Uses either DATABASE_URL (recommended, provided by Render) or individual 
  connection parameters (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).

  Helper functions convert `?` placeholders to `$1/$2` format and automatically
  append `RETURNING id` to INSERT statements for compatibility with existing code.
*/

require('dotenv').config();

const { Pool } = require('pg');

const pgConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(pgConfig);

// Convert ? placeholders to numbered $1, $2, ...
function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => '$' + (++idx));
}

// Execute query with automatic RETURNING id for INSERTs
async function execute(sql, params = []) {
  let newSql = convertPlaceholders(sql);
  // Automatically add RETURNING id for INSERTs when not explicit
  if (/^\s*INSERT\b/i.test(newSql) && !/RETURNING\b/i.test(newSql)) {
    newSql += ' RETURNING id';
  }
  const res = await pool.query(newSql, params);
  return [res.rows, res];
}

pool.execute = execute;

// Get connection for transactions
pool.getConnection = async () => {
  const client = await pool.connect();
  client.execute = async (sql, params = []) => {
    let newSql = convertPlaceholders(sql);
    if (/^\s*INSERT\b/i.test(newSql) && !/RETURNING\b/i.test(newSql)) {
      newSql += ' RETURNING id';
    }
    const res = await client.query(newSql, params);
    return [res.rows, res];
  };
  client.beginTransaction = () => client.query('BEGIN');
  client.commit = () => client.query('COMMIT');
  client.rollback = () => client.query('ROLLBACK');
  client.release = () => client.release();
  return client;
};

module.exports = pool;
