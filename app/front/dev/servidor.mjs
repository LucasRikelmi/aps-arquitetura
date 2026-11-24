#!/usr/bin/env node
// Servidor de DESENVOLVIMENTO. Não é o back-end e não vai para produção (build.mjs o exclui).
// Serve os estáticos do front e uma API fictícia na mesma origem, como o Nginx fará (DA13),
// com sessão por cookie HttpOnly e rejeição de escrita sem o cabeçalho X-Requested-With.
// Serve de contrato executável das rotas de js/api.js até o M3 publicar o contrato v2.0 (item 3.10).
//
//   node dev/servidor.mjs                    -> http://127.0.0.1:8080
//   PORTA=9000 JANELA=encerrada node dev/servidor.mjs
//   LIMITE_LOGIN=3 BLOQUEIO_S=60 node dev/servidor.mjs   (simulação do 429 no login, ver abaixo)
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
// Simulação de limitação de tentativas de login (429 + Retry-After). Chave = endereço de origem,
// não a conta: o plano (3.3) não adota bloqueio por conta (P04). Valores reais dependem do contrato 3.10.
const LIMITE_LOGIN = Number(process.env.LIMITE_LOGIN || 5);
const BLOQUEIO_S = Number(process.env.BLOQUEIO_S || 900);
const FALHAS_LOGIN = new Map(); // origem -> { n, ate }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const BLOQUEADOS = ['dev', 'testes', 'docs', '.git', 'node_modules', 'build.mjs', 'README.md'];

// ---------------- dados fictícios ----------------
const PRIORIDADE = ['administracao', 'rh', 'diretoria', 'gestor', 'colaborador'];
const maisAlto = perfis => PRIORIDADE.find(p => perfis.includes(p)) || 'colaborador';
const pessoa = (id, nome, email, cargo, departamento, gestor, perfis, extra = {}) =>
  ({ id, nome, email, cargo, departamento, gestor, perfis, ativo: true, matricula: String(4800 + id), admissao: '2024-03-01', contrato: 'CLT', ...extra });
const PESSOAS = [
  pessoa(1, 'Ana Souza', 'ana.souza@empresa.com.br', 'Analista de operações', 'Operações', 'Rafael Torres', ['colaborador']),
  pessoa(6, 'Bruno Lima', 'bruno.lima@empresa.com.br', 'Analista de operações', 'Operações', 'Rafael Torres', ['colaborador']),
  pessoa(7, 'Diego Rocha', 'diego.rocha@empresa.com.br', 'Assistente', 'Operações', 'Rafael Torres', ['colaborador']),
  pessoa(2, 'Rafael Torres', 'rafael.torres@empresa.com.br', 'Coordenador', 'Operações', 'Luíza Campos', ['colaborador', 'gestor'], { desde: { gestor: '2025-03-01' } }),
  pessoa(3, 'Marina Costa', 'marina.costa@empresa.com.br', 'Analista de RH', 'Pessoas', 'Helena Martins', ['colaborador', 'rh'], { desde: { rh: '2023-06-12' } }),
  pessoa(4, 'Helena Martins', 'helena.martins@empresa.com.br', 'Diretora', 'Diretoria', null, ['colaborador', 'diretoria'], { desde: { diretoria: '2024-01-10' } }),
  pessoa(5, 'Sérgio Dias', 'sergio.dias@empresa.com.br', 'Administrador', 'TI', 'Helena Martins', ['colaborador', 'administracao'], { desde: { administracao: '2022-02-01' } }),
  pessoa(8, 'Paulo Viana', 'paulo.viana@empresa.com.br', 'Assistente', 'Comercial', 'Luíza Campos', ['colaborador'], { ativo: false, desligadoEm: '30/10' })
];
const janelaAberta = process.env.JANELA !== 'encerrada';
const E = {
  checkinEnviado: null,
  pessoas: PESSOAS,
  alertas: [
    { id: 1, pessoa: 'Bruno Lima', titulo: 'humor baixo com meta atrasada', codigo: 'AL-0142', criado: '09/11/2026, 10:42', semana: 46, status: 'aberto', acao: null,
      regra: 'humor menor ou igual a 2 e meta atrasada na mesma semana.', humor: '2 · Mal (semana 46)', meta: 'Concluir migração dos contratos · prazo 06/11/2026', progresso: '35% · informado pelo colaborador', carga: 'Pesada em 4 das últimas 8 semanas' },
    { id: 2, pessoa: 'Diego Rocha', titulo: 'sem resposta há 3 semanas', codigo: 'AL-0143', criado: '09/11/2026, 10:42', semana: 46, status: 'aberto', acao: null,
      regra: 'sem check-in por 3 semanas consecutivas.', humor: 'sem resposta', meta: 'Documentar 20 processos operacionais · prazo 30/11/2026', progresso: '20% · informado pelo colaborador', carga: 'sem resposta' }
  ],
  metas: [
    { id: 1, titulo: 'Concluir migração dos contratos', responsavel: 'Bruno Lima', inicio: '2026-09-01', prazo: '2026-11-06', indicador: 'Contratos migrados / total', unidade: '%', valorAlvo: 100, progresso: 35, origem: 'informado pelo colaborador', situacao: 'Em andamento · prazo vencido', validavel: true },
    { id: 2, titulo: 'Reduzir tempo de resposta a chamados para 4 h', responsavel: 'Ana Souza', inicio: '2026-10-01', prazo: '2026-12-15', indicador: 'Tempo médio em horas', unidade: 'horas', valorAlvo: 4, progresso: 60, origem: 'validado pelo gestor', situacao: 'Em andamento', validavel: false },
    { id: 3, titulo: 'Documentar 20 processos operacionais', responsavel: 'Diego Rocha', inicio: '2026-09-15', prazo: '2026-11-30', indicador: 'Processos publicados', unidade: 'processos', valorAlvo: 20, progresso: 20, origem: 'informado pelo colaborador', situacao: 'Em andamento · em risco', validavel: true }
  ],
  formulario: [
    { id: 1, texto: 'Algo está atrapalhando seu trabalho?', tipo: 'Texto', resposta: 'opcional', ativa: true, respostas: 412 },
    { id: 2, texto: 'Você precisa de apoio do seu gestor?', tipo: 'Opção', resposta: 'opcional', ativa: true, respostas: 388 },
    { id: 3, texto: 'Como foi a comunicação com a equipe?', tipo: 'Texto', resposta: 'opcional', ativa: false, respostas: 1204 }
  ],
  afastamentos: [],
  log: [],
  params: {
    textoVisibilidade: 'Seu gestor direto e o RH veem suas respostas individuais. A Diretoria vê apenas médias por departamento, sem identificar ninguém.',
    abre: 'Segunda, 08:00', fecha: 'Sexta, 18:00', fuso: 'America/Sao_Paulo',
    humorAte: 2, semanasSemResposta: 3, cargaPesadaSemanas: 3, metaRiscoProgresso: 50,
    retencaoLog: '6 meses', retencaoCheckins: '24 meses (anonimização); desligado: 90 dias'
  },
  historico: [
    { semana: 46, periodo: '09/11 a 13/11', humor: 4, carga: 'Normal', progresso: '60% · 30%', comentario: 'Semana tranquila.' },
    { semana: 45, periodo: '02/11 a 06/11', humor: 3, carga: 'Pesada', progresso: '55% · 25%', comentario: 'Muitas demandas fora do planejado.' },
    { semana: 44, periodo: '26/10 a 30/10', humor: null },
    { semana: 43, periodo: '19/10 a 23/10', humor: 2, carga: 'Pesada', progresso: '50% · 20%', comentario: '' },
    { semana: 42, periodo: '12/10 a 16/10', humor: 3, carga: 'Normal', progresso: '45% · 15%', comentario: '' },
    { semana: 41, periodo: '05/10 a 09/10', humor: 4, carga: 'Leve', progresso: '40% · 10%', comentario: 'Fechei a primeira entrega.' }
  ]
};
const SESSOES = new Map(); // token -> usuário (estado no servidor, DA09)
const sessaoDe = u => ({ id: u.id, nome: u.nome, perfil: maisAlto(u.perfis) });

class Erro extends Error { constructor(status, mensagem, cabecalhos = {}) { super(mensagem); this.status = status; this.cabecalhos = cabecalhos; } }
const agora = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace('T', ' ');

const ROT_PERFIL = { colaborador: 'Colaborador', gestor: 'Gestor', rh: 'RH', diretoria: 'Diretoria', administracao: 'Administração' };
function registrar(usuario, recurso, acao, resultado) {
  E.log.unshift({ quando: agora(), ts: Date.now(), ator: usuario?.nome ?? '—', perfil: ROT_PERFIL[usuario?.perfil] ?? '—', recurso, acao, resultado });
}
// Sem sessão: 401. Perfil sem acesso: 404, igual a recurso inexistente, e registrado no log (DA11, RB-07).
function exigir(req, perfis) {
  if (!req.usuario) throw new Erro(401, 'Sessão ausente ou expirada.');
  if (!perfis.includes(req.usuario.perfil)) {
    registrar(req.usuario, req.url.replace(/^\/api/, ''), 'Consulta', 'Negado');
    throw new Erro(404, 'Recurso inexistente.');
  }
}
const achar = (lista, id) => { const x = lista.find(i => i.id === Number(id)); if (!x) throw new Erro(404, 'Recurso inexistente.'); return x; };
const revogar = id => { for (const [t, u] of SESSOES) if (u.id === id) SESSOES.delete(t); };

const equipe = () => E.pessoas.filter(p => p.ativo && p.gestor === 'Rafael Torres');
const painel = (perfil, escopo) => {
  const lista = [
    { id: 1, departamento: 'Operações', nome: 'Ana Souza', humor: [2, null, 3, 4], carga: 'Normal', cargaRecorrente: '2 de 8 sem.', progresso: 45, origem: 'Validado pelo gestor', alerta: null },
    { id: 6, departamento: 'Operações', nome: 'Bruno Lima', humor: [3, 2, 2, 2], carga: 'Pesada', cargaRecorrente: '4 de 8 sem.', progresso: 35, origem: 'Informado pelo colaborador', alerta: 'Humor baixo e meta atrasada', alertaId: 1 },
    { id: 9, departamento: 'Operações', nome: 'Carla Mendes', humor: [4, 4, 5, 4], carga: 'Normal', cargaRecorrente: '0 de 8 sem.', progresso: 80, origem: 'Validado pelo gestor', alerta: null },
    { id: 7, departamento: 'Operações', nome: 'Diego Rocha', humor: [null, null, null, null], carga: 'Sem resposta', cargaRecorrente: null, progresso: 20, origem: 'Informado pelo colaborador', alerta: 'Sem resposta há 3 semanas', alertaId: 2 },
    { id: 10, departamento: 'Operações', nome: 'Elisa Prado', humor: [3, 3, 4, 3], carga: 'Pesada', cargaRecorrente: '3 de 8 sem.', progresso: 60, origem: 'Informado pelo colaborador', alerta: null },
    { id: 11, departamento: 'Comercial', nome: 'Fábio Nunes', humor: [4, 3, 4, null], carga: 'Sem resposta', cargaRecorrente: '1 de 8 sem.', progresso: 70, origem: 'Validado pelo gestor', alerta: null }
  ];
  const filtrada = perfil === 'rh' && escopo && escopo !== 'Todos os departamentos' ? lista.filter(p => p.departamento === escopo) : perfil === 'rh' ? lista : lista.filter(p => p.departamento === 'Operações');
  return { semana: 46, periodo: '9 a 13/11/2026', janela: 'janela aberta até sexta, 18:00',
    escopos: perfil === 'rh' ? ['Todos os departamentos', 'Operações', 'Comercial'] : ['Minha equipe · Operações'],
    respondentes: { responderam: 6, total: 8 }, humorMedio: '3,4', humorAnterior: '3,1', cargaPesada: 3, alertasAbertos: E.alertas.filter(a => a.status === 'aberto').length, equipe: filtrada };
};
const AGREGADOS = [
  { departamento: 'Operações', respondentes: 24, participacao: 88, humor: '3,4', cargaPesada: 31, progresso: 56 },
  { departamento: 'Comercial', respondentes: 18, participacao: 81, humor: '3,6', cargaPesada: 22, progresso: 61 },
  { departamento: 'Comercial · Vendas internas', ocultoPor: 'Menos de 5 respondentes · somado ao Comercial' },
  { departamento: 'Financeiro', respondentes: 11, participacao: 79, humor: '3,7', cargaPesada: 18, progresso: 63 }
];

// ---------------- rotas ----------------
const ROTAS = [
  ['POST', /^\/auth\/login$/, async (req, _m, corpo) => {
    const origem = req.socket.remoteAddress || '?';
    const f = FALHAS_LOGIN.get(origem);
    if (f?.ate) {
      const resta = Math.ceil((f.ate - Date.now()) / 1000);
      if (resta > 0) throw new Erro(429, 'Muitas tentativas.', { 'Retry-After': String(resta) });
      FALHAS_LOGIN.delete(origem);
    }
    const u = E.pessoas.find(p => p.email === String(corpo.email || '').trim().toLowerCase());
    const a = Buffer.from(String(corpo.senha || '')), b = Buffer.from(SENHA_DEV);
    // Resposta única para usuário inexistente, desligado e senha incorreta (RF03; item 3.1a; RB-11).
    if (!u || !u.ativo || a.length !== b.length || !timingSafeEqual(a, b)) {
      const n = (FALHAS_LOGIN.get(origem)?.n || 0) + 1;
      FALHAS_LOGIN.set(origem, { n, ate: n >= LIMITE_LOGIN ? Date.now() + BLOQUEIO_S * 1000 : 0 });
      throw new Erro(401, 'E-mail ou senha incorretos.');
    }
    FALHAS_LOGIN.delete(origem);
    const token = randomBytes(24).toString('hex');
    SESSOES.set(token, sessaoDe(u));
    return { corpo: { nome: u.nome, perfil: maisAlto(u.perfis) }, cookie: `sid=${token}; HttpOnly; SameSite=Strict; Path=/` };
  }],
  ['GET', /^\/auth\/sessao$/, async req => { if (!req.usuario) throw new Erro(401, 'Sem sessão.'); return { nome: req.usuario.nome, perfil: req.usuario.perfil }; }],
  ['POST', /^\/auth\/logout$/, async req => { if (req.token) SESSOES.delete(req.token); return { corpo: { ok: true }, cookie: 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' }; }],

  ['GET', /^\/checkins\/atual$/, async req => {
    exigir(req, ['colaborador']);
    const metas = E.metas.filter(m => m.responsavel === req.usuario.nome);
    return janelaAberta
      ? { semana: 46, periodo: '9 a 13 de novembro de 2026', limite: 'sexta-feira, 13/11, às 18:00 (horário de Brasília)', aberta: true, enviado: E.checkinEnviado,
          metas: (metas.length ? metas : E.metas.slice(0, 2)).map(m => ({ id: m.id, titulo: m.titulo, prazo: m.prazo, progresso: m.progresso })) }
      : { semana: 45, periodo: '2 a 6 de novembro de 2026', aberta: false, limite: 'sexta-feira, 06/11, às 18:00',
          regra: 'O check-in fica aberto de segunda, 08:00, a sexta-feira, 18:00 (horário de Brasília). Depois disso não é possível criar nem editar o registro.' };
  }],
  ['PUT', /^\/checkins\/atual$/, async (req, _m, d) => {
    exigir(req, ['colaborador']);
    if (!janelaAberta) throw new Erro(409, 'A janela do check-in está encerrada.');
    if (!d.humor || !d.carga) throw new Erro(422, 'Campos obrigatórios ausentes.');
    E.checkinEnviado = d; return { ok: true };
  }],
  ['GET', /^\/checkins\/historico$/, async req => { exigir(req, ['colaborador']); return E.historico; }],

  ['GET', /^\/painel$/, async req => { exigir(req, ['gestor', 'rh']); return painel(req.usuario.perfil, req.consulta.get('escopo')); }],
  ['GET', /^\/alertas\/(\d+)$/, async (req, m) => { exigir(req, ['gestor', 'rh']); return achar(E.alertas, m[1]); }],
  ['POST', /^\/alertas\/(\d+)\/tratamento$/, async (req, m, d) => {
    exigir(req, ['gestor']);
    const a = achar(E.alertas, m[1]);
    if (!String(d.descricao || '').trim()) throw new Erro(422, 'Informe o que foi feito.');
    a.status = 'tratado'; a.acao = { tipo: d.tipo, revisao: d.revisao || null, descricao: d.descricao }; return a;
  }],

  ['GET', /^\/equipe$/, async req => { exigir(req, ['gestor']); return equipe().map(p => ({ id: p.id, nome: p.nome })); }],
  ['GET', /^\/metas$/, async req => { exigir(req, ['gestor']); return E.metas; }],
  ['GET', /^\/metas\/(\d+)$/, async (req, m) => { exigir(req, ['gestor']); return achar(E.metas, m[1]); }],
  ['POST', /^\/metas$/, async (req, _m, d) => {
    exigir(req, ['gestor']);
    if (!equipe().some(p => p.nome === d.responsavel)) throw new Erro(422, 'Responsável fora da sua equipe.');
    E.metas.push({ id: E.metas.length + 1, progresso: 0, origem: 'sem progresso informado', situacao: 'Em andamento', validavel: false, ...d }); return { ok: true };
  }],
  ['POST', /^\/metas\/(\d+)\/validacao$/, async (req, m, d) => {
    exigir(req, ['gestor']);
    const meta = achar(E.metas, m[1]);
    const pct = Number(d.percentual);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new Erro(422, 'Percentual inválido.');
    meta.progresso = pct; meta.origem = 'validado pelo gestor'; meta.validavel = false; meta.avaliacao = d.avaliacao || null; meta.comentarioGestor = d.comentario || null;
    return meta;
  }],

  ['GET', /^\/pessoas$/, async req => { exigir(req, ['rh', 'administracao']); return E.pessoas.map(p => ({ ...p, perfil: maisAlto(p.perfis) })); }],
  ['POST', /^\/pessoas$/, async (req, _m, d) => {
    exigir(req, ['rh', 'administracao']);
    if (E.pessoas.some(x => x.email.toLowerCase() === String(d.email).toLowerCase())) throw new Erro(409, 'E-mail já cadastrado.');
    E.pessoas.push(pessoa(100 + E.pessoas.length, d.nome, d.email, d.cargo, d.departamento, d.gestor || null, ['colaborador'], { matricula: d.matricula, admissao: d.admissao, contrato: d.contrato })); return { ok: true };
  }],
  ['POST', /^\/pessoas\/(\d+)\/desligamento$/, async (req, m) => {
    exigir(req, ['rh', 'administracao']);
    const p = achar(E.pessoas, m[1]); p.ativo = false; p.desligadoEm = agora().slice(8, 10) + '/' + agora().slice(5, 7); registrar(req.usuario, `pessoa/u-${p.id}`, 'Desligamento', 'Permitido'); revogar(p.id); return p; // revogação imediata (DA09)
  }],
  ['POST', /^\/afastamentos$/, async (req, _m, d) => { exigir(req, ['rh', 'administracao']); E.afastamentos.push(d); return { ok: true }; }],
  ['PUT', /^\/pessoas\/(\d+)\/perfis$/, async (req, m, d) => {
    exigir(req, ['administracao']);
    const p = achar(E.pessoas, m[1]);
    const pedidos = ['rh', 'administracao'].filter(x => (d.perfis || []).includes(x)); // Gestor e Diretoria vêm da estrutura organizacional
    if (p.perfis.includes('administracao') && !pedidos.includes('administracao') && E.pessoas.filter(x => x.ativo && x.perfis.includes('administracao')).length === 1)
      throw new Erro(422, 'Não é possível remover o último administrador.');
    const fixos = p.perfis.filter(x => x === 'gestor' || x === 'diretoria');
    const hoje = new Date().toISOString().slice(0, 10);
    p.desde = { ...(p.desde || {}) };
    for (const x of pedidos) if (!p.perfis.includes(x)) p.desde[x] = hoje;
    p.perfis = ['colaborador', ...fixos, ...pedidos];
    registrar(req.usuario, `perfil/u-${p.id}`, 'Alteração de perfil', 'Permitido');
    revogar(p.id); return p; // invalidação por mudança de perfil (DA09)
  }],

  ['GET', /^\/formulario-checkin$/, async req => { exigir(req, ['rh']); return E.formulario; }],
  ['POST', /^\/formulario-checkin\/perguntas$/, async (req, _m, d) => {
    exigir(req, ['rh']);
    if (!String(d.texto || '').trim()) throw new Erro(422, 'Informe o texto da pergunta.');
    E.formulario.unshift({ id: Date.now(), texto: d.texto, tipo: d.tipo, resposta: d.resposta, ativa: true, respostas: 0 }); return { ok: true };
  }],
  ['POST', /^\/formulario-checkin\/perguntas\/(\d+)\/inativacao$/, async (req, m) => { exigir(req, ['rh']); achar(E.formulario, m[1]).ativa = false; return { ok: true }; }],
  ['PUT', /^\/formulario-checkin\/perguntas\/(\d+)$/, async (req, m, d) => {
    exigir(req, ['rh']);
    const q = achar(E.formulario, m[1]); q.ativa = false; // alterar o texto cria pergunta nova e inativa a anterior (ERS 1.2)
    E.formulario.unshift({ id: Date.now(), texto: d.texto, tipo: q.tipo, resposta: q.resposta, ativa: true, respostas: 0 }); return { ok: true };
  }],
  ['GET', /^\/parametros$/, async req => { exigir(req, ['rh']); return E.params; }],
  ['PUT', /^\/parametros$/, async (req, _m, d) => {
    exigir(req, ['rh']);
    for (const k of ['humorAte', 'semanasSemResposta', 'cargaPesadaSemanas', 'metaRiscoProgresso']) if (!Number.isInteger(d[k]) || d[k] < 1) throw new Erro(422, 'Valor inválido.');
    E.params = { ...E.params, ...d }; return { ok: true };
  }],
  ['GET', /^\/relatorios\/agregados$/, async req => {
    exigir(req, ['rh', 'gestor', 'diretoria']);
    const visiveis = req.usuario.perfil === 'gestor' ? AGREGADOS.filter(x => x.departamento.startsWith('Operações')) : AGREGADOS;
    const dep = req.consulta.get('departamento');
    const l = dep && dep !== 'Todos' ? visiveis.filter(x => x.departamento === dep || x.departamento.startsWith(`${dep} ·`)) : visiveis;
    const ok = l.filter(x => !x.ocultoPor);
    const m = k => (ok.length ? Math.round(ok.reduce((t, x) => t + Number(String(x[k]).replace(',', '.')), 0) / ok.length * 10) / 10 : 0);
    return { departamentos: ['Todos', ...visiveis.filter(x => !x.ocultoPor).map(x => x.departamento)], periodo: 'Outubro de 2026',
      resumo: { participacao: Math.round(m('participacao')), humor: String(m('humor')).replace('.', ','), cargaPesada: Math.round(m('cargaPesada')), progresso: Math.round(m('progresso')) }, linhas: l };
  }],
  ['GET', /^\/relatorios\/agregados\/exportacao$/, async req => {
    exigir(req, ['rh', 'gestor', 'diretoria']);
    registrar(req.usuario, 'relatorio/out-2026', 'Exportação', 'Permitido');
    const formato = req.consulta.get('formato') === 'pdf' ? 'pdf' : 'xlsx';
    const csv = ['Departamento;Respondentes;Participação (%);Humor médio;Carga pesada (%);Progresso (%)',
      ...AGREGADOS.filter(x => !x.ocultoPor).map(x => [x.departamento, x.respondentes, x.participacao, x.humor, x.cargaPesada, x.progresso].join(';'))].join('\n');
    return { arquivo: { nome: `relatorio-agregado-out-2026.${formato === 'pdf' ? 'csv' : 'csv'}`, tipo: 'text/csv; charset=utf-8', conteudo: csv } }; // o back-end real gera PDF/XLSX (item 3.x)
  }],
  ['GET', /^\/sincronizacao-folha$/, async req => { exigir(req, ['rh', 'administracao']); return { ativa: true, ultima: 'hoje, 03:12' }; }],
  ['GET', /^\/log-acesso$/, async req => {
    exigir(req, ['administracao']);
    const c = req.consulta, dias = Number(c.get('dias') || 7), ator = (c.get('ator') || '').toLowerCase();
    return E.log.filter(l => (!ator || l.ator.toLowerCase().includes(ator)) && (!c.get('acao') || l.acao === c.get('acao')) && (!c.get('resultado') || l.resultado === c.get('resultado')) && l.ts >= Date.now() - dias * 864e5);
  }]
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
  req.consulta = new URL(req.url, 'http://x').searchParams;
  try {
    const rota = ROTAS.map(([m, re, fn]) => (m === req.method ? [re.exec(caminho), fn] : [null])).find(([x]) => x);
    if (!rota) throw new Erro(404, 'Recurso inexistente.');
    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'fetch') throw new Erro(403, 'Requisição não permitida.');
    const corpo = req.method === 'GET' ? {} : await lerCorpo(req);
    const r = await rota[1](req, rota[0], corpo);
    if (r && r.arquivo) { res.writeHead(200, { 'Content-Type': r.arquivo.tipo, 'Content-Disposition': `attachment; filename="${r.arquivo.nome}"`, 'Cache-Control': 'no-store' }); return res.end(r.arquivo.conteudo); }
    if (r && r.cookie) json(res, 200, r.corpo, { 'Set-Cookie': r.cookie }); else json(res, 200, r);
  } catch (e) {
    const status = e instanceof Erro ? e.status : 500;
    if (status === 500) console.error(e);
    json(res, status, { mensagem: status === 500 ? 'Erro interno.' : e.message }, e.cabecalhos || {});
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
  console.log(`Credenciais de desenvolvimento: senha "${SENHA_DEV}" para ${E.pessoas.filter(p => p.ativo).map(p => p.email).join(', ')}`);
});
