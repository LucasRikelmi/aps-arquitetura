const test=require('node:test');
const assert=require('node:assert/strict');
const {evaluateIndividual,canReadAudit}=require('../src/services/AuthorizationPolicy');
const {authorizeIndividual,authorizeLogs}=require('../src/middleware/authorize');
const {AuditService}=require('../src/services/AuditService');
const {PgAuthorizationRepository}=require('../src/repositories/PgAuthorizationRepository');
const {PgAuditRepository}=require('../src/repositories/PgAuditRepository');
const alice='123e4567-e89b-12d3-a456-426614174000';
const bob='123e4567-e89b-12d3-a456-426614174001';
const base=(perfis,id=alice)=>({id,perfis});
function res(){return {code:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
test('HU-09.C01 colaborador nao acessa terceiro nem quando ID existe',()=>{
 assert.equal(evaluateIndividual(base(['Colaborador']),{ownerId:bob,kind:'checkin'}),false);
 assert.equal(evaluateIndividual(base(['Colaborador']),{ownerId:alice,kind:'checkin'}),true);
});
test('HU-09.C02 gestor acessa somente a equipe ou recurso individual expressamente designado',()=>{
 assert.equal(evaluateIndividual(base(['Gestor']),{ownerId:bob,kind:'checkin',scope:false}),false);
 assert.equal(evaluateIndividual(base(['Gestor']),{ownerId:bob,kind:'checkin',scope:true}),true);
 assert.equal(evaluateIndividual(base(['Gestor']),{ownerId:bob,kind:'meta',designation:true}),true);
 assert.equal(evaluateIndividual(base(['Gestor']),{ownerId:bob,kind:'checkin',designation:true}),false);
});
test('HU-09.C03 e C09 Administracao isolada nao le checkin mas pode ler log',()=>{
 assert.equal(evaluateIndividual(base(['Administracao']),{ownerId:bob,kind:'checkin'}),false);
 assert.equal(canReadAudit(base(['Administracao'])),true);
 assert.equal(canReadAudit(base(['RH'])),false);
 assert.equal(canReadAudit(base(['Gestor'])),false);
});
test('HU-09.C11 acumulacao de perfis exige papel e escopo da operacao',()=>{
 assert.equal(evaluateIndividual(base(['Diretoria','Administracao']),{ownerId:bob,kind:'checkin'}),false);
 assert.equal(evaluateIndividual(base(['Diretoria','Gestor']),{ownerId:bob,kind:'checkin',scope:false}),false);
 assert.equal(evaluateIndividual(base(['Diretoria','Gestor']),{ownerId:bob,kind:'checkin',scope:true}),true);
});
test('HU-09.C01 e C07: 404 indistinguivel sem revelar existencia, auditoria de negativas',async()=>{
 let events=[];const audit={record(e){events.push(e);}};
 const repo={async scopeFor(){return {scope:false,designation:false};},async userExists(){throw Error('nao consultar recurso antes da permissao');}};
 const middleware=authorizeIndividual(repo,audit);
 for(const id of [bob,'bad-id']){
  const response=res();await middleware({identity:base(['Colaborador']),params:{userId:id}},response,()=>{throw Error('nao pode');});
  assert.equal(response.code,404);assert.deepEqual(response.body,{mensagem:'recurso não encontrado'});
 }
 assert.equal(events.length,2);assert.ok(events.every(x=>x.acao==='negativa'&&x.resultado==='negado'));
});
test('HU-09.C06 consulta autorizada gera evento com ator/perfil/recurso/resultado',async()=>{
 const events=[];const audit={record(e){events.push(e);}};
 const repo={async scopeFor(){return {scope:true,designation:false};},async userExists(){return true;}};
 const middleware=authorizeIndividual(repo,audit);
 const req={identity:base(['Gestor']),params:{userId:bob}};let permitted=false;
 await middleware(req,res(),()=>{permitted=true;});assert.equal(permitted,true);
 req.auditAction();assert.deepEqual(Object.keys(events[0]).sort(),['acao','alvoId','atorId','correlacaoId','perfis','recurso','resultado']);
 assert.equal(events[0].resultado,'permitido');
});
test('HU-09.C08 registro assincrono sem bloquear resposta, flush aguarda',async()=>{
 let release, called=0;
 const repo={async insert(){called++;await new Promise(r=>release=r);}};
 const audit=new AuditService(repo);
 assert.equal(audit.record({atorId:alice,perfis:['RH'],recurso:'checkin',acao:'consulta',resultado:'permitido'}),true);
 await new Promise(r=>setImmediate(r));assert.equal(called,1);
 const flushed=audit.flush();release();await flushed;
});
test('HU-09.C09 somente Administracao pode consultar auditoria no endpoint',()=>{
 const middleware=authorizeLogs({record(){}});
 const response=res();middleware({identity:base(['RH'])},response,()=>{throw Error('Nao');});
 assert.equal(response.code,404);
 let allowed=false;middleware({identity:base(['Administracao'])},res(),()=>allowed=true);assert.equal(allowed,true);
});
test('HU-09.C10 consulta de log usa somente SELECT e paginacao',async()=>{
 let sql,params;
 const repo=new PgAuditRepository({async query(s,p){sql=s;params=p;return {rows:[]};}});
 await repo.list({limit:20,beforeId:'123'});
 assert.match(sql,/SELECT id,ocorrido_em/);assert.match(sql,/interval '6 months'/);assert.match(sql,/id<\$1/);assert.deepEqual(params,['123',20]);
});
test('HU-09.C12 consulta SQL exige gestor vigente e designacao temporal exata',async()=>{
 let sql,params;
 const repo=new PgAuthorizationRepository({async query(s,p){sql=s;params=p;return {rows:[{escopo:false,designacao:false}]};}});
 await repo.scopeFor(alice,bob,{kind:'meta',resourceId:'123e4567-e89b-12d3-a456-426614174002'});
 assert.match(sql,/a.perfil='Gestor'/);assert.match(sql,/d.fim_em>now\(\)/);assert.match(sql,/d.recurso_id=\$4/);assert.equal(params[2],'meta');
});
