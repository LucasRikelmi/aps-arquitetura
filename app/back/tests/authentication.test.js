const test = require('node:test');
const assert = require('node:assert/strict');
const { AuthenticationService } = require('../src/services/AuthenticationService');
const { PgUserRepository } = require('../src/repositories/PgUserRepository');
const { validBody, createAuthController } = require('../src/controllers/AuthController');
const { isDatabaseUnavailable } = require('../src/utils/errors');

const account = { id: '123e4567-e89b-12d3-a456-426614174000', email: 'kamilly@exemplo.com', nome: 'Kamilly', senha_hash: 'hash-real' };
function build(user) {
  const calls = [];
  const repository = { async findByEmail(email) { calls.push(['query',email]); return user; } };
  const hasher = { async verify(hash, senha) { calls.push(['verify',hash,senha]); return hash === 'hash-real' && senha === 'correta'; } };
  return { service: new AuthenticationService(repository, hasher, 'hash-ficticio'), calls };
}

test('sucesso: retorna apenas id, email e nome', async () => {
  const { service } = build(account);
  assert.deepEqual(await service.authenticate('  KAMILLY@EXEMPLO.COM  ', 'correta'), { id: account.id, email: account.email, nome: account.nome });
});
test('senha incorreta: retorna null, mas executa verify', async () => {
  const { service, calls } = build(account);
  assert.equal(await service.authenticate('kamilly@exemplo.com', 'errada'), null);
  assert.deepEqual(calls[1], ['verify', 'hash-real', 'errada']);
});
test('usuário inexistente: retorna null e executa verify com hash fictício', async () => {
  const { service, calls } = build(null);
  assert.equal(await service.authenticate('inexistente', 'errada'), null);
  assert.deepEqual(calls[1], ['verify', 'hash-ficticio', 'errada']);
});
test('SQL usa placeholder $1 e valores separados', async () => {
  let recorded;
  const repository = new PgUserRepository({ async query(sql, params) { recorded = { sql, params }; return { rows: [] }; } });
  const malicious = "' OR 1=1 --";
  assert.equal(await repository.findByEmail(malicious), null);
  assert.match(recorded.sql, /login.*\$1/i);
  assert.deepEqual(recorded.params, [malicious.toLowerCase()]);
  assert.equal(recorded.sql.includes(malicious), false);
});
test('valida entrada antes de procurar usuário', () => {
  assert.equal(validBody({ email:'  ', senha: 'x' }), false);
  assert.equal(validBody({ email:'x@x.com', senha:'' }), false);
  assert.equal(validBody({ email:1, senha:'x' }), false);
  assert.equal(validBody({ email:'x'.repeat(255), senha:'x' }), false);
  assert.equal(validBody({ email:'x@x.com', senha:'x'.repeat(129) }), false);
  assert.equal(validBody({ email:'x@x.com', senha:'x' }), true);
});
function fakeRes() {
  return { code: null, body: null, status(n) { this.code = n; return this; }, json(b) { this.body = b; return this; } };
}
test('controller: falhas possuem mesmo corpo 401', async () => {
  const outputs = [];
  for (const u of [account, null]) {
    const { service } = build(u);
    const res = fakeRes();
    await createAuthController(service)({ body: { email: 'test@example.com', senha: 'errada' } }, res, (e) => { throw e; });
    outputs.push({ status: res.code, body: res.body });
  }
  assert.deepEqual(outputs[0], outputs[1]);
  assert.deepEqual(outputs[0], { status: 401, body: { mensagem:'E-mail ou senha incorretos.' } });
});
test('controller: entrada inválida retorna 400 sem chamar service', async () => {
  const res=fakeRes();
  await createAuthController({ authenticate() { throw Error('não pode chamar'); } })({ body: {} },res,()=>{});
  assert.deepEqual({status:res.code,body:res.body},{status:400,body:{mensagem:'Requisição inválida.'}});
});
test('diferencia indisponibilidade do banco de erros comuns', () => {
  assert.equal(isDatabaseUnavailable({ code:'ECONNREFUSED' }), true);
  assert.equal(isDatabaseUnavailable({ code:'57P03' }), true);
  assert.equal(isDatabaseUnavailable({ code:'23505' }), false);
});
