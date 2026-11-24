const test=require('node:test');
const assert=require('node:assert/strict');
const {SessionService,hashToken,parseCookie,COOKIE_NAME,cookieOptions}=require('../src/services/SessionService');
const {PgSessionRepository}=require('../src/repositories/PgSessionRepository');
const {requireSession}=require('../src/middleware/requireSession');
const ID='123e4567-e89b-12d3-a456-426614174000';
test('token aleatorio de 256 bits nao persiste em texto claro',async()=>{
 let persisted;
 const repo={async create(id,hash,ms){persisted={id,hash,ms};return true;}};
 const svc=new SessionService(repo);
 const token=await svc.create(ID);
 assert.equal(token.length,43);
 assert.equal(persisted.id,ID);
 assert.equal(persisted.hash,hashToken(token));
 assert.equal(persisted.hash.length,64);
 assert.notEqual(persisted.hash,token);
});
test('cookie HttpOnly e Secure e SameSite',()=>{
 assert.deepEqual(cookieOptions(),{httpOnly:true,secure:true,sameSite:'lax',path:'/'});
 assert.equal(COOKIE_NAME,'__Host-benigno_session');
 assert.equal(parseCookie('a=x; __Host-benigno_session=abc; b=y',COOKIE_NAME),'abc');
});
test('token ausente ou malformado rejeitado antes de consultar banco',async()=>{
 const svc=new SessionService({findAndTouch(){throw new Error('nao chamar');}});
 assert.equal(await svc.validate('invalid'),null);
 assert.equal(await svc.validate(null),null);
});
test('sessao valida retorna identidade e perfis atuais',async()=>{
 let arg;
 const identity={id:ID,login:'kamilly@exemplo.com',perfis:['Gestor']};
 const svc=new SessionService({async findAndTouch(...args){arg=args;return identity;}});
 const token='A'.repeat(43);
 assert.deepEqual(await svc.validate(token),identity);
 assert.deepEqual(arg,[hashToken(token),30*60_000]);
});
test('revoga token pelo hash',async()=>{
 let hashed;
 const svc=new SessionService({async revoke(x){hashed=x;}});
 const token='A'.repeat(43);
 await svc.revoke(token);
 assert.equal(hashed,hashToken(token));
});
test('SQL de validacao exige ativo, versão vigente, sessao nao revogada e prazos',async()=>{
 let sql;
 const repository=new PgSessionRepository({async query(query,params){sql=query;return {rows:[]};}});
 assert.equal(await repository.findAndTouch('abc',10000),null);
 for(const part of ['u.ativo=TRUE','s.auth_version=u.auth_version','s.revogada_em IS NULL','s.expira_em > now()','s.ultima_atividade > now()','p.inicio_em<=now()']) assert.ok(sql.includes(part),part);
});
test('middleware nega sessão inválida e devolve 401',async()=>{
 const mid=requireSession({async validate(){return null;}},false);
 const res={statusCode:0,headers:{},clearCookie(name){this.cleared=name;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
 await mid({headers:{cookie:''}},res,()=>{throw Error('nao chamar');});
 assert.equal(res.statusCode,401);
 assert.deepEqual(res.body,{mensagem:'Sessão ausente ou expirada.'});
});
test('middleware passa identidade para proxima etapa',async()=>{
 const identity={id:ID,perfis:['RH']};
 const mid=requireSession({async validate(){return identity;}},false);
 const req={headers:{cookie:''}};
 let called=false;
 await mid(req,{},()=>{called=true;});
 assert.equal(called,true);
 assert.deepEqual(req.identity,identity);
});
