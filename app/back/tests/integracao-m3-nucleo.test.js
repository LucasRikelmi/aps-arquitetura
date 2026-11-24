const test=require('node:test');
const assert=require('node:assert/strict');
const {PerfilService}={PerfilService:require('../src/services/PerfilService')};
const {AuthenticationService}=require('../src/services/AuthenticationService');
const {PgUserRepository}=require('../src/repositories/PgUserRepository');
const {createCsrfProtection}=require('../src/middleware/csrf');
const {PgLoginRateLimiter}=require('../src/repositories/PgLoginRateLimiter');
test('ordem de perfis conforme front',()=>{
 assert.equal(PerfilService.perfilMaisAlto(['RH','Diretoria']),'rh');
 assert.equal(PerfilService.perfilMaisAlto(['Gestor','Colaborador']),'gestor');
});
test('auth argon verifica em falha com hash ficticio',async()=>{
 let verified;
 const auth=new AuthenticationService({findByEmail:async()=>null},{verify:async(hash,senha)=>{verified=[hash,senha];return false;}},'dummy');
 assert.equal(await auth.authenticate('nao@exemplo.com','senha'),null);
 assert.deepEqual(verified,['dummy','senha']);
});
test('repo usa usuario.login como email e cadastro_pessoa.nome',async()=>{
 let args;
 const repo=new PgUserRepository({query:async(sql,params)=>{args=[sql,params];return {rows:[{nome:'Marina',email:params[0]}]};}});
 const r=await repo.findByEmail('  MARINA@EXEMPLO.COM  ');
 assert.equal(r.nome,'Marina');assert.equal(r.email,'marina@exemplo.com');
 assert.match(args[0],/cadastro_pessoa/);assert.deepEqual(args[1],['marina@exemplo.com']);
});
test('CSRF header e origem',()=>{
 const m=createCsrfProtection({publicOrigin:'https://app.exemplo.com'});
 const fake=(headers)=>{let code,body,called=false;
 const req={path:'/api/checkins/atual',method:'PUT',get:k=>headers[k.toLowerCase()]};
 const res={status:n=>(code=n,res),json:b=>(body=b,res)};
 m(req,res,()=>called=true);return {code,body,called};};
 assert.equal(fake({'x-requested-with':'fetch',origin:'https://app.exemplo.com'}).called,true);
 assert.equal(fake({'x-requested-with':'fetch',origin:'https://malicioso.com'}).code,403);
 assert.equal(fake({origin:'https://app.exemplo.com'}).code,403);
});
test('rate limiter usa HMAC da origem, sem armazenar IP em claro',async()=>{
 let vals;
 const r=new PgLoginRateLimiter({query:async(_,v)=>{vals=v;return {rows:[{allowed:true}]};}},{secret:'123456789012345678901234567890123456789',maxAttempts:5});
 assert.equal(await r.check('127.0.0.1'),true);
 assert.equal(vals[0].length,64);assert.equal(vals[0].includes('127.0.0.1'),false);
});
