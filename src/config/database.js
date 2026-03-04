/*
  Database abstraction layer that supports either MySQL (mysql2/promise)
  or PostgreSQL (pg). The connection type is chosen via the `DB_TYPE`
  environment variable ("mysql" is the default). On Render, you can also
  rely on a `DATABASE_URL` provided by the platform.

  The goal is to keep the rest of the codebase unchanged: controllers and
  services still call `pool.execute(sql, params)` and transactions work via
  `pool.getConnection()`; we convert `?` placeholders to `$1/$2` when using
  Postgres and transparently append `RETURNING id` to INSERTs so that the
  existing `insertId`-style logic continues to function.
*/

require('dotenv').config();

const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase();
let pool;

if (dbType === 'postgres' || dbType === 'pg') {
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

  pool = new Pool(pgConfig);

  // helper to convert `?` placeholders into numbered $1, $2, ...
  function convertPlaceholders(sql) {
    let idx = 0;
    return sql.replace(/\?/g, () => '$' + (++idx));
  }

  async function execute(sql, params = []) {
    let newSql = convertPlaceholders(sql);
    // automatically return id for INSERTs when not explicit
    if (/^\s*INSERT\b/i.test(newSql) && !/RETURNING\b/i.test(newSql)) {
      newSql += ' RETURNING id';
    }
    const res = await pool.query(newSql, params);
    return [res.rows, res];
  }

  pool.execute = execute;

  // getConnection should provide the same interface as mysql2 connection
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
} else {
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'josedecorando',
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  // mysql2 already exposes execute and getConnection with the expected API
}

module.exports = pool;
