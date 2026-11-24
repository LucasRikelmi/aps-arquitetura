const test = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler, isDatabaseUnavailable } = require('../src/utils/errors');
const { AuthenticationService } = require('../src/services/AuthenticationService');
const { createAuthController } = require('../src/controllers/AuthController');

function res() {
  return { code:null, body:null, headersSent:false,
    status(n) {this.code=n; return this;},
    json(value) {this.body=value; return this;}
  };
}
async function handle(error) {
  const response=res();
  const old=console.error;
  console.error=()=>{};
  try { errorHandler(error,{},{...response,status:response.status,json:response.json},()=>{}); }
  finally { console.error=old; }
  return response;
}
function handled(error) {
  const response=res();
  const old=console.error;
  console.error=()=>{};
  try { errorHandler(error, {}, response, ()=>{}); }
  finally { console.error=old; }
  return {status:response.code, body:response.body};
}

test('RFD03: PostgreSQL inacessível resulta em 503, jamais 401', () => {
  assert.deepEqual(handled(Object.assign(new Error('rejected'),{code:'ECONNREFUSED'})),
    {status:503,body:{mensagem:'Serviço indisponível.'}});
});
test('RFD03: timeout resulta em 503 sem erro interno no corpo', () => {
  assert.deepEqual(handled(Object.assign(new Error('connection timeout'),{code:'ETIMEDOUT'})),
    {status:503,body:{mensagem:'Serviço indisponível.'}});
});
test('RFD03: falha inesperada resulta em 500, jamais 401', () => {
  assert.deepEqual(handled(new Error('falha inesperada')),
    {status:500,body:{mensagem:'Erro interno.'}});
});
test('erro de sintaxe JSON retorna 400', () => {
  const e=Object.assign(new Error('malformed'),{type:'entity.parse.failed',status:400});
  assert.deepEqual(handled(e),{status:400,body:{mensagem:'Requisição inválida.'}});
});
test('serviço não mascara falha do banco como usuário não encontrado', async () => {
  const failure=Object.assign(new Error('db down'),{code:'ECONNREFUSED'});
  const service = new AuthenticationService({async findByEmail(){throw failure;}}, {async verify(){throw Error('não deveria chamar');}}, 'hash-ficticio');
  await assert.rejects(service.authenticate('maria@exemplo.com.br','senha'), e=>e===failure);
});
test('controller encaminha falhas de repositório para o middleware 5xx',async()=>{
  const failure=Object.assign(new Error('db down'),{code:'ECONNREFUSED'});
  let forwarded;
  const response=res();
  await createAuthController({async authenticate(){throw failure;}})({body:{email:'maria@exemplo.com.br',senha:'senha'}},response,e=>{forwarded=e;});
  assert.equal(forwarded,failure);
  assert.equal(response.code,null);
  assert.equal(isDatabaseUnavailable(forwarded),true);
});
