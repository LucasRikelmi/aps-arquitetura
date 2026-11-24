// Transações e locks evitam dois registros na mesma semana ISO mesmo com requisições concorrentes.
class PgCheckinRepository {
 constructor(pool){this.pool=pool;}
 async get(userId,year,week){
  const {rows}=await this.pool.query(`SELECT c.id,c.usuario_id,c.ano_iso,c.semana_iso,c.semana_inicio,c.humor,c.carga,c.comentario,c.obstaculo,c.criado_em,c.atualizado_em,
  COALESCE((SELECT json_agg(json_build_object('meta_id',p.meta_id,'progresso',p.progresso,'origem',p.origem)) FROM checkin_progresso p WHERE p.checkin_id=c.id),'[]'::json) AS progressos
  FROM checkin_semanal c WHERE c.usuario_id=$1 AND c.ano_iso=$2 AND c.semana_iso=$3`,[userId,year,week]);return rows[0]||null;
 }
 async frontMetas(userId){const {rows}=await this.pool.query(`
  SELECT m.id,m.titulo,to_char(m.prazo,'YYYY-MM-DD') AS prazo,
  COALESCE((SELECT cp.progresso FROM checkin_progresso cp JOIN checkin_semanal cs ON cs.id=cp.checkin_id
    WHERE cp.meta_id=m.id AND cs.usuario_id=$1 ORDER BY cs.semana_inicio DESC LIMIT 1),0)::int AS progresso
  FROM meta m WHERE m.responsavel_id=$1 ORDER BY m.prazo LIMIT 100`,[userId]);return rows;}
 async history(userId){
  const {rows}=await this.pool.query(`SELECT ano_iso,semana_iso,semana_inicio,humor,carga,comentario,obstaculo FROM checkin_semanal WHERE usuario_id=$1 ORDER BY ano_iso DESC,semana_iso DESC LIMIT 52`,[userId]);
  return rows.map(x=>({semana:x.semana_iso,periodo:x.semana_inicio,humor:x.humor,carga:x.carga,comentario:x.comentario,obstaculo:x.obstaculo,progresso:null}));
 }
 async save({userId,year,week,monday,data,normal}){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${userId}:${year}:${week}`]);
   const {rows:[{active}]}=await client.query('SELECT EXISTS(SELECT 1 FROM usuario WHERE id=$1 AND ativo=true) AS active',[userId]);
   if(!active){await client.query('ROLLBACK');return null;}
   // A janela também é verificada no próprio banco para reduzir risco de alterações no relógio da API.
   const {rows:[{db_now}]}=await client.query('SELECT now() AS db_now');
   const {weekForInstant,windowIsOpen}=require('../services/IsoWeek');
   const dbWeek=weekForInstant(db_now);
   const normalAllowed=normal && windowIsOpen(db_now) && dbWeek.year===year && dbWeek.week===week;
   const permission=await client.query(`SELECT id FROM reabertura_checkin WHERE usuario_id=$1 AND ano_iso=$2 AND semana_iso=$3 AND consumida_em IS NULL ORDER BY aberta_em DESC LIMIT 1 FOR UPDATE`,[userId,year,week]);
   if(!normalAllowed && permission.rows.length===0){await client.query('ROLLBACK');return null;}
   // Uma reabertura permite uma edição/gravação e é consumida na mesma transação.
   const {rows:[record]}=await client.query(`INSERT INTO checkin_semanal(usuario_id,ano_iso,semana_iso,semana_inicio,humor,carga,comentario,obstaculo)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8)
   ON CONFLICT(usuario_id,ano_iso,semana_iso) DO UPDATE SET humor=EXCLUDED.humor,carga=EXCLUDED.carga,comentario=EXCLUDED.comentario,obstaculo=EXCLUDED.obstaculo,atualizado_em=now()
   RETURNING id,usuario_id,ano_iso,semana_iso,humor,carga,comentario,obstaculo,criado_em,atualizado_em`,[userId,year,week,monday,data.humor,data.carga,data.comentario,data.obstaculo]);
   // Confirma que toda meta informada pertence a quem faz o check-in.
   if(data.progressos.length){
    const ids=data.progressos.map(p=>p.meta_id);
    const {rows:[{total}]}=await client.query('SELECT count(*)::int AS total FROM meta WHERE id = ANY($1::uuid[]) AND responsavel_id=$2',[ids,userId]);
    if(total!==ids.length){const e=new Error('meta inválida para o colaborador');e.status=400;throw e;}
   }
   const ids=data.progressos.map(p=>p.meta_id);
   await client.query('DELETE FROM checkin_progresso WHERE checkin_id=$1 AND NOT (meta_id=ANY($2::uuid[]))',[record.id,ids]);
   for(const p of data.progressos){await client.query(`INSERT INTO checkin_progresso(checkin_id,meta_id,progresso,revisao)
     VALUES($1,$2,$3,1) ON CONFLICT(checkin_id,meta_id) DO UPDATE
     SET progresso=EXCLUDED.progresso,
         revisao=checkin_progresso.revisao + CASE WHEN checkin_progresso.progresso IS DISTINCT FROM EXCLUDED.progresso THEN 1 ELSE 0 END`,[record.id,p.meta_id,p.progresso]);}
   if(permission.rows.length)await client.query('UPDATE reabertura_checkin SET consumida_em=now() WHERE id=$1',[permission.rows[0].id]);
   await client.query('COMMIT');return {...record,progressos:data.progressos};
  }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
 }
 async reopen({rhId,userId,year,week,monday}){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${userId}:${year}:${week}`]);
   const {rows}=await client.query('SELECT id FROM usuario WHERE id=$1 AND ativo=true',[userId]);
   if(!rows.length){await client.query('ROLLBACK');return null;}
   const {rows:[reopened]}=await client.query(`INSERT INTO reabertura_checkin(usuario_id,ano_iso,semana_iso,semana_inicio,autor_rh_id)
     VALUES($1,$2,$3,$4,$5) RETURNING id,usuario_id,ano_iso,semana_iso,aberta_em,autor_rh_id`,[userId,year,week,monday,rhId]);
   // Auditoria crítica transacional; não depende de fila em memória.
   await client.query(`INSERT INTO log_acesso(ator_id,perfis,recurso,acao,resultado,alvo_id,correlacao_id)
    VALUES($1,ARRAY['RH']::text[],'checkin','reabertura','permitido',$2,$3)`,[rhId,userId,reopened.id]);
   await client.query('COMMIT');return reopened;
  }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
 }
}
module.exports={PgCheckinRepository};
