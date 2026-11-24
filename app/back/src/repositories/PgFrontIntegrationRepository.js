class PgFrontIntegrationRepository {
  constructor(pool){this.pool=pool;}
  async perguntas(){const {rows}=await this.pool.query(`SELECT id,texto,tipo,resposta,ativa,respostas FROM pergunta_checkin ORDER BY id DESC`);return rows;}
  async criarPergunta(d){const {rows}=await this.pool.query(`INSERT INTO pergunta_checkin(texto,tipo,resposta) VALUES($1,$2,$3) RETURNING id`,[d.texto.trim(),d.tipo,d.resposta]);return rows[0];}
  async inativarPergunta(id){const {rowCount}=await this.pool.query('UPDATE pergunta_checkin SET ativa=false WHERE id=$1',[id]);return rowCount>0;}
  async alterarPergunta(id,d){const client=await this.pool.connect();try{await client.query('BEGIN');
   const {rows}=await client.query('SELECT * FROM pergunta_checkin WHERE id=$1 AND ativa=true FOR UPDATE',[id]);
   if(!rows.length){await client.query('ROLLBACK');return false;}
   await client.query('UPDATE pergunta_checkin SET ativa=false WHERE id=$1',[id]);
   await client.query('INSERT INTO pergunta_checkin(texto,tipo,resposta,substitui_id) VALUES($1,$2,$3,$4)',[d.texto.trim(),rows[0].tipo,rows[0].resposta,id]);
   await client.query('COMMIT');return true;
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
  async parametros(){const {rows}=await this.pool.query('SELECT dados FROM parametros_checkin WHERE id=1');return rows[0]?.dados || null;}
  async salvarParametros(d){const {rows}=await this.pool.query(`UPDATE parametros_checkin SET dados=dados || $1::jsonb,atualizado_em=now() WHERE id=1 RETURNING dados`,[JSON.stringify(d)]);return rows[0]?.dados;}
  async sincronizacaoFolha(){const {rows}=await this.pool.query(`SELECT max(ocorrido_em) AS ultima FROM evento_organizacional WHERE operacao='sincronizacao_folha'`);return {ativa:true,ultima:rows[0]?.ultima||null};}
  async agregados(identity,departamento){
    // Somente dados agregados; linhas com menos de 5 respondentes nao revelam indicadores.
    const {rows}=await this.pool.query(`
      WITH visiveis AS (
        SELECT d.id,d.nome, l.usuario_id
        FROM departamento d JOIN lotacao l ON l.departamento_id=d.id
          AND l.inicio<=current_date AND (l.fim IS NULL OR l.fim>=current_date)
        JOIN usuario u ON u.id=l.usuario_id AND u.ativo=true
        WHERE ($1::text IS NULL OR d.nome=$1)
          AND ($2::boolean OR EXISTS (
            SELECT 1 FROM lotacao m WHERE m.usuario_id=l.usuario_id AND m.gestor_id=$3
              AND m.inicio<=current_date AND (m.fim IS NULL OR m.fim>=current_date)))
      )
      SELECT v.nome AS departamento,
        COUNT(DISTINCT v.usuario_id)::int AS total,
        COUNT(DISTINCT c.usuario_id)::int AS respondentes,
        ROUND(AVG(c.humor)::numeric,1) AS humor,
        ROUND((COUNT(DISTINCT c.usuario_id)*100.0/NULLIF(COUNT(DISTINCT v.usuario_id),0))::numeric,0) AS participacao,
        ROUND((COUNT(DISTINCT c.usuario_id) FILTER (WHERE c.carga='Pesada')*100.0/NULLIF(COUNT(DISTINCT c.usuario_id),0))::numeric,0) AS carga_pesada
      FROM visiveis v LEFT JOIN checkin_semanal c ON c.usuario_id=v.usuario_id
       AND c.semana_inicio>=date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')::date
      GROUP BY v.nome ORDER BY v.nome
    `,[departamento&&departamento!=='Todos'?departamento:null,identity.perfis.some(x=>['RH','Diretoria'].includes(x)),identity.id]);
    const linhas=rows.map(x=>x.respondentes<5?{departamento:x.departamento,ocultoPor:'Menos de 5 respondentes'}:
      {departamento:x.departamento,respondentes:x.respondentes,participacao:Number(x.participacao||0),humor:String(x.humor||'0').replace('.',','),cargaPesada:Number(x.carga_pesada||0),progresso:null});
    const publicas=linhas.filter(x=>!x.ocultoPor);
    const avg=k=>publicas.length?Math.round(publicas.reduce((a,x)=>a+Number(String(x[k]||0).replace(',','.')),0)/publicas.length*10)/10:0;
    return {departamentos:['Todos',...rows.filter(x=>x.respondentes>=5).map(x=>x.departamento)],periodo:new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date()),resumo:{participacao:Math.round(avg('participacao')),humor:String(avg('humor')).replace('.',','),cargaPesada:Math.round(avg('cargaPesada')),progresso:null},linhas};
  }
}
module.exports={PgFrontIntegrationRepository};
