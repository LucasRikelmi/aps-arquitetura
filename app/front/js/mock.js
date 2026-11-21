// Servidor fictício em memória. Dados e nomes fictícios (como no protótipo do Figma).
// Espelha o contrato esperado da API v2.0; a conferência contra o contrato real é do item 3.10.
import { ApiError } from './errors.js';

const espera = (ms = 120) => new Promise(r => setTimeout(r, ms));
const clone = o => JSON.parse(JSON.stringify(o));

const USUARIOS = {
  'ana.souza@empresa.com.br': { id: 1, nome: 'Ana Souza', perfil: 'colaborador' },
  'carlos.lima@empresa.com.br': { id: 2, nome: 'Carlos Lima', perfil: 'gestor' },
  'paula.reis@empresa.com.br': { id: 3, nome: 'Paula Reis', perfil: 'rh' },
  'helena.prado@empresa.com.br': { id: 4, nome: 'Helena Prado', perfil: 'diretoria' },
  'admin@empresa.com.br': { id: 5, nome: 'Roberto Alves', perfil: 'administracao' }
};
const SENHA_DEMO = 'senha123';

const estado = {
  sessao: null,
  janelaAberta: !/mock=encerrada/.test(location.search),
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
  log: [
    { quando: '2026-11-21 07:58', usuario: 'Ana Souza', recurso: 'Check-in da semana', resultado: 'permitido' },
    { quando: '2026-11-21 07:41', usuario: 'Ana Souza', recurso: 'Painel da equipe (recurso de terceiro)', resultado: 'negado (404)' },
    { quando: '2026-11-20 17:12', usuario: 'Carlos Lima', recurso: 'Painel da equipe', resultado: 'permitido' }
  ],
  params: { janelaDia: 'sexta', janelaHora: '18:00', lembreteQui: '10:00', lembreteSex: '15:00', humorBaixo: 2, cargaPesada: 3 },
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

const exigir = (...perfis) => {
  if (!estado.sessao) throw new ApiError(401, 'Sessão ausente ou expirada.');
  if (!perfis.includes(estado.sessao.perfil)) throw new ApiError(404, 'Recurso inexistente.');
};

export const mock = {
  credencialDemo() { return { email: 'ana.souza@empresa.com.br', senha: SENHA_DEMO }; }, // só existe no mock
  async login(email, senha) {
    await espera(250);
    const u = USUARIOS[String(email).trim().toLowerCase()];
    // Resposta única para usuário inexistente e senha incorreta (RF03; item 3.1a).
    if (!u || senha !== SENHA_DEMO) throw new ApiError(401, 'E-mail ou senha incorretos.');
    estado.sessao = { ...u };
    return clone(u);
  },
  async entrarComo(perfil) { // atalho do protótipo, inexistente no sistema real (RF09)
    const u = Object.values(USUARIOS).find(x => x.perfil === perfil);
    estado.sessao = { ...u };
    return clone(u);
  },
  async sessao() { await espera(40); return estado.sessao ? clone(estado.sessao) : null; },
  async logout() { await espera(40); estado.sessao = null; },

  async checkinAtual() {
    await espera(); exigir('colaborador');
    return { semana: 46, periodo: '9 a 13 de novembro de 2026', limite: 'sexta-feira, 13/11, às 18:00 (horário de Brasília)',
      aberta: estado.janelaAberta, enviado: clone(estado.checkinEnviado),
      metas: clone(estado.metas.filter(m => m.responsavel === estado.sessao.nome)) };
  },
  async enviarCheckin(dados) {
    await espera(250); exigir('colaborador');
    if (!estado.janelaAberta) throw new ApiError(409, 'A janela do check-in está encerrada.');
    if (!dados.humor || !dados.carga) throw new ApiError(422, 'Campos obrigatórios ausentes.');
    estado.checkinEnviado = clone(dados);
    return { ok: true };
  },
  async historicoPessoal() { await espera(); exigir('colaborador'); return clone(estado.historico); },

  async painel() {
    await espera(); exigir('gestor', 'rh');
    return { semana: 46, equipe: [
      { nome: 'Ana Souza', humor: 4, carga: 'Normal', progresso: 60, alertas: 0 },
      { nome: 'Bruno Matos', humor: 2, carga: 'Pesada', progresso: 30, alertas: 1 },
      { nome: 'Lívia Cardoso', humor: 3, carga: 'Pesada', progresso: 45, alertas: 1 },
      { nome: 'Davi Nunes', humor: null, carga: null, progresso: 20, alertas: 1 }
    ] };
  },
  async alertas() { await espera(); exigir('gestor', 'rh'); return clone(estado.alertas); },
  async tratarAlerta(id, { acao, nota }) {
    await espera(200); exigir('gestor');
    const a = estado.alertas.find(x => x.id === id);
    if (!a) throw new ApiError(404, 'Recurso inexistente.');
    a.status = 'tratado'; a.acao = { acao, nota };
    return clone(a);
  },
  async metas() { await espera(); exigir('gestor'); return clone(estado.metas); },
  async criarMeta(m) {
    await espera(200); exigir('gestor');
    estado.metas.push({ id: estado.metas.length + 1, progresso: 0, ...m });
    return { ok: true };
  },
  async progressoPendente() { await espera(); exigir('gestor'); return clone(estado.progresso); },
  async validarProgresso(id, { decisao, valor }) {
    await espera(200); exigir('gestor');
    const p = estado.progresso.find(x => x.id === id);
    if (!p) throw new ApiError(404, 'Recurso inexistente.');
    p.validado = true; p.origem = decisao === 'ajustar' ? 'ajustado pelo gestor' : 'validado pelo gestor';
    if (decisao === 'ajustar') p.valor = Number(valor);
    return clone(p);
  },

  async pessoas() { await espera(); exigir('rh', 'administracao'); return clone(estado.pessoas); },
  async criarPessoa(p) {
    await espera(200); exigir('rh', 'administracao');
    if (estado.pessoas.some(x => x.email.toLowerCase() === p.email.toLowerCase())) throw new ApiError(409, 'E-mail já cadastrado.');
    estado.pessoas.push({ id: 100 + estado.pessoas.length, ativo: true, ...p });
    return { ok: true };
  },
  async desligarPessoa(id) {
    await espera(200); exigir('rh', 'administracao');
    const p = estado.pessoas.find(x => x.id === id);
    if (!p) throw new ApiError(404, 'Recurso inexistente.');
    p.ativo = false; // no servidor real: revogação imediata da sessão (DA09)
    return clone(p);
  },
  async formulario() { await espera(); exigir('rh'); return clone(estado.formulario); },
  async salvarFormulario(f) { await espera(200); exigir('rh'); estado.formulario = clone(f); return { ok: true }; },
  async parametros() { await espera(); exigir('rh'); return clone(estado.params); },
  async salvarParametros(p) { await espera(200); exigir('rh'); estado.params = clone(p); return { ok: true }; },
  async relatorios() {
    await espera(); exigir('rh', 'gestor', 'diretoria');
    const linhas = [
      { departamento: 'Atendimento', pessoas: 12, humor: 3.6, cargaPesada: 25, progresso: 48 },
      { departamento: 'Financeiro', pessoas: 8, humor: 4.1, cargaPesada: 12, progresso: 61 },
      { departamento: 'Tecnologia', pessoas: 15, humor: 3.3, cargaPesada: 40, progresso: 44 }
    ];
    return estado.sessao.perfil === 'gestor' ? linhas.slice(0, 1) : linhas;
  },
  async perfis() { await espera(); exigir('administracao'); return clone(estado.pessoas); },
  async alterarPerfil(id, perfil) {
    await espera(200); exigir('administracao');
    const p = estado.pessoas.find(x => x.id === id);
    if (!p) throw new ApiError(404, 'Recurso inexistente.');
    p.perfil = perfil; // no servidor real: invalida a sessão da pessoa (DA09)
    return clone(p);
  },
  async log() { await espera(); exigir('administracao'); return clone(estado.log); }
};
