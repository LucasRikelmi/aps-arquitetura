const {weekOf}=require('../services/AlertaPolicy');
class PgAlertaRepository {
 constructor(pool){this.pool=pool;}
 async users(){const {rows}=await this.pool.query('SELECT id,login FROM usuario WHERE ativo=true ORDER BY id');return rows;}
 async context(userId,today){
  const [metas,checkins,afastamentos,roles]=await Promise.all([
   this.pool.query(`SELECT m.id,m.inicio::text,m.prazo::text,m.responsavel_id,
      COALESCE(v.valor_validado,p.progresso,0)::numeric AS progresso_efetivo
      FROM meta m
      LEFT JOIN LATERAL (SELECT cp.* FROM checkin_progresso cp JOIN checkin_semanal c ON c.id=cp.checkin_id
        WHERE cp.meta_id=m.id AND c.usuario_id=m.responsavel_id ORDER BY c.semana_inicio DESC LIMIT 1) p ON true
      LEFT JOIN LATERAL (SELECT vp.valor_validado FROM validacao_progresso vp
        WHERE vp.meta_id=m.id AND vp.revisao_autorrelato=p.revisao
          AND vp.checkin_id=p.checkin_id ORDER BY vp.criado_em DESC,vp.id DESC LIMIT 1) v ON true
      WHERE m.responsavel_id=$1`,[userId]),
   this.pool.query(`SELECT semana_inicio::text,humor,carga,true AS respondeu FROM checkin_semanal
      WHERE usuario_id=$1 AND semana_inicio>=$2::date-interval '90 days'`,[userId,today]),
   this.pool.query(`SELECT semana_inicio::text AS semana_inicio FROM afastamento_semana WHERE usuario_id=$1 AND semana_inicio>=$2::date-interval '90 days'`,[userId,today]),
   this.pool.query(`SELECT
      (SELECT acompanhamento_inicio::text FROM usuario WHERE id=$1) AS acompanhamento_inicio,
      (SELECT v.gestor_id FROM vinculo_gestor v WHERE v.colaborador_id=$1 AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now()) ORDER BY v.inicio_em DESC LIMIT 1) AS titular,
      (SELECT c.gestor_substituto_id FROM cobertura_gestor c WHERE c.colaborador_id=$1 AND c.inicio_em<=now() AND c.fim_em>now() ORDER BY c.inicio_em DESC LIMIT 1) AS substituto,
      (SELECT d.gestor_id FROM designacao_meta_diretor d WHERE d.diretor_id=$1 AND d.inicio_em<=now() AND d.fim_em>now() ORDER BY d.inicio_em DESC LIMIT 1) AS diretor_designado`,[userId])
  ]);
  const {rows:rh}=await this.pool.query(`SELECT DISTINCT usuario_id FROM atribuicao_perfil WHERE perfil='RH' AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now())`);
  return {metas:metas.rows,checkins:checkins.rows,afastamentos:afastamentos.rows,roles:{...roles.rows[0],rh:rh.map(x=>x.usuario_id)}};
 }
 async upsertAlert(userId,candidate,recipients){
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${userId}:${candidate.tipo}:${candidate.objeto_id||'ausencia'}`]);
   const {rows:[opened]}=await client.query(`SELECT id FROM alerta WHERE colaborador_id=$1 AND tipo=$2
    AND objeto_id IS NOT DISTINCT FROM $3::uuid AND situacao='aberto'
    ORDER BY criado_em LIMIT 1`,[userId,candidate.tipo,candidate.objeto_id]);
   // Sem duplicar a mesma condicao enquanto houver alerta aberto; ownership atualizado pelo processo diário.
   if(opened && opened.id){
    for(const r of recipients)await client.query(`INSERT INTO alerta_destinatario(alerta_id,usuario_id,papel) VALUES($1,$2,$3)
       ON CONFLICT(alerta_id,usuario_id) DO UPDATE SET papel=EXCLUDED.papel`,[opened.id,r.usuario_id,r.papel]);
    await client.query(`DELETE FROM alerta_destinatario WHERE alerta_id=$1 AND NOT(usuario_id=ANY($2::uuid[]))`,[opened.id,recipients.map(x=>x.usuario_id)]);
    await client.query('COMMIT');return {id:opened.id,new:false};
   }
   const {rows:[item]}=await client.query(`INSERT INTO alerta(colaborador_id,tipo,objeto_id,semana_inicio)
    VALUES($1,$2,$3,$4)
    ON CONFLICT DO NOTHING RETURNING id,situacao`,[userId,candidate.tipo,candidate.objeto_id,candidate.semana_inicio]);
   const {rows:[existing]}=item?{rows:[item]}:await client.query(`SELECT id,situacao FROM alerta WHERE colaborador_id=$1 AND tipo=$2
     AND semana_inicio=$3 AND objeto_id IS NOT DISTINCT FROM $4::uuid`,[userId,candidate.tipo,candidate.semana_inicio,candidate.objeto_id]);
   if(!existing){throw Error('alerta não localizado após inclusão');}
   if(item)await client.query(`INSERT INTO alerta_evento(alerta_id,evento) VALUES($1,'criado')`,[existing.id]);
   // So reatribuir alertas abertos; eventos anteriores permanecem no historico.
   if(existing.situacao==='aberto'){
    await client.query('DELETE FROM alerta_destinatario WHERE alerta_id=$1',[existing.id]);
    for(const r of recipients)await client.query(`INSERT INTO alerta_destinatario(alerta_id,usuario_id,papel) VALUES($1,$2,$3)
      ON CONFLICT(alerta_id,usuario_id) DO UPDATE SET papel=EXCLUDED.papel`,[existing.id,r.usuario_id,r.papel]);
   }
   await client.query('COMMIT');return {id:existing.id,new:Boolean(item)};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 async listFor(identity){const {rows}=await this.pool.query(`SELECT a.id,a.colaborador_id,a.tipo,a.objeto_id,a.semana_inicio,a.situacao,a.criado_em,d.papel
   FROM alerta_destinatario d JOIN alerta a ON a.id=d.alerta_id
   WHERE d.usuario_id=$1 ORDER BY a.criado_em DESC LIMIT 100`,[identity.id]);return rows;}
 async detail(id,identity){const {rows}=await this.pool.query(`SELECT a.*, p.nome AS pessoa, t.tipo AS acao_tipo,t.revisao AS acao_revisao,t.descricao AS acao_descricao FROM alerta a JOIN alerta_destinatario d ON d.alerta_id=a.id AND d.usuario_id=$2 JOIN cadastro_pessoa p ON p.usuario_id=a.colaborador_id LEFT JOIN alerta_tratamento t ON t.alerta_id=a.id WHERE a.id=$1`,[id,identity.id]);
   const a=rows[0];return a?{...a,status:a.situacao,acao:a.acao_descricao?{tipo:a.acao_tipo,revisao:a.acao_revisao,descricao:a.acao_descricao}:null}:null;}
 async treat(id,identity,d){const client=await this.pool.connect();try{await client.query('BEGIN');
  const {rows}=await client.query(`SELECT a.id FROM alerta a JOIN alerta_destinatario z ON z.alerta_id=a.id WHERE a.id=$1 AND z.usuario_id=$2 AND z.papel='dono' AND a.situacao='aberto' FOR UPDATE OF a`,[id,identity.id]);
  if(!rows.length){await client.query('ROLLBACK');return null;}
  await client.query(`INSERT INTO alerta_tratamento(alerta_id,autor_id,tipo,revisao,descricao) VALUES($1,$2,$3,$4,$5)`,[id,identity.id,d.tipo||'acompanhamento',d.revisao||null,d.descricao.trim()]);
  await client.query(`UPDATE alerta SET situacao='tratado',tratado_em=now() WHERE id=$1`,[id]);
  await client.query(`INSERT INTO alerta_evento(alerta_id,evento,ator_id) VALUES($1,'tratado',$2)`,[id,identity.id]);
  await client.query('COMMIT');return {id,status:'tratado',acao:{tipo:d.tipo||'acompanhamento',revisao:d.revisao||null,descricao:d.descricao.trim()}};
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 async close(id,identity,estado){
  const client=await this.pool.connect();try{await client.query('BEGIN');
   const {rows:[current]}=await client.query(`SELECT a.id,a.situacao FROM alerta a JOIN alerta_destinatario d ON d.alerta_id=a.id
      WHERE a.id=$1 AND d.usuario_id=$2 AND d.papel='dono' FOR UPDATE OF a`,[id,identity.id]);
   if(!current){await client.query('ROLLBACK');return null;}
   if(current.situacao!=='aberto'){await client.query('ROLLBACK');return null;}
   await client.query(`UPDATE alerta SET situacao=$2,tratado_em=CASE WHEN $2='tratado' THEN now() ELSE tratado_em END,
       encerrado_em=CASE WHEN $2='encerrado' THEN now() ELSE encerrado_em END WHERE id=$1`,[id,estado]);
   await client.query(`INSERT INTO alerta_evento(alerta_id,evento,ator_id) VALUES($1,$2,$3)`,[id,estado,identity.id]);
   await client.query('COMMIT');return {id,situacao:estado};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 async enqueue({key,recipient,type,subject,body}){
  const {rowCount}=await this.pool.query(`INSERT INTO notificacao_saida(chave,destinatario_id,tipo,assunto,corpo)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(chave) DO NOTHING`,[key,recipient,type,subject,body]);return rowCount===1;
 }
 async usersWithRoles(role){const {rows}=await this.pool.query(`SELECT DISTINCT u.id,u.login FROM usuario u
 JOIN atribuicao_perfil p ON p.usuario_id=u.id WHERE u.ativo=true AND p.perfil=$1 AND p.inicio_em<=now()
 AND (p.fim_em IS NULL OR p.fim_em>now())`,[role]);return rows;}
 async participation(monday){const {rows}=await this.pool.query(`SELECT u.id,
 (SELECT l.departamento_id FROM lotacao_painel l WHERE l.usuario_id=u.id AND l.inicio_em<=now()
  AND (l.fim_em IS NULL OR l.fim_em>now()) ORDER BY l.inicio_em DESC LIMIT 1) AS departamento,
 EXISTS(SELECT 1 FROM checkin_semanal c WHERE c.usuario_id=u.id AND c.semana_inicio=$1::date) AS respondeu,
 EXISTS(SELECT 1 FROM afastamento_semana f WHERE f.usuario_id=u.id AND f.semana_inicio=$1::date) AS afastado
 FROM usuario u WHERE u.ativo=true`,[monday]);return rows;}
 async pendingReminderUsers(monday){const {rows}=await this.pool.query(`SELECT u.id,u.login FROM usuario u WHERE u.ativo=true AND
 EXISTS(SELECT 1 FROM atribuicao_perfil p WHERE p.usuario_id=u.id AND p.perfil='Colaborador'
  AND p.inicio_em<=now() AND (p.fim_em IS NULL OR p.fim_em>now()))
 AND NOT EXISTS(SELECT 1 FROM checkin_semanal c WHERE c.usuario_id=u.id AND c.semana_inicio=$1::date)
 AND NOT EXISTS(SELECT 1 FROM afastamento_semana f WHERE f.usuario_id=u.id AND f.semana_inicio=$1::date)`,[monday]);return rows;}
 async openAlertsCount(){const {rows}=await this.pool.query(`SELECT d.usuario_id, count(*)::int AS total FROM alerta_destinatario d
  JOIN alerta a ON a.id=d.alerta_id WHERE a.situacao='aberto' GROUP BY d.usuario_id`);return rows;}
 async nextMails(){const client=await this.pool.connect();try{await client.query('BEGIN');
  const {rows}=await client.query(`SELECT n.id,n.chave,n.assunto,n.corpo,u.login FROM notificacao_saida n
  JOIN usuario u ON u.id=n.destinatario_id
  WHERE (n.status IN ('pendente','falhou') OR (n.status='enviando' AND n.tentativa_em<now()-interval '15 minutes')) AND n.tentativas<5
  ORDER BY n.criado_em FOR UPDATE OF n SKIP LOCKED LIMIT 20`);
  if(rows.length)await client.query(`UPDATE notificacao_saida SET status='enviando',tentativa_em=now(),tentativas=tentativas+1 WHERE id=ANY($1::uuid[])`,[rows.map(x=>x.id)]);
  await client.query('COMMIT');return rows;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
 async mailResult(id,ok,error=null){await this.pool.query(`UPDATE notificacao_saida SET status=$2,enviado_em=CASE WHEN $2='enviado' THEN now() ELSE NULL END,ultimo_erro=$3 WHERE id=$1`,[id,ok?'enviado':'falhou',error?.slice(0,120)||null]);}
}
module.exports={PgAlertaRepository};
