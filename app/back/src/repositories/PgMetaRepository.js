class PgMetaRepository {
 constructor(pool){this.pool=pool;}
 async scope(actorId,ownerId){
  const {rows}=await this.pool.query(`
   SELECT
    EXISTS (SELECT 1 FROM usuario u WHERE u.id=$2 AND u.ativo=TRUE) AS active,
    EXISTS (SELECT 1 FROM vinculo_gestor v WHERE v.gestor_id=$1 AND v.colaborador_id=$2
      AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now())) AS team,
    EXISTS (SELECT 1 FROM designacao_meta_diretor d WHERE d.gestor_id=$1 AND d.diretor_id=$2
      AND d.inicio_em<=now() AND d.fim_em>now()) AS "directorAssignment",
    ($1::uuid=$2::uuid AND EXISTS (SELECT 1 FROM atribuicao_perfil p WHERE p.usuario_id=$2
       AND p.perfil='Gestor' AND p.inicio_em<=now() AND (p.fim_em IS NULL OR p.fim_em>now()))
       AND NOT EXISTS (SELECT 1 FROM vinculo_gestor v WHERE v.colaborador_id=$2
          AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now()))
       AND (SELECT COUNT(DISTINCT usuario_id) FROM atribuicao_perfil
          WHERE perfil='Gestor' AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now()))=1
    ) AS "soleDirector"
  `,[actorId,ownerId]);return rows[0];
 }
 async findResponsavelByName(actorId,nome){const {rows}=await this.pool.query(`SELECT p.usuario_id AS id FROM cadastro_pessoa p JOIN usuario u ON u.id=p.usuario_id AND u.ativo=true
  JOIN vinculo_gestor v ON v.colaborador_id=p.usuario_id AND v.gestor_id=$1 AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now())
  WHERE p.nome=$2 LIMIT 2`,[actorId,nome]);return rows.length===1?rows[0].id:null;}
 async create(actorId,body){
  const {rows}=await this.pool.query(`
   INSERT INTO meta(responsavel_id,cadastrada_por,titulo,descricao,inicio,prazo,indicador,unidade,valor_alvo)
   VALUES($1,$2,$3,$4,$5::date,$6::date,$7,$8,$9)
   RETURNING id,responsavel_id,cadastrada_por,titulo,descricao,
    to_char(inicio,'YYYY-MM-DD') AS inicio,to_char(prazo,'YYYY-MM-DD') AS prazo,indicador,criada_em
  `,[body.responsavel_id,actorId,body.titulo.trim(),body.descricao??null,body.inicio,body.prazo,body.indicador.trim(),body.unidade||'%',body.valorAlvo??null]);return rows[0];
 }
 async get(id){const {rows}=await this.pool.query(`SELECT m.id,m.responsavel_id,m.cadastrada_por,m.titulo,m.descricao,
   p.nome AS responsavel,to_char(m.inicio,'YYYY-MM-DD') AS inicio,to_char(m.prazo,'YYYY-MM-DD') AS prazo,m.indicador,m.unidade,m.valor_alvo AS "valorAlvo",
   COALESCE(cp.progresso,0) AS progresso,COALESCE(cp.origem,'sem progresso informado') AS origem,
   CASE WHEN m.prazo<current_date THEN 'Em andamento · prazo vencido' ELSE 'Em andamento' END AS situacao,
   (cp.progresso IS NOT NULL) AS validavel
   FROM meta m JOIN cadastro_pessoa p ON p.usuario_id=m.responsavel_id
   LEFT JOIN LATERAL (SELECT z.progresso,z.origem FROM checkin_progresso z JOIN checkin_semanal c ON c.id=z.checkin_id WHERE z.meta_id=m.id ORDER BY c.semana_inicio DESC LIMIT 1) cp ON true
   WHERE m.id=$1`,[id]);return rows[0]||null;}
 async listFor(actorId){const {rows}=await this.pool.query(`SELECT m.id,m.responsavel_id,m.titulo,p.nome AS responsavel,
   to_char(m.inicio,'YYYY-MM-DD') AS inicio,to_char(m.prazo,'YYYY-MM-DD') AS prazo,m.indicador,m.unidade,m.valor_alvo AS "valorAlvo",
   COALESCE(cp.progresso,0) AS progresso,COALESCE(cp.origem,'sem progresso informado') AS origem,
   CASE WHEN m.prazo<current_date THEN 'Em andamento · prazo vencido' ELSE 'Em andamento' END AS situacao,
   (cp.progresso IS NOT NULL) AS validavel
   FROM meta m JOIN cadastro_pessoa p ON p.usuario_id=m.responsavel_id
   LEFT JOIN LATERAL (SELECT z.progresso,z.origem FROM checkin_progresso z JOIN checkin_semanal c ON c.id=z.checkin_id WHERE z.meta_id=m.id ORDER BY c.semana_inicio DESC LIMIT 1) cp ON true
   WHERE EXISTS(SELECT 1 FROM usuario u WHERE u.id=m.responsavel_id AND u.ativo=true)
   AND (m.responsavel_id=$1 OR EXISTS(SELECT 1 FROM vinculo_gestor v WHERE v.gestor_id=$1 AND v.colaborador_id=m.responsavel_id AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now()))
     OR EXISTS(SELECT 1 FROM designacao_meta_diretor d WHERE d.gestor_id=$1 AND d.diretor_id=m.responsavel_id AND d.inicio_em<=now() AND d.fim_em>now()))
   ORDER BY m.prazo,m.id LIMIT 200`,[actorId]);return rows;}
 // Exclusivamente RH: cria designacao excepcional com auditoria na MESMA transacao.
 async designateByRH(rhId,directorId,managerId,endAt){
  const client=await this.pool.connect();
  try{await client.query('BEGIN');
   const {rows:rh}=await client.query(`SELECT 1 FROM atribuicao_perfil WHERE usuario_id=$1 AND perfil='RH'
      AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now()) LIMIT 1`,[rhId]);
   if(!rh.length) {await client.query('ROLLBACK');return null;}
   const {rows:eligible}=await client.query(`SELECT
     EXISTS(SELECT 1 FROM usuario u WHERE u.id=$1 AND u.ativo=TRUE) AS diretor_ativo,
     EXISTS(SELECT 1 FROM usuario u JOIN atribuicao_perfil p ON p.usuario_id=u.id
       WHERE u.id=$2 AND u.ativo=TRUE AND p.perfil='Gestor'
       AND p.inicio_em<=now() AND (p.fim_em IS NULL OR p.fim_em>now())) AS gestor_ativo,
     NOT EXISTS(SELECT 1 FROM vinculo_gestor v WHERE v.colaborador_id=$1 AND v.inicio_em<=now()
       AND (v.fim_em IS NULL OR v.fim_em>now())) AS sem_chefia`,[directorId,managerId]);
   if(!eligible[0].diretor_ativo||!eligible[0].gestor_ativo||!eligible[0].sem_chefia){await client.query('ROLLBACK');return null;}
   const {rows}=await client.query(`INSERT INTO designacao_meta_diretor(diretor_id,gestor_id,designado_por,fim_em)
      VALUES($1,$2,$3,$4::timestamptz) RETURNING id,diretor_id,gestor_id,inicio_em,fim_em`,[directorId,managerId,rhId,endAt]);
   await client.query(`INSERT INTO log_acesso(ator_id,perfis,recurso,acao,resultado,alvo_id,correlacao_id)
     VALUES($1,ARRAY['RH']::text[],'designacao_meta_diretor','consulta','permitido',$2,gen_random_uuid())`,[rhId,directorId]);
   await client.query('COMMIT');return rows[0];
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}
module.exports={PgMetaRepository};
