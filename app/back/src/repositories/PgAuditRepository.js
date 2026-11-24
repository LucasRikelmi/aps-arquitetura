class PgAuditRepository {
 constructor(pool){this.pool=pool;}
 async insert(e){await this.pool.query(`INSERT INTO log_acesso(ator_id,perfis,recurso,acao,resultado,alvo_id,correlacao_id)
 VALUES($1,$2::text[],$3,$4,$5,$6,$7)`,[e.atorId,e.perfis,e.recurso,e.acao,e.resultado,e.alvoId,e.correlacaoId]);}
 async list({limit=50,beforeId=null}={}){
  const {rows}=await this.pool.query(`SELECT id,ocorrido_em,ator_id,perfis,recurso,acao,resultado,alvo_id,correlacao_id
 FROM log_acesso WHERE ocorrido_em >= now()-interval '6 months' AND ($1::bigint IS NULL OR id<$1)
 ORDER BY id DESC LIMIT $2`,[beforeId,limit]);return rows;
 }
}
module.exports={PgAuditRepository};
