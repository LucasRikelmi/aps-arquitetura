const {canValidate,resolveProgress}=require('../services/ProgressoPolicy');
class PgProgressoRepository {
 constructor(pool){this.pool=pool;}
 async context(metaId,checkinId,actorId,client=this.pool){
  const {rows}=await client.query(`
  SELECT m.responsavel_id,
    EXISTS(SELECT 1 FROM usuario u WHERE u.id=$3 AND u.ativo=true) AS actor_active,
    EXISTS(SELECT 1 FROM usuario u WHERE u.id=m.responsavel_id AND u.ativo=true) AS owner_active,
    EXISTS(SELECT 1 FROM vinculo_gestor v WHERE v.gestor_id=$3 AND v.colaborador_id=m.responsavel_id
      AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now())) AS direct_team,
    EXISTS(SELECT 1 FROM cobertura_gestor s WHERE s.gestor_substituto_id=$3 AND s.colaborador_id=m.responsavel_id
      AND s.inicio_em<=now() AND s.fim_em>now()
      AND EXISTS(SELECT 1 FROM vinculo_gestor v WHERE v.gestor_id=s.gestor_titular_id
        AND v.colaborador_id=m.responsavel_id AND v.inicio_em<=s.inicio_em
        AND (v.fim_em IS NULL OR v.fim_em>s.inicio_em))) AS substitute,
    EXISTS(SELECT 1 FROM designacao_meta_diretor d WHERE d.gestor_id=$3 AND d.diretor_id=m.responsavel_id
      AND d.inicio_em<=now() AND d.fim_em>now()) AS director_assignment
  FROM meta m JOIN checkin_semanal c ON c.id=$2 AND c.usuario_id=m.responsavel_id
  WHERE m.id=$1`,[metaId,checkinId,actorId]);
  const item=rows[0];if(!item)return null;
  return {responsavel_id:item.responsavel_id,scope:{actorActive:item.actor_active,ownerActive:item.owner_active,directTeam:item.direct_team,substitute:item.substitute,directorAssignment:item.director_assignment}};
 }
 async validateAtomic(identity,metaId,body){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   // Bloqueio do check-in evita corrida com edicao do autorrelato.
   const locked=await client.query('SELECT id FROM checkin_semanal WHERE id=$1 FOR UPDATE',[body.checkin_id]);
   if(!locked.rowCount){await client.query('ROLLBACK');return null;}
   const ctx=await this.context(metaId,body.checkin_id,identity.id,client);
   if(!ctx||!canValidate(identity,ctx.responsavel_id,ctx.scope)){
    await client.query('ROLLBACK');return null;
   }
   const {rows:progress}=await client.query(`SELECT progresso,revisao FROM checkin_progresso
      WHERE checkin_id=$1 AND meta_id=$2 FOR UPDATE`,[body.checkin_id,metaId]);
   if(!progress.length){await client.query('ROLLBACK');return null;}
   const {rows:[saved]}=await client.query(`INSERT INTO validacao_progresso
    (checkin_id,meta_id,revisao_autorrelato,autorrelato_no_momento,valor_validado,avaliacao_qualitativa,validador_id)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,checkin_id,meta_id,autorrelato_no_momento AS autorrelato,
     valor_validado,avaliacao_qualitativa,validador_id,criado_em,revisao_autorrelato`,
    [body.checkin_id,metaId,progress[0].revisao,progress[0].progresso,body.valor_validado,body.avaliacao_qualitativa.trim(),identity.id]);
   await client.query(`INSERT INTO log_acesso(ator_id,perfis,recurso,acao,resultado,alvo_id,correlacao_id)
      VALUES($1,$2::text[],'meta_progresso','validacao_progresso','permitido',$3,$4)`,
      [identity.id,identity.perfis,ctx.responsavel_id,saved.id]);
   await client.query('COMMIT');
   return {...saved,...resolveProgress(saved.autorrelato,saved)};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 async detail(metaId,checkinId){
  const {rows}=await this.pool.query(`SELECT p.progresso AS autorrelato,p.revisao,
    (SELECT row_to_json(v) FROM (
      SELECT valor_validado,avaliacao_qualitativa,validador_id,criado_em FROM validacao_progresso
      WHERE checkin_id=p.checkin_id AND meta_id=p.meta_id AND revisao_autorrelato=p.revisao
      ORDER BY criado_em DESC,id DESC LIMIT 1) v) AS validacao,
    (SELECT COALESCE(json_agg(row_to_json(h) ORDER BY h.criado_em DESC), '[]'::json) FROM (
      SELECT id,revisao_autorrelato,autorrelato_no_momento,valor_validado,avaliacao_qualitativa,validador_id,criado_em
      FROM validacao_progresso WHERE checkin_id=p.checkin_id AND meta_id=p.meta_id ORDER BY criado_em DESC,id DESC LIMIT 100) h) AS historico
    FROM checkin_progresso p WHERE p.checkin_id=$1 AND p.meta_id=$2`,[checkinId,metaId]);
  return rows[0]||null;
 }
}
module.exports={PgProgressoRepository};
