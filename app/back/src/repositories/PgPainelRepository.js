const {mondayOfIsoWeek}=require('../services/IsoWeek');
class PgPainelRepository {
 constructor(pool){this.pool=pool;}
 async actor(identity){
  const {rows}=await this.pool.query(`SELECT EXISTS(SELECT 1 FROM usuario WHERE id=$1 AND ativo=true) AS ativo,
    EXISTS(SELECT 1 FROM atribuicao_perfil WHERE usuario_id=$1 AND perfil='Gestor' AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now())) AS gestor,
    EXISTS(SELECT 1 FROM atribuicao_perfil WHERE usuario_id=$1 AND perfil='RH' AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now())) AS rh`,[identity.id]);
  return rows[0];
 }
 async scope(identity,ownerId){
  const {rows}=await this.pool.query(`SELECT EXISTS(SELECT 1 FROM usuario WHERE id=$2 AND ativo=true) AS ativo,
    EXISTS(SELECT 1 FROM vinculo_gestor WHERE gestor_id=$1 AND colaborador_id=$2 AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now())) AS equipe,
    EXISTS(SELECT 1 FROM cobertura_gestor c WHERE c.gestor_substituto_id=$1 AND c.colaborador_id=$2 AND c.inicio_em<=now() AND c.fim_em>now() AND EXISTS
    (SELECT 1 FROM vinculo_gestor v WHERE v.gestor_id=c.gestor_titular_id AND v.colaborador_id=$2 AND v.inicio_em<=c.inicio_em AND (v.fim_em IS NULL OR v.fim_em>c.inicio_em))) AS substituto`,[identity.id,ownerId]);
  return rows[0];
 }
 async team(identity,isRH){
  const {rows}=await this.pool.query(`SELECT u.id AS usuario_id FROM usuario u WHERE u.ativo=true AND
    ($2::boolean OR EXISTS(SELECT 1 FROM vinculo_gestor v WHERE v.colaborador_id=u.id AND v.gestor_id=$1 AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now()))
      OR EXISTS(SELECT 1 FROM cobertura_gestor c WHERE c.colaborador_id=u.id AND c.gestor_substituto_id=$1 AND c.inicio_em<=now() AND c.fim_em>now() AND EXISTS
       (SELECT 1 FROM vinculo_gestor v WHERE v.gestor_id=c.gestor_titular_id AND v.colaborador_id=c.colaborador_id AND v.inicio_em<=c.inicio_em AND (v.fim_em IS NULL OR v.fim_em>c.inicio_em))))
     ORDER BY u.id`,[identity.id,isRH]);return rows.map(r=>r.usuario_id);
 }
 async weeks(ownerIds,{limit=8}={}){
  if(!ownerIds.length)return [];
  const {rows}=await this.pool.query(`SELECT p.usuario_id,to_char(p.semana_inicio,'YYYY-MM-DD') AS semana_inicio,p.ano_iso,p.semana_iso,p.respondeu,
   p.humor,p.carga,p.progresso_percentual,p.origem_progresso,p.metas_com_progresso,p.metas_validadas,p.calculado_em
   FROM painel_semana_usuario p WHERE p.usuario_id=ANY($1::uuid[]) AND p.semana_inicio >=
     (date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date - (($2::integer-1)*interval '7 days'))
   ORDER BY p.usuario_id,p.semana_inicio DESC`,[ownerIds,limit]);return rows;
 }
 async currentDepartments(ids){
  if(!ids.length)return [];
  const {rows}=await this.pool.query(`SELECT DISTINCT ON (l.usuario_id) l.usuario_id,l.departamento_id,d.nome FROM lotacao_painel l
   JOIN departamento_painel d ON d.id=l.departamento_id
   WHERE l.usuario_id=ANY($1::uuid[]) AND l.inicio_em<=now() AND (l.fim_em IS NULL OR l.fim_em>now())
   ORDER BY l.usuario_id,l.inicio_em DESC`,[ids]);return rows;
 }
 async pending(){const {rows}=await this.pool.query('SELECT COUNT(*)::int AS total FROM painel_semana_pendente');return rows[0].total;}
 // Reconstrucao diaria: os ultimos 26 periodos corridos para TODOS usuarios ativos.
 // A cache e derivada, preserva originais, e nao executa ao abrir o painel.
 async refresh({weeks=26}={}){
  if(!Number.isInteger(weeks)||weeks<8||weeks>260)throw Error('janela invalida');
  const client=await this.pool.connect();
  try{
   await client.query('BEGIN');
   const {rows:[lock]}=await client.query('SELECT pg_try_advisory_xact_lock(5947301) AS locked');
   if(!lock.locked){await client.query('ROLLBACK');return {executado:false,motivo:'rotina em andamento'};}
   const result=await client.query(`WITH semanas AS (
       SELECT generate_series(date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date - (($1::integer-1)*interval '7 days'),
             date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date,interval '7 days')::date AS segunda
     ), base AS (SELECT u.id AS usuario_id,s.segunda FROM usuario u CROSS JOIN semanas s WHERE u.ativo=true),
     progressos AS (
      SELECT c.id AS checkin_id,avg(COALESCE(v.valor_validado,p.progresso)) AS media,
       count(*)::int AS total,count(v.valor_validado)::int AS validados
      FROM checkin_semanal c JOIN checkin_progresso p ON p.checkin_id=c.id
      LEFT JOIN LATERAL (SELECT valor_validado FROM validacao_progresso v
       WHERE v.checkin_id=p.checkin_id AND v.meta_id=p.meta_id AND v.revisao_autorrelato=p.revisao
       ORDER BY v.criado_em DESC,v.id DESC LIMIT 1) v ON true
      WHERE c.semana_inicio >= date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date - (($1::integer-1)*interval '7 days')
      GROUP BY c.id
     )
     INSERT INTO painel_semana_usuario(usuario_id,semana_inicio,ano_iso,semana_iso,respondeu,humor,carga,
      progresso_percentual,origem_progresso,metas_com_progresso,metas_validadas,calculado_em)
     SELECT b.usuario_id,b.segunda,EXTRACT(isoyear FROM b.segunda)::int,EXTRACT(week FROM b.segunda)::int,
      c.id IS NOT NULL,c.humor,c.carga,round(p.media,2),
      CASE WHEN p.total IS NULL THEN NULL WHEN p.validados=0 THEN 'autorrelato'
      WHEN p.total=p.validados THEN 'validado' ELSE 'misto' END,
      COALESCE(p.total,0),COALESCE(p.validados,0),clock_timestamp()
     FROM base b LEFT JOIN checkin_semanal c ON c.usuario_id=b.usuario_id AND c.semana_inicio=b.segunda
     LEFT JOIN progressos p ON p.checkin_id=c.id
     ON CONFLICT(usuario_id,semana_inicio) DO UPDATE SET
     ano_iso=EXCLUDED.ano_iso,semana_iso=EXCLUDED.semana_iso,respondeu=EXCLUDED.respondeu,
     humor=EXCLUDED.humor,carga=EXCLUDED.carga,progresso_percentual=EXCLUDED.progresso_percentual,
     origem_progresso=EXCLUDED.origem_progresso,metas_com_progresso=EXCLUDED.metas_com_progresso,
     metas_validadas=EXCLUDED.metas_validadas,calculado_em=EXCLUDED.calculado_em`,[weeks]);
   await client.query(`DELETE FROM painel_semana_pendente WHERE semana_inicio >=
    date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date - (($1::integer-1)*interval '7 days')`,[weeks]);
   await client.query('COMMIT');return {executado:true,linhas:result.rowCount};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
}
module.exports={PgPainelRepository};
