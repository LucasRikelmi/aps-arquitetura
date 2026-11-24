const { Pool } = require('pg');

function createPool(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
  const max = Number(env.PG_POOL_MAX || 10);
  if (!Number.isInteger(max) || max < 1 || max > 100) throw new Error('PG_POOL_MAX inválido');
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max,
    connectionTimeoutMillis: Number(env.PG_CONNECTION_TIMEOUT_MS || 3000),
    idleTimeoutMillis: Number(env.PG_IDLE_TIMEOUT_MS || 10000),
    allowExitOnIdle: false,
  });
  // Evita que erros emitidos por conexões ociosas encerrem o processo.
  pool.on('error', (error) => console.error('Falha de conexão ociosa do PostgreSQL:', error.code || error.name));
  return pool;
}
module.exports = { createPool };
