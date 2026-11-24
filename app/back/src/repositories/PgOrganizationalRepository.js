const {sanitizePessoa}=require('../services/OrganizationalPolicy');
class PgOrganizationalRepository{
 constructor(pool){this.pool=pool;}
 async tx(work){const c=await this.pool.connect();try{await c.query('BEGIN');const result=await work(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async event(c,actor,target,operation,detail={}){await c.query('INSERT INTO evento_organizacional(autor_id,alvo_id,operacao,detalhe) VALUES($1,$2,$3,$4::jsonb)',[actor,target,operation,JSON.stringify(detail)]);}
 async resolveFrontNames(data){
  const {rows:deps}=await this.pool.query('SELECT id FROM departamento WHERE nome=$1 AND ativo=true',[data.departamento]);
  const {rows:cargos}=await this.pool.query('SELECT id FROM cargo WHERE nome=$1 AND ativo=true',[data.cargo]);
  const {rows:gestores}=data.gestor?await this.pool.query('SELECT u.id FROM usuario u JOIN cadastro_pessoa p ON p.usuario_id=u.id WHERE p.nome=$1 AND u.ativo=true LIMIT 2',[data.gestor]):{rows:[]};
  if(deps.length!==1||cargos.length!==1||(data.gestor&&gestores.length!==1))return null;
  return {departamento_id:deps[0].id,cargo_id:cargos[0].id,gestor_id:gestores[0]?.id||null};
 }
 async idByName(nome){const {rows}=await this.pool.query('SELECT u.id FROM usuario u JOIN cadastro_pessoa p ON p.usuario_id=u.id WHERE p.nome=$1 AND u.ativo=true LIMIT 2',[nome]);return rows.length===1?rows[0].id:null;}
 async createPerson(actor,data,blockedHash){return this.tx(async c=>{
   const u=await c.query('INSERT INTO usuario(login,senha_hash,ativo) VALUES($1,$2,TRUE) RETURNING id,login',[data.email,blockedHash]);
   const id=u.rows[0].id;
   await c.query(`INSERT INTO cadastro_pessoa(usuario_id,nome,cpf,nascimento,endereco,telefone,matricula,admissao,contrato) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,data.nome.trim(),data.cpf??null,data.nascimento??null,data.endereco??null,data.telefone??null,data.matricula??null,data.admissao??null,data.contrato??null]);
   await c.query(`INSERT INTO atribuicao_perfil(usuario_id,perfil) VALUES($1,'Colaborador')`,[id]);
   if(data.departamento_id){await this._assign(c,actor,{usuario_id:id,departamento_id:data.departamento_id,cargo_id:data.cargo_id,gestor_id:data.gestor_id??null,inicio:data.inicio});}
   await this.event(c,actor,id,'cadastro_pessoa');
   return {id,email:data.email,nome:data.nome,credencial:'pendente_de_ativacao'};
 });}
 async editPerson(actor,id,data){return this.tx(async c=>{
  const exists=await c.query('SELECT p.origem_folha FROM cadastro_pessoa p WHERE p.usuario_id=$1 FOR UPDATE',[id]);if(!exists.rows.length)return null;
  if(exists.rows[0].origem_folha && ['nome','email'].some(k=>k in data)){const e=new Error('folha');e.code='FOLHA_READONLY';throw e;}
  const allowed=['nome','cpf','nascimento','endereco','telefone'];const fields=allowed.filter(k=>Object.hasOwn(data,k));
  if(fields.length){const sets=fields.map((k,i)=>`${k}=$${i+2}`);await c.query(`UPDATE cadastro_pessoa SET ${sets.join(',')}, atualizado_em=now() WHERE usuario_id=$1`,[id,...fields.map(k=>data[k])]);}
  if(data.email!==undefined)await c.query('UPDATE usuario SET login=$2 WHERE id=$1',[id,data.email]);
  await this.event(c,actor,id,'edicao_cadastro',{campos:Object.keys(data)});
  const r=await c.query('SELECT u.id,u.login AS email,p.nome FROM usuario u JOIN cadastro_pessoa p ON p.usuario_id=u.id WHERE u.id=$1',[id]);return r.rows[0];
 });}
 async changeProfiles(actorId,id,perfis){const c=await this.pool.connect();try{await c.query('BEGIN');
  // Serialize profile changes to prevent removing concurrent last administrators.
  await c.query("SELECT pg_advisory_xact_lock(hashtext('benigno:perfil_admin'))");
  const {rows:[target]}=await c.query('SELECT id,ativo FROM usuario WHERE id=$1 FOR UPDATE',[id]);
  if(!target){await c.query('ROLLBACK');return null;}
  const {rows:current}=await c.query(`SELECT perfil FROM atribuicao_perfil WHERE usuario_id=$1 AND inicio_em<=now() AND (fim_em IS NULL OR fim_em>now()) FOR UPDATE`,[id]);
  const wasAdmin=current.some(x=>x.perfil==='Administracao');
  if(wasAdmin&&!perfis.includes('administracao')){
   const {rows:[counter]}=await c.query(`SELECT count(DISTINCT p.usuario_id)::int AS total FROM atribuicao_perfil p JOIN usuario u ON u.id=p.usuario_id WHERE p.perfil='Administracao' AND u.ativo=true AND p.inicio_em<=now() AND (p.fim_em IS NULL OR p.fim_em>now())`);
   if(counter.total<=1){const e=new Error('Não é possível remover o último administrador.');e.status=422;throw e;}
  }
  const wanted=new Set(['Colaborador',...current.map(x=>x.perfil).filter(x=>['Gestor','Diretoria'].includes(x)),...perfis.map(x=>({rh:'RH',administracao:'Administracao'})[x]).filter(Boolean)]);
  for(const role of current.map(x=>x.perfil).filter(x=>!wanted.has(x))){await c.query(`UPDATE atribuicao_perfil SET fim_em=GREATEST(inicio_em + interval '1 millisecond',now()) WHERE usuario_id=$1 AND perfil=$2 AND fim_em IS NULL`,[id,role]);}
  for(const role of wanted){if(!current.some(x=>x.perfil===role))await c.query('INSERT INTO atribuicao_perfil(usuario_id,perfil) VALUES($1,$2)',[id,role]);}
  await c.query('UPDATE usuario SET auth_version=auth_version+1 WHERE id=$1',[id]);
  await c.query('UPDATE sessao SET revogada_em=now() WHERE usuario_id=$1 AND revogada_em IS NULL',[id]);
  await this.event(c,actorId,id,'alteracao_perfis',{perfis});
  await c.query('COMMIT');return {id,perfis:[...wanted].map(x=>x.toLowerCase()),ativo:target.ativo};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async listPeople(){const {normalizarPerfis,perfilMaisAlto}=require('../services/PerfilService');
  const {rows}=await this.pool.query(`SELECT u.id,u.login AS email,u.ativo,p.nome,p.matricula,to_char(p.admissao,'YYYY-MM-DD') AS admissao,p.contrato,d.nome AS departamento,c.nome AS cargo,gest.nome AS gestor,
   COALESCE((SELECT array_agg(ap.perfil) FROM atribuicao_perfil ap WHERE ap.usuario_id=u.id AND ap.inicio_em<=now() AND (ap.fim_em IS NULL OR ap.fim_em>now())),ARRAY[]::text[]) AS perfis
   FROM usuario u JOIN cadastro_pessoa p ON p.usuario_id=u.id
   LEFT JOIN LATERAL (SELECT * FROM lotacao l WHERE l.usuario_id=u.id AND l.inicio<=current_date AND (l.fim IS NULL OR l.fim>=current_date) ORDER BY l.inicio DESC LIMIT 1) l ON true
   LEFT JOIN departamento d ON d.id=l.departamento_id LEFT JOIN cargo c ON c.id=l.cargo_id LEFT JOIN cadastro_pessoa gest ON gest.usuario_id=l.gestor_id
   ORDER BY p.nome`);return rows.map(x=>({...x,perfis:normalizarPerfis(x.perfis),perfil:perfilMaisAlto(x.perfis)}));
 }
 async getPerson(id,privateFields){const r=await this.pool.query(`SELECT u.id,u.login AS email,u.ativo,p.nome,p.cpf,p.nascimento,p.endereco,p.telefone,d.nome AS departamento,c.nome AS cargo,l.gestor_id FROM usuario u JOIN cadastro_pessoa p ON p.usuario_id=u.id LEFT JOIN LATERAL (SELECT * FROM lotacao z WHERE z.usuario_id=u.id AND z.inicio<=CURRENT_DATE AND (z.fim IS NULL OR z.fim>=CURRENT_DATE) ORDER BY z.inicio DESC LIMIT 1) l ON true LEFT JOIN departamento d ON d.id=l.departamento_id LEFT JOIN cargo c ON c.id=l.cargo_id WHERE u.id=$1`,[id]);return sanitizePessoa(r.rows[0],privateFields);}
 async hasManagerScope(manager,owner){const r=await this.pool.query(`SELECT EXISTS (SELECT 1 FROM lotacao l WHERE l.gestor_id=$1 AND l.usuario_id=$2 AND l.inicio<=CURRENT_DATE AND (l.fim IS NULL OR l.fim>=CURRENT_DATE) UNION ALL SELECT 1 FROM substituicao_gestor s JOIN lotacao l ON l.gestor_id=s.gestor_id WHERE s.substituto_id=$1 AND l.usuario_id=$2 AND s.inicio<=CURRENT_DATE AND s.fim>=CURRENT_DATE AND l.inicio<=CURRENT_DATE AND (l.fim IS NULL OR l.fim>=CURRENT_DATE)) ok`,[manager,owner]);return r.rows[0].ok;}
 async team(manager){const r=await this.pool.query(`SELECT DISTINCT u.id,u.login AS email,u.ativo,p.nome,d.nome AS departamento,c.nome AS cargo,l.gestor_id FROM usuario u JOIN cadastro_pessoa p ON p.usuario_id=u.id JOIN lotacao l ON l.usuario_id=u.id JOIN departamento d ON d.id=l.departamento_id JOIN cargo c ON c.id=l.cargo_id WHERE u.ativo AND l.inicio<=CURRENT_DATE AND (l.fim IS NULL OR l.fim>=CURRENT_DATE) AND (l.gestor_id=$1 OR EXISTS(SELECT 1 FROM substituicao_gestor s WHERE s.gestor_id=l.gestor_id AND s.substituto_id=$1 AND s.inicio<=CURRENT_DATE AND s.fim>=CURRENT_DATE)) ORDER BY p.nome`,[manager]);return r.rows.map(x=>sanitizePessoa(x,false));}
 async dictionary(actor,kind,data){const table=kind==='cargo'?'cargo':'departamento';return this.tx(async c=>{const q=table==='cargo'?'INSERT INTO cargo(nome) VALUES($1) RETURNING id,nome':'INSERT INTO departamento(nome,superior_id) VALUES($1,$2) RETURNING id,nome';const r=await c.query(q,table==='cargo'?[data.nome.trim()]:[data.nome.trim(),data.superior_id??null]);await this.event(c,actor,null,'cadastro_'+table,{id:r.rows[0].id});return r.rows[0];});}
 async _assign(c,actor,data){const target=await c.query('SELECT id,ativo FROM usuario WHERE id=$1 FOR UPDATE',[data.usuario_id]);if(!target.rows.length||!target.rows[0].ativo)throw new Error('usuário inativo ou inexistente');
  // Fecha lotação anterior um dia antes do novo início; não permite retroceder inícios.
  const old=await c.query('SELECT id,inicio,gestor_id FROM lotacao WHERE usuario_id=$1 AND fim IS NULL FOR UPDATE',[data.usuario_id]);
  if(old.rows.length){const r=await c.query(`UPDATE lotacao SET fim=($2::date - 1) WHERE id=$1 AND inicio<$2::date RETURNING id`,[old.rows[0].id,data.inicio]);if(!r.rows.length){const e=new Error('início conflitante');e.code='23514';throw e;}}
  const r=await c.query(`INSERT INTO lotacao(usuario_id,departamento_id,cargo_id,gestor_id,inicio) VALUES($1,$2,$3,$4,$5) RETURNING id`,[data.usuario_id,data.departamento_id,data.cargo_id,data.gestor_id||null,data.inicio]);
  await c.query(`UPDATE vinculo_gestor SET fim_em=GREATEST(inicio_em + interval '1 millisecond',($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo')) WHERE colaborador_id=$1 AND fim_em IS NULL`,[data.usuario_id,data.inicio]);
  if(data.gestor_id)await c.query(`INSERT INTO vinculo_gestor(gestor_id,colaborador_id,inicio_em) VALUES($1,$2,($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo'))`,[data.gestor_id,data.usuario_id,data.inicio]);
  await this.event(c,actor,data.usuario_id,'nova_lotacao',{lotacao_id:r.rows[0].id});return {id:r.rows[0].id};}
 async assign(actor,data){return this.tx(c=>this._assign(c,actor,data));}
 async leave(actor,data){return this.tx(async c=>{const r=await c.query('INSERT INTO afastamento(usuario_id,tipo,inicio,fim,registrado_por) VALUES($1,$2,$3,$4,$5) RETURNING id',[data.usuario_id,data.tipo,data.inicio,data.fim,actor]);await this.event(c,actor,data.usuario_id,'afastamento',{id:r.rows[0].id,tipo:data.tipo});return {id:r.rows[0].id};});}
 async substitute(actor,data){return this.tx(async c=>{const r=await c.query('INSERT INTO substituicao_gestor(gestor_id,substituto_id,inicio,fim,registrado_por) VALUES($1,$2,$3,$4,$5) RETURNING id',[data.gestor_id,data.substituto_id,data.inicio,data.fim,actor]);
  // Espelha o período no mecanismo de escopo das listas anteriores.
  await c.query(`INSERT INTO vinculo_gestor(gestor_id,colaborador_id,inicio_em,fim_em)
    SELECT $2,l.usuario_id,($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo'),(($4::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
    FROM lotacao l WHERE l.gestor_id=$1 AND l.inicio<=$4::date AND (l.fim IS NULL OR l.fim>=$3::date)`,[data.gestor_id,data.substituto_id,data.inicio,data.fim]);
  await this.event(c,actor,data.gestor_id,'substituicao',{id:r.rows[0].id,substituto_id:data.substituto_id});return {id:r.rows[0].id};});}
 async terminate(actor,id,date){return this.tx(async c=>{const user=await c.query('SELECT ativo FROM usuario WHERE id=$1 FOR UPDATE',[id]);if(!user.rows.length)return null;
  await c.query('UPDATE usuario SET ativo=FALSE,auth_version=auth_version+1 WHERE id=$1',[id]);
  await c.query('UPDATE sessao SET revogada_em=now() WHERE usuario_id=$1 AND revogada_em IS NULL',[id]);
  await c.query('UPDATE lotacao SET fim=GREATEST(inicio,$2::date) WHERE usuario_id=$1 AND fim IS NULL',[id,date]);
  await c.query(`UPDATE vinculo_gestor SET fim_em=GREATEST(inicio_em + interval '1 millisecond',now()) WHERE (colaborador_id=$1 OR gestor_id=$1) AND fim_em IS NULL`,[id]);
  await c.query(`UPDATE atribuicao_perfil SET fim_em=GREATEST(inicio_em + interval '1 millisecond',now()) WHERE usuario_id=$1 AND fim_em IS NULL`,[id]);
  await c.query(`UPDATE substituicao_gestor SET fim=GREATEST(inicio,CURRENT_DATE) WHERE substituto_id=$1 AND fim>CURRENT_DATE`,[id]);
  // Metas em andamento são tratadas pelo módulo de metas; evitar alterações silenciosas.
  await this.event(c,actor,id,'desligamento',{data:date});return {id,ativo:false,sessoes_revogadas:true};});}
 async sync(actor,records){return this.tx(async c=>{let updated=0,created=0;for(const row of records){
  const old=await c.query('SELECT u.id FROM usuario u JOIN cadastro_pessoa p ON p.usuario_id=u.id WHERE u.login=$1 FOR UPDATE',[row.email]);let id;
  if(old.rows.length){id=old.rows[0].id;await c.query('UPDATE cadastro_pessoa SET nome=$2,origem_folha=TRUE,atualizado_em=now() WHERE usuario_id=$1',[id,row.nome]);updated++;}
  else {const hash=row.blocked_hash; if(!hash||!hash.startsWith('$argon2id$'))throw new Error('hash fictício obrigatório para novos usuários da folha');const r=await c.query('INSERT INTO usuario(login,senha_hash) VALUES($1,$2) RETURNING id',[row.email,hash]);id=r.rows[0].id;await c.query('INSERT INTO cadastro_pessoa(usuario_id,nome,origem_folha) VALUES($1,$2,TRUE)',[id,row.nome]);await c.query("INSERT INTO atribuicao_perfil(usuario_id,perfil) VALUES($1,'Colaborador')",[id]);created++;}
  if(row.situacao==='inativo'){await c.query('UPDATE usuario SET ativo=FALSE,auth_version=auth_version+1 WHERE id=$1 AND ativo=TRUE',[id]);await c.query('UPDATE sessao SET revogada_em=now() WHERE usuario_id=$1 AND revogada_em IS NULL',[id]);await c.query("UPDATE atribuicao_perfil SET fim_em=GREATEST(inicio_em + interval '1 millisecond',now()) WHERE usuario_id=$1 AND fim_em IS NULL",[id]);await c.query('UPDATE lotacao SET fim=GREATEST(inicio,CURRENT_DATE) WHERE usuario_id=$1 AND fim IS NULL',[id]);await c.query("UPDATE vinculo_gestor SET fim_em=GREATEST(inicio_em + interval '1 millisecond',now()) WHERE colaborador_id=$1 AND fim_em IS NULL",[id]);}else{await c.query('UPDATE usuario SET ativo=TRUE WHERE id=$1',[id]);}
  // Reconciliar cargo e departamento com a folha, preservando lotações anteriores.
  const atual=await c.query('SELECT id,departamento_id,cargo_id,(inicio = CURRENT_DATE) AS mesmo_dia FROM lotacao WHERE usuario_id=$1 AND fim IS NULL FOR UPDATE',[id]);
  if(row.situacao==='ativo' && (!atual.rows.length||atual.rows[0].departamento_id!==row.departamento_id||atual.rows[0].cargo_id!==row.cargo_id)){
    if(atual.rows.length && atual.rows[0].mesmo_dia){
      await c.query('UPDATE lotacao SET departamento_id=$2,cargo_id=$3 WHERE id=$1',[atual.rows[0].id,row.departamento_id,row.cargo_id]);
    }else{
      if(atual.rows.length)await c.query('UPDATE lotacao SET fim=GREATEST(inicio,CURRENT_DATE - 1) WHERE id=$1',[atual.rows[0].id]);
      await c.query('INSERT INTO lotacao(usuario_id,departamento_id,cargo_id,gestor_id,inicio) VALUES($1,$2,$3,NULL,CURRENT_DATE)',[id,row.departamento_id,row.cargo_id]);
    }
  }
  await this.event(c,actor,id,'sincronizacao_folha',{situacao:row.situacao});}
  return {criados:created,atualizados:updated};});}
}
module.exports={PgOrganizationalRepository};
