const test=require('node:test');
const assert=require('node:assert/strict');
const {createCsrfProtection}=require('../src/middleware/csrf');
const {PgLoginRateLimiter}=require('../src/repositories/PgLoginRateLimiter');
const originPermitida='https://site.test';
const secret='test-secret-with-at-least-32-bytes-0123456';
function request({method='POST',path='/api/metas',header='fetch',origin=originPermitida,site='same-origin'}={}) {
  const headers={'origin':origin,'x-requested-with':header,'sec-fetch-site':site};
  return {method,path,get:key=>headers[key.toLowerCase()]};
}
function response(){return {statusCode:0,body:null,status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;}};}
function run(req){const res=response();let passed=false;createCsrfProtection({publicOrigin:originPermitida})(req,res,()=>passed=true);return {res,passed};}
test('CSRF bloqueia escrita com cabeçalho ausente',()=>{const r=run(request({header:null}));assert.equal(r.res.statusCode,403);assert.equal(r.passed,false);});
test('CSRF permite escrita com X-Requested-With fetch e origem correta',()=>{const r=run(request());assert.equal(r.passed,true);});
test('CSRF bloqueia valor de cabeçalho diferente de fetch',()=>{const r=run(request({header:'XMLHttpRequest'}));assert.equal(r.res.statusCode,403);});
test('CSRF bloqueia origem cruzada mesmo com cabeçalho correto',()=>{const r=run(request({origin:'https://evil.test'}));assert.equal(r.res.statusCode,403);});
test('CSRF bloqueia sec-fetch-site cross-site',()=>{const r=run(request({site:'cross-site'}));assert.equal(r.res.statusCode,403);});
test('CSRF permite GET mesmo sem cabeçalho',()=>{const r=run(request({method:'GET',header:null}));assert.equal(r.passed,true);});
test('CSRF exige cabeçalho no login, mas não cookie ou token anterior',()=>{const r=run(request({path:'/api/auth/login'}));assert.equal(r.passed,true);});
test('limitador por origem usa HMAC e consulta parametrizada',async()=>{
 let call;const pool={async query(sql,values){call={sql,values};return {rows:[{allowed:true}]};}};
 const limiter=new PgLoginRateLimiter(pool,{secret});
 assert.equal(await limiter.check('203.0.113.10'),true);
 assert.equal(call.values[0].length,64);assert.equal(call.values[0].includes('203.0.113.10'),false);
 assert.match(call.sql,/\$1/);assert.equal(call.values[1],60);assert.equal(call.values[2],10);
});
test('limitador retorna decisão 429 possível para qualquer origem',async()=>{
 const limiter=new PgLoginRateLimiter({query:async()=>({rows:[{allowed:false}]})},{secret});
 assert.equal(await limiter.check('198.51.100.22'),false);
});
test('limitador propaga indisponibilidade do banco (RFD03)',async()=>{
 const err=Object.assign(new Error('offline'),{code:'ECONNREFUSED'});
 const limiter=new PgLoginRateLimiter({query:async()=>{throw err;}},{secret});
 await assert.rejects(limiter.check('198.51.100.23'),e=>e===err);
});
test('Retry-After retorna prazo restante ou janela padrao',async()=>{
 const pool={async query(){return {rows:[{seconds:37}]};}};
 const limiter=new PgLoginRateLimiter(pool,{secret});
 assert.equal(await limiter.retryAfter('203.0.113.10'),37);
});
