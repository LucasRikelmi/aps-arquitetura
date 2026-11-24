const {canActWithoutAlert,mayTreatAlert}=require('../services/AcaoPolicy');
class PgAcaoRepository {
 constructor(pool){this.pool=pool;}
 async roleAt(client,identity,role){
  if(!identity.perfis?.includes(role))return false;
  const {rowCount}=await client.query(`SELECT 1 FROM atribuicao_perfil p JOIN usuario u ON u.id=p.usuario_id
     WHERE p.usuario_id=$1 AND p.perfil=$2 AND p.inicio_em<=now() AND (p.fim_em IS NULL OR p.fim_em>now()) AND u.ativo=true LIMIT 1`,[identity.id,role]);
  return rowCount>0;
 }
 async scope(client,identity,colaboradorId){
  if(identity.id===colaboradorId)return false;
  if(await this.roleAt(client,identity,'RH'))return true;
  if(!await this.roleAt(client,identity,'Gestor'))return false;
  const {rowCount}=await client.query(`SELECT 1 WHERE
   EXISTS(SELECT 1 FROM vinculo_gestor WHERE gestor_id=$1 AND colaborador_id=$2 AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now()))
   OR EXISTS(SELECT 1 FROM cobertura_gestor WHERE gestor_substituto_id=$1 AND colaborador_id=$2 AND inicio_em<=now() AND fim_em>now())
   OR EXISTS(SELECT 1 FROM designacao_meta_diretor WHERE gestor_id=$1 AND diretor_id=$2 AND inicio_em<=now() AND fim_em>now())`,[identity.id,colaboradorId]);
  return rowCount>0;
 }
 async create(identity,data){const client=await this.pool.connect();try{
  await client.query('BEGIN');
  let alert=null;
  if(data.alerta_id){
   const {rows}=await client.query(`SELECT a.id,a.colaborador_id,a.situacao,d.papel
     FROM alerta a JOIN alerta_destinatario d ON d.alerta_id=a.id AND d.usuario_id=$2
     WHERE a.id=$1 FOR UPDATE OF a`,[data.alerta_id,identity.id]);alert=rows[0];
   // Somente dono vigente, nunca observador. RH pode ser dono excepcional de diretor sem chefia.
   if(!mayTreatAlert(identity,alert)||alert.colaborador_id!==data.colaborador_id){await client.query('ROLLBACK');return null;}
   if(!(await this.scope(client,identity,data.colaborador_id))){await client.query('ROLLBACK');return null;}
  }else if(!canActWithoutAlert(identity,await this.scope(client,identity,data.colaborador_id))){await client.query('ROLLBACK');return null;}
  const {rows:[action]}=await client.query(`INSERT INTO acao_acompanhamento(alerta_id,colaborador_id,autor_id,tipo,descricao,data_revisao)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING id,alerta_id,colaborador_id,autor_id,tipo,descricao,data_revisao,criada_em`,
   [data.alerta_id,data.colaborador_id,identity.id,data.tipo,data.descricao,data.data_revisao]);
  if(alert){
   // Caso tratado: nova acao e historico, sem reabrir nem sobrescrever tratamento anterior.
   if(alert.situacao==='aberto'){
    await client.query(`UPDATE alerta SET situacao='tratado',tratado_em=clock_timestamp() WHERE id=$1`,[alert.id]);
    await client.query(`INSERT INTO alerta_evento(alerta_id,evento,ator_id,detalhes) VALUES($1,'tratado',$2,jsonb_build_object('acao_id',$3::text))`,[alert.id,identity.id,action.id]);
   }
   await client.query(`INSERT INTO alerta_evento(alerta_id,evento,ator_id,detalhes) VALUES($1,'acao_registrada',$2,jsonb_build_object('acao_id',$3::text))`,[alert.id,identity.id,action.id]);
  }
  await client.query('COMMIT');return {acao:action,alerta_situacao:alert?(alert.situacao==='aberto'?'tratado':alert.situacao):null};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 async list(identity,colaboradorId){const client=await this.pool.connect();try{
  if(!(await this.scope(client,identity,colaboradorId)))return null;
  const {rows}=await client.query(`SELECT a.id,a.alerta_id,a.colaborador_id,a.autor_id,a.tipo,a.descricao,a.data_revisao,a.criada_em FROM acao_acompanhamento a
    WHERE a.colaborador_id=$1 ORDER BY a.criada_em DESC,a.id DESC LIMIT 200`,[colaboradorId]);return rows;
 }finally{client.release();}}
 async listAlert(identity,alertId){const client=await this.pool.connect();try{
  const {rows:[alert]}=await client.query(`SELECT a.colaborador_id FROM alerta a JOIN alerta_destinatario d ON d.alerta_id=a.id WHERE a.id=$1 AND d.usuario_id=$2`,[alertId,identity.id]);
  if(!alert||!(await this.scope(client,identity,alert.colaborador_id)))return null;
  const {rows}=await client.query(`SELECT id,alerta_id,colaborador_id,autor_id,tipo,descricao,data_revisao,criada_em FROM acao_acompanhamento WHERE alerta_id=$1 ORDER BY criada_em,id`,[alertId]);return rows;
 }finally{client.release();}}
 async enqueueReviews(today){
  const {rows}=await this.pool.query(`SELECT a.id,a.autor_id,a.data_revisao,u.ativo FROM acao_acompanhamento a
   JOIN usuario u ON u.id=a.autor_id
   WHERE a.data_revisao=$1::date AND u.ativo=true`,[today]);
  let queued=0;
  for(const a of rows){
   // Revalida perfil vigente e acesso antes de avisar; sem mostrar dado de bem-estar no email.
   const client=await this.pool.connect();try{
    const {rows:[act]}=await client.query('SELECT colaborador_id FROM acao_acompanhamento WHERE id=$1',[a.id]);
    const {rows:roles}=await client.query(`SELECT perfil FROM atribuicao_perfil WHERE usuario_id=$1 AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now())`,[a.autor_id]);
    if(!await this.scope(client,{id:a.autor_id,perfis:roles.map(x=>x.perfil)},act.colaborador_id))continue;
    const {rowCount}=await client.query(`INSERT INTO notificacao_saida(chave,destinatario_id,tipo,assunto,corpo)
       VALUES($1,$2,'revisao_acao','Lembrete de revisão','Você possui uma revisão de acompanhamento programada para hoje. Consulte o sistema.') ON CONFLICT(chave) DO NOTHING`,[`revisao:${a.id}:${today}:${a.autor_id}`,a.autor_id]);queued+=rowCount;
   }finally{client.release();}
  }return {data:today,avaliadas:rows.length,enfileiradas:queued};
 }
}
module.exports={PgAcaoRepository};
