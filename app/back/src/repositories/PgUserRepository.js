class PgUserRepository {
  constructor(pool) { this.pool = pool; }
  async findByEmail(email) {
    const normalized = email.trim().toLowerCase();
    const { rows } = await this.pool.query(`
      SELECT u.id, u.login AS email, p.nome, u.senha_hash
      FROM usuario u LEFT JOIN cadastro_pessoa p ON p.usuario_id = u.id
      WHERE u.login = $1 AND u.ativo = TRUE LIMIT 1
    `, [normalized]);
    return rows[0] || null;
  }
  async findByLogin(login) { return this.findByEmail(login); }
}
module.exports = { PgUserRepository };
