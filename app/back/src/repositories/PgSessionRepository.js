class PgSessionRepository {
  constructor(pool) { this.pool = pool; }
  async create(userId, tokenHash, absoluteMs) {
    const result = await this.pool.query(`
      INSERT INTO sessao(usuario_id,token_hash,auth_version,expira_em)
      SELECT id,$2,auth_version,now() + ($3::bigint * interval '1 millisecond')
      FROM usuario WHERE id=$1 AND ativo=TRUE RETURNING id
    `, [userId,tokenHash,absoluteMs]);
    return result.rowCount === 1;
  }
  async findAndTouch(tokenHash, inactivityMs) {
    // Valida atividade, expiração absoluta, revogação, desligamento e versão de autorização.
    // UPDATE atomico: toque de atividade e leitura das permissoes sob mesmo comando.
    const result = await this.pool.query(`
      WITH tocada AS (
        UPDATE sessao s SET ultima_atividade=now()
        FROM usuario u
        WHERE s.token_hash=$1 AND s.usuario_id=u.id
          AND s.revogada_em IS NULL AND s.expira_em > now()
          AND s.ultima_atividade > now() - ($2::bigint * interval '1 millisecond')
          AND u.ativo=TRUE AND s.auth_version=u.auth_version
        RETURNING s.usuario_id
      )
      SELECT u.id,u.login,u.login AS email,cp.nome,COALESCE((
        SELECT array_agg(p.perfil ORDER BY p.perfil)
        FROM atribuicao_perfil p WHERE p.usuario_id=u.id
          AND p.inicio_em<=now() AND (p.fim_em IS NULL OR p.fim_em>now())
      ), ARRAY[]::text[]) AS perfis
      FROM usuario u JOIN tocada t ON t.usuario_id=u.id LEFT JOIN cadastro_pessoa cp ON cp.usuario_id=u.id
    `,[tokenHash,inactivityMs]);
    return result.rows[0] || null;
  }
  async revoke(tokenHash) {
    await this.pool.query('UPDATE sessao SET revogada_em=now() WHERE token_hash=$1 AND revogada_em IS NULL',[tokenHash]);
  }
}
module.exports={PgSessionRepository};
