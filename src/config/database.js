require('dotenv').config();
const dns = require('dns');
const { Pool } = require('pg');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function buildSslConfig(enabled) {
  return enabled ? { rejectUnauthorized: false } : false;
}

function parseIpFamily(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = Number(value);
  return parsed === 4 || parsed === 6 ? parsed : fallback;
}

function buildLookupConfig(family) {
  if (!family) return {};

  return {
    family,
    lookup(hostname, options, callback) {
      return dns.lookup(hostname, { ...options, family }, callback);
    }
  };
}

function resolveDatabaseConfig() {
  const supabaseConnectionString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL;
  const genericConnectionString = process.env.DATABASE_URL;
  const connectionString = supabaseConnectionString || genericConnectionString;

  const isSupabaseConnection =
    Boolean(supabaseConnectionString) ||
    Boolean(process.env.SUPABASE_DB_HOST) ||
    Boolean(process.env.SUPABASE_PROJECT_REF);

  const sslEnabled = parseBoolean(
    process.env.DB_SSL ?? process.env.SUPABASE_DB_SSL,
    isSupabaseConnection
  );
  const ipFamily = parseIpFamily(
    process.env.DB_IP_FAMILY ?? process.env.SUPABASE_DB_IP_FAMILY,
    isSupabaseConnection ? 4 : undefined
  );

  const baseConfig = {
    ssl: buildSslConfig(sslEnabled),
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
    ...buildLookupConfig(ipFamily),
  };

  if (connectionString) {
    return {
      ...baseConfig,
      connectionString,
    };
  }

  return {
    ...baseConfig,
    host: process.env.SUPABASE_DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.SUPABASE_DB_PORT || process.env.DB_PORT || 5432),
    user: process.env.SUPABASE_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME || 'postgres',
  };
}

// Configuracao da conexao
const dbConfig = resolveDatabaseConfig();

const pool = new Pool(dbConfig);

pool.on('error', (error) => {
  console.error('Erro inesperado no pool PostgreSQL:', error);
});

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
