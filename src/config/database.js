require('dotenv').config();
const { Pool } = require('pg');

// Configuração da conexão
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

// Adiciona método 'execute' para compatibilidade com código estilo MySQL
// Converte automaticamente '?' para '$1', '$2', etc.
pool.execute = async function(text, params) {
  // 1. Converter ? para $1, $2, etc.
  let i = 1;
  let pgText = text.replace(/\?/g, () => `$${i++}`);

  // 2. Se for INSERT e não tiver RETURNING id, adiciona automaticamente (para PostgreSQL)
  if (/^\s*INSERT\s+INTO/i.test(pgText) && !/RETURNING\s+id/i.test(pgText)) {
    pgText += ' RETURNING id';
  }

  const client = await pool.connect();
  try {
    const res = await client.query(pgText, params);
    
    // Retorna formato [rows, fields] similar ao driver mysql2
    // rows: array de resultados
    // fields/meta: objeto com insertId se disponível
    const meta = { 
      affectedRows: res.rowCount,
      insertId: res.rows.length > 0 && res.rows[0].id ? res.rows[0].id : null 
    };
    
    return [res.rows, meta];
  } finally {
    client.release();
  }
};

module.exports = pool;