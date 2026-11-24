// Utilitário administrativo para homologação. Não expõe rota de cadastro.
require('dotenv').config();
const { createPool } = require('../src/config/database');
const { PasswordHasher } = require('../src/services/PasswordHasher');

async function main() {
  const [rawLogin, senha] = process.argv.slice(2);
  const login = rawLogin?.trim().toLowerCase();
  if (!login || login.length > 254 || typeof senha !== 'string' || senha.length < 1 || senha.length > 128) {
    console.error('Uso: npm run user:create -- email@exemplo.com "senha-de-teste"');
    process.exitCode = 1;
    return;
  }
  const pool = createPool();
  try {
    const hash = await new PasswordHasher().hash(senha);
    const result = await pool.query(
      'INSERT INTO usuario (login, senha_hash) VALUES ($1, $2) RETURNING id, login',
      [login, hash]
    );
    console.log('Usuário criado:', result.rows[0]);
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error('Falha ao criar usuário:', e.code || e.message); process.exitCode = 1; });
