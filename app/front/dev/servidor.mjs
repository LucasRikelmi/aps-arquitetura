#!/usr/bin/env node
// Servidor de DESENVOLVIMENTO. Não é o back-end e não vai para produção (build.mjs o exclui).
// Serve os estáticos do front e uma API fictícia na mesma origem, como o Nginx fará (DA13),
// com sessão por cookie HttpOnly e rejeição de escrita sem o cabeçalho X-Requested-With.
// Serve de contrato executável das rotas de js/api.js até o M3 publicar o contrato v2.0 (item 3.10).
//
//   node dev/servidor.mjs                    -> http://127.0.0.1:8080
//   PORTA=9000 JANELA=encerrada node dev/servidor.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep, dirname } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(aqui, '..');
const PORTA = Number(process.env.PORTA || 8080);
const HOST = process.env.HOST || '127.0.0.1';
const SENHA_DEV = 'senha-dev-123';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const BLOQUEADOS = ['dev', 'testes', 'docs', '.git', 'node_modules', 'build.mjs', 'README.md'];

// ---------------- dados fictícios ----------------
const USUARIOS = {
  'ana.souza@empresa.com.br': { id: 1, nome: 'Ana Souza', perfil: 'colaborador' },
  'carlos.lima@empresa.com.br': { id: 2, nome: 'Carlos Lima', perfil: 'gestor' },
  'paula.reis@empresa.com.br': { id: 3, nome: 'Paula Reis', perfil: 'rh' },
  'helena.prado@empresa.com.br': { id: 4, nome: 'Helena Prado', perfil: 'diretoria' },
  'admin@empresa.com.br': { id: 5, nome: 'Roberto Alves', perfil: 'administracao' },
  'bruno.matos@empresa.com.br': { id: 6, nome: 'Bruno Matos', perfil: 'colaborador' }
};
const janelaAberta = process.env.JANELA !== 'encerrada';
const E = {
  checkinEnviado: null,
  alertas: [
    { id: 1, pessoa: 'Bruno Matos', tipo: 'Humor baixo por 2 semanas seguidas', semana: 46, status: 'aberto', acao: null },
    { id: 2, pessoa: 'Lívia Cardoso', tipo: 'Carga de trabalho pesada por 3 semanas', semana: 46, status: 'aberto', acao: null },
    { id: 3, pessoa: 'Davi Nunes', tipo: 'Check-in não enviado', semana: 46, status: 'aberto', acao: null }
  ],
  metas: [
    { id: 1, titulo: 'Reduzir tempo médio de resposta a chamados para 4 h', responsavel: 'Ana Souza', inicio: '2026-09-01', prazo: '2026-12-15', indicador: 'Tempo médio de resposta (h)', progresso: 60 },
    { id: 2, titulo: 'Concluir migração dos contratos para o novo modelo', responsavel: 'Bruno Matos', inicio: '2026-08-10', prazo: '2026-11-30', indicador: 'Contratos migrados (%)', progresso: 30 }
  ],
  progresso: [
    { id: 1, pessoa: 'Ana Souza', meta: 'Reduzir tempo médio de resposta a chamados para 4 h', valor: 60, origem: 'autorrelato', validado: false },
    { id: 2, pessoa: 'Bruno Matos', meta: 'Concluir migração dos contratos para o novo modelo', valor: 30, origem: 'autorrelato', validado: false }
  ],
  pessoas: [
    { id: 1, nome: 'Ana Souza', email: 'ana.souza@empresa.com.br', cargo: 'Analista', departamento: 'Atendimento', gestor: 'Carlos Lima', perfil: 'colaborador', ativo: true },
    { id: 2, nome: 'Carlos Lima', email: 'carlos.lima@empresa.com.br', cargo: 'Coordenador', departamento: 'Atendimento', gestor: 'Helena Prado', perfil: 'gestor', ativo: true },
    { id: 3, nome: 'Paula Reis', email: 'paula.reis@empresa.com.br', cargo: 'Analista de RH', departamento: 'Pessoas', gestor: 'Helena Prado', perfil: 'rh', ativo: true },
    { id: 6, nome: 'Bruno Matos', email: 'bruno.matos@empresa.com.br', cargo: 'Analista', departamento: 'Atendimento', gestor: 'Carlos Lima', perfil: 'colaborador', ativo: true }
  ],
  log: [],
  params: { janelaHora: '18:00', lembreteQui: '10:00', lembreteSex: '15:00', humorBaixo: 2, cargaPesada: 3 },
  formulario: [
    { id: 'humor', texto: 'Como você se sentiu nesta semana?', obrigatoria: true },
    { id: 'carga', texto: 'Como esteve sua carga de trabalho?', obrigatoria: true },
    { id: 'metas', texto: 'Progresso das suas metas', obrigatoria: true },
    { id: 'complementar', texto: 'Algo está atrapalhando seu trabalho?', obrigatoria: false }
  ],
  historico: [
    { semana: 45, humor: 4, carga: 'Normal', progresso: 55 },
    { semana: 44, humor: 3, carga: 'Pesada', progresso: 50 },
    { semana: 43, humor: 4, carga: 'Normal', progresso: 42 },
    { semana: 42, humor: 5, carga: 'Leve', progresso: 35 }
  ]
};
const SESSOES = new Map(); // token -> usuário (estado no servidor, DA09)

class Erro extends Error { constructor(status, mensagem) { super(mensagem); this.status = status; } }
const agora = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16);

function registrar(usuario, recurso, resultado) { E.log.unshift({ quando: agora(), usuario: usuario?.nome ?? '—', recurso, resultado }); }

// Sem sessão: 401. Perfil sem acesso: 404, igual a recurso inexistente, e registrado no log (DA11, RB-07).
function exigir(req, perfis) {
  if (!req.usuario) throw new Erro(401, 'Sessão ausente ou expirada.');
  if (!perfis.includes(req.usuario.perfil)) {
    registrar(req.usuario, `${req.method} ${req.url} (recurso de terceiro)`, 'negado (404)');
    throw new Erro(404, 'Recurso inexistente.');
  }
}
const achar = (lista, id) => { const x = lista.find(i => i.id === Number(id)); if (!x) throw new Erro(404, 'Recurso inexistente.'); return x; };

// ---------------- rotas ----------------
const ROTAS = [
  ['POST', /^\/auth\/login$/, async (req, _m, corpo) => {
    const u = USUARIOS[String(corpo.email || '').trim().toLowerCase()];
    const a = Buffer.from(String(corpo.senha || '')), b = Buffer.from(SENHA_DEV);
    // Resposta única para usuário inexistente e senha incorreta (RF03; item 3.1a).
    const desligada = u && E.pessoas.some(x => x.id === u.id && !x.ativo); // pessoa desligada não entra (RB-11)
    if (!u || desligada || a.length !== b.length || !timingSafeEqual(a, b)) throw new Erro(401, 'E-mail ou senha incorretos.');
    const token = randomBytes(24).toString('hex');
    SESSOES.set(token, { ...u });
    return { corpo: { nome: u.nome, perfil: u.perfil }, cookie: `sid=${token}; HttpOnly; SameSite=Strict; Path=/` };
  }],
  ['GET', /^\/auth\/sessao$/, async req => { if (!req.usuario) throw new Erro(401, 'Sem sessão.'); return { nome: req.usuario.nome, perfil: req.usuario.perfil }; }],
  ['POST', /^\/auth\/logout$/, async req => { if (req.token) SESSOES.delete(req.token); return { corpo: { ok: true }, cookie: 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }; }],

  ['GET', /^\/checkins\/atual$/, async req => {
    exigir(req, ['colaborador']);
    return { semana: 46, periodo: '9 a 13 de novembro de 2026', limite: 'sexta-feira, 13/11, às 18:00 (horário de Brasília)', aberta: janelaAberta,
      enviado: E.checkinEnviado, metas: E.metas.filter(m => m.responsavel === req.usuario.nome) };
  }],
  ['PUT', /^\/checkins\/atual$/, async (req, _m, d) => {
    exigir(req, ['colaborador']);
    if (!janelaAberta) throw new Erro(409, 'A janela do check-in está encerrada.');
    if (!d.humor || !d.carga) throw new Erro(422, 'Campos obrigatórios ausentes.');
    E.checkinEnviado = d; return { ok: true };
  }],
  ['GET', /^\/checkins\/historico$/, async req => { exigir(req, ['colaborador']); return E.historico; }],
  ['GET', /^\/painel$/, async req => {
    exigir(req, ['gestor', 'rh']);
    return { semana: 46, equipe: [
      { nome: 'Ana Souza', humor: 4, carga: 'Normal', progresso: 60, alertas: 0 },
      { nome: 'Bruno Matos', humor: 2, carga: 'Pesada', progresso: 30, alertas: 1 },
      { nome: 'Lívia Cardoso', humor: 3, carga: 'Pesada', progresso: 45, alertas: 1 },
      { nome: 'Davi Nunes', humor: null, carga: null, progresso: 20, alertas: 1 }] };
  }],
  ['GET', /^\/alertas$/, async req => { exigir(req, ['gestor', 'rh']); return E.alertas; }],
  ['POST', /^\/alertas\/(\d+)\/tratamento$/, async (req, m, d) => {
    exigir(req, ['gestor']);
    const a = achar(E.alertas, m[1]); a.status = 'tratado'; a.acao = { acao: d.acao, nota: d.nota }; return a;
  }],
  ['GET', /^\/metas$/, async req => { exigir(req, ['gestor']); return E.metas; }],
  ['POST', /^\/metas$/, async (req, _m, d) => { exigir(req, ['gestor']); E.metas.push({ id: E.metas.length + 1, progresso: 0, ...d }); return { ok: true }; }],
  ['GET', /^\/progresso$/, async req => { exigir(req, ['gestor']); return E.progresso; }],
  ['POST', /^\/progresso\/(\d+)\/validacao$/, async (req, m, d) => {
    exigir(req, ['gestor']);
    const p = achar(E.progresso, m[1]); p.validado = true;
    p.origem = d.decisao === 'ajustar' ? 'ajustado pelo gestor' : 'validado pelo gestor';
    if (d.decisao === 'ajustar') p.valor = Number(d.valor);
    return p;
  }],
  ['GET', /^\/pessoas$/, async req => { exigir(req, ['rh', 'administracao']); return E.pessoas; }],
  ['POST', /^\/pessoas$/, async (req, _m, d) => {
    exigir(req, ['rh', 'administracao']);
    if (E.pessoas.some(x => x.email.toLowerCase() === String(d.email).toLowerCase())) throw new Erro(409, 'E-mail já cadastrado.');
    E.pessoas.push({ id: 100 + E.pessoas.length, ativo: true, ...d }); return { ok: true };
  }],
  ['POST', /^\/pessoas\/(\d+)\/desligamento$/, async (req, m) => {
    exigir(req, ['rh', 'administracao']);
    const p = achar(E.pessoas, m[1]); p.ativo = false;
    for (const [t, u] of SESSOES) if (u.id === p.id) SESSOES.delete(t); // revogação imediata (DA09)
    return p;
  }],
  ['PUT', /^\/pessoas\/(\d+)\/perfil$/, async (req, m, d) => {
    exigir(req, ['administracao']);
    const p = achar(E.pessoas, m[1]); p.perfil = d.perfil;
    for (const [t, u] of SESSOES) if (u.id === p.id) SESSOES.delete(t); // invalidação por mudança de perfil (DA09)
    return p;
  }],
  ['GET', /^\/formulario-checkin$/, async req => { exigir(req, ['rh']); return E.formulario; }],
  ['PUT', /^\/formulario-checkin$/, async (req, _m, d) => { exigir(req, ['rh']); E.formulario = d; return { ok: true }; }],
  ['GET', /^\/parametros$/, async req => { exigir(req, ['rh']); return E.params; }],
  ['PUT', /^\/parametros$/, async (req, _m, d) => { exigir(req, ['rh']); E.params = d; return { ok: true }; }],
  ['GET', /^\/relatorios\/agregados$/, async req => {
    exigir(req, ['rh', 'gestor', 'diretoria']);
    const l = [{ departamento: 'Atendimento', pessoas: 12, humor: 3.6, cargaPesada: 25, progresso: 48 },
      { departamento: 'Financeiro', pessoas: 8, humor: 4.1, cargaPesada: 12, progresso: 61 },
      { departamento: 'Tecnologia', pessoas: 15, humor: 3.3, cargaPesada: 40, progresso: 44 }];
    return req.usuario.perfil === 'gestor' ? l.slice(0, 1) : l;
  }],
  ['GET', /^\/log-acesso$/, async req => { exigir(req, ['administracao']); return E.log; }]
];

// ---------------- HTTP ----------------
function lerCorpo(req) {
  return new Promise((ok, falha) => {
    const partes = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 64 * 1024) { falha(new Erro(413, 'Corpo grande demais.')); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { ok(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {}); } catch { falha(new Erro(400, 'JSON inválido.')); } });
  });
}
const json = (res, status, corpo, extra = {}) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }); res.end(JSON.stringify(corpo)); };

async function api(req, res, caminho) {
  req.token = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
  req.usuario = req.token ? SESSOES.get(req.token) : undefined;
  try {
    const rota = ROTAS.map(([m, re, fn]) => (m === req.method ? [re.exec(caminho), fn] : [null])).find(([x]) => x);
    if (!rota) throw new Erro(404, 'Recurso inexistente.');
    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'fetch') throw new Erro(403, 'Requisição não permitida.');
    const corpo = req.method === 'GET' ? {} : await lerCorpo(req);
    const r = await rota[1](req, rota[0], corpo);
    if (r && r.cookie) json(res, 200, r.corpo, { 'Set-Cookie': r.cookie }); else json(res, 200, r);
  } catch (e) {
    const status = e instanceof Erro ? e.status : 500;
    if (status === 500) console.error(e);
    json(res, status, { mensagem: status === 500 ? 'Erro interno.' : e.message });
  }
}

async function estatico(req, res, caminho) {
  const rel = decodeURIComponent(caminho === '/' ? '/index.html' : caminho);
  const abs = resolve(join(RAIZ, rel));
  const primeiro = abs.slice(RAIZ.length + 1).split(sep)[0];
  if (!abs.startsWith(RAIZ + sep) || BLOQUEADOS.includes(primeiro)) { res.writeHead(404); return res.end('Não encontrado'); }
  try {
    const dados = await readFile(abs);
    res.writeHead(200, { 'Content-Type': MIME[extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(dados);
  } catch { res.writeHead(404); res.end('Não encontrado'); }
}

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname.startsWith('/api/')) return api(req, res, pathname.slice(4));
  return estatico(req, res, pathname);
}).listen(PORTA, HOST, () => {
  console.log(`Servidor de desenvolvimento em http://${HOST}:${PORTA}  (janela do check-in: ${janelaAberta ? 'aberta' : 'encerrada'})`);
  console.log(`Credenciais de desenvolvimento: senha "${SENHA_DEV}" para ${Object.keys(USUARIOS).join(', ')}`);
});
