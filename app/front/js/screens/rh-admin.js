// TL-11 Cadastro organizacional (+ estados "e-mail duplicado" e "desligado"), TL-12 Formulário de check-in,
// TL-13 Parâmetros do sistema, TL-14 Relatórios agregados, TL-15 Perfis de acesso (+ estado "mudança"),
// TL-16 Log de acesso.
import { h, preencher, campo, botao, aviso, tabela, confirmar, anunciar } from '../dom.js';
import { api, ApiError } from '../api.js';

const PERFIS = [['colaborador', 'Colaborador'], ['gestor', 'Gestor'], ['rh', 'RH'], ['diretoria', 'Diretoria'], ['administracao', 'Administração']];
const ROTULO_PERFIL = Object.fromEntries(PERFIS);
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function telaCadastro() {
  let pessoas = await api.pessoas();
  const form = h('form', { novalidate: true, class: 'cartao' });
  const tabelaSlot = h('div');
  const avisoSlot = h('div', { 'aria-live': 'polite' });

  const desenharForm = (v = {}, erros = {}) => {
    const n = Object.keys(erros).length;
    preencher(form, 
      h('h2', null, 'Nova pessoa'),
      n ? aviso('erro', 'Revise os campos', Object.values(erros).join(' ')) : null,
      campo({ rotulo: 'Nome', nome: 'nome', valor: v.nome || '', obrigatorio: true, erro: erros.nome, autocomplete: 'off' }),
      campo({ rotulo: 'E-mail corporativo', nome: 'email', tipo: 'email', valor: v.email || '', obrigatorio: true, erro: erros.email, autocomplete: 'off' }), // estado "e-mail duplicado" vem daqui
      campo({ rotulo: 'Cargo', nome: 'cargo', valor: v.cargo || '', obrigatorio: true, erro: erros.cargo }),
      campo({ rotulo: 'Departamento', nome: 'departamento', valor: v.departamento || '', obrigatorio: true, erro: erros.departamento }),
      campo({ rotulo: 'Gestor', nome: 'gestor', valor: v.gestor || '', opcoes: [{ valor: '', texto: 'Selecione' }, ...pessoas.filter(p => p.ativo && p.perfil === 'gestor').map(p => ({ valor: p.nome, texto: p.nome }))] }),
      campo({ rotulo: 'Perfil', nome: 'perfil', valor: v.perfil || 'colaborador', opcoes: PERFIS.map(([x, t]) => ({ valor: x, texto: t })) }),
      botao('Cadastrar', { tipo: 'submit' }));
    if (n) { const a = form.querySelector('[role=alert]'); a.setAttribute('tabindex', '-1'); a.focus(); }
  };

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const erros = {};
    if (!v.nome?.trim()) erros.nome = 'Informe o nome.';
    if (!EMAIL_OK.test(v.email || '')) erros.email = 'Informe um e-mail válido.';
    if (!v.cargo?.trim()) erros.cargo = 'Informe o cargo.';
    if (!v.departamento?.trim()) erros.departamento = 'Informe o departamento.';
    if (Object.keys(erros).length) { desenharForm(v, erros); return; }
    try {
      await api.criarPessoa(v);
      pessoas = await api.pessoas();
      desenharForm(); desenharTabela();
      avisoSlot.replaceChildren(aviso('ok', 'Pessoa cadastrada', `${v.nome} já pode acessar com o perfil ${ROTULO_PERFIL[v.perfil]}.`));
      anunciar('Pessoa cadastrada.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) desenharForm(v, { email: 'Este e-mail já está cadastrado.' });
      else { desenharForm(v); avisoSlot.replaceChildren(aviso('erro', 'Não foi possível cadastrar', 'Tente novamente.')); }
    }
  });

  async function desligar(p) {
    const ok = await confirmar({ titulo: `Desligar ${p.nome}?`, texto: 'O acesso é encerrado imediatamente, inclusive sessões abertas. Esta ação fica registrada.', rotuloOk: 'Desligar', perigo: true });
    if (!ok) return;
    try {
      await api.desligarPessoa(p.id);
      pessoas = await api.pessoas();
      desenharTabela();
      // estado "TL-11 desligado"
      avisoSlot.replaceChildren(aviso('ok', 'Pessoa desligada', `${p.nome} perdeu o acesso agora.`));
      anunciar(`${p.nome} desligada.`);
    } catch { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível desligar', 'Tente novamente.')); }
  }

  function desenharTabela() {
    tabelaSlot.replaceChildren(tabela({
      legenda: 'Pessoas cadastradas',
      colunas: [
        { rotulo: 'Nome', celula: p => p.nome },
        { rotulo: 'Cargo', celula: p => p.cargo },
        { rotulo: 'Departamento', celula: p => p.departamento },
        { rotulo: 'Gestor', celula: p => p.gestor || '—' },
        { rotulo: 'Perfil', celula: p => ROTULO_PERFIL[p.perfil] },
        { rotulo: 'Situação', celula: p => p.ativo ? 'Ativa' : 'Desligada' },
        { rotulo: 'Ação', celula: p => p.ativo ? botao('Desligar', { variante: 'secundario', 'aria-label': `Desligar ${p.nome}`, onClick: () => desligar(p) }) : '—' }
      ],
      linhas: pessoas
    }));
  }
  desenharForm(); desenharTabela();
  return h('section', null, h('h1', null, 'Cadastro organizacional'), avisoSlot, form, tabelaSlot);
}

export async function telaFormulario() {
  const itens = await api.formulario();
  const avisoSlot = h('div', { 'aria-live': 'polite' });
  const form = h('form', { class: 'cartao' },
    h('p', { class: 'sub' }, 'Perguntas que as pessoas respondem no check-in. As três primeiras são fixas.'),
    h('ol', { class: 'lista-form' }, itens.map((q, i) => h('li', null,
      campo({ rotulo: `Pergunta ${i + 1}`, nome: `q-${q.id}`, valor: q.texto, obrigatorio: q.obrigatoria }),
      i >= 3 ? null : h('p', { class: 'ajuda' }, 'Fixa'))),
    ),
    botao('Salvar formulário', { tipo: 'submit' }));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = new FormData(form);
    const novo = itens.map(q => ({ ...q, texto: (d.get(`q-${q.id}`) || q.texto).trim() }));
    try { await api.salvarFormulario(novo); avisoSlot.replaceChildren(aviso('ok', 'Formulário salvo', 'As mudanças valem a partir do próximo check-in.')); anunciar('Formulário salvo.'); }
    catch { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível salvar', 'Tente novamente.')); }
  });
  return h('section', null, h('h1', null, 'Formulário de check-in'), avisoSlot, form);
}

export async function telaParametros() {
  const p = await api.parametros();
  const avisoSlot = h('div', { 'aria-live': 'polite' });
  const form = h('form', { novalidate: true, class: 'cartao' },
    campo({ rotulo: 'Fechamento da janela (horário)', nome: 'janelaHora', tipo: 'time', valor: p.janelaHora, obrigatorio: true }),
    campo({ rotulo: 'Lembrete de quinta-feira', nome: 'lembreteQui', tipo: 'time', valor: p.lembreteQui, obrigatorio: true }),
    campo({ rotulo: 'Lembrete de sexta-feira', nome: 'lembreteSex', tipo: 'time', valor: p.lembreteSex, obrigatorio: true }),
    campo({ rotulo: 'Semanas seguidas de humor baixo para alertar', nome: 'humorBaixo', tipo: 'number', valor: String(p.humorBaixo), obrigatorio: true }),
    campo({ rotulo: 'Semanas seguidas de carga pesada para alertar', nome: 'cargaPesada', tipo: 'number', valor: String(p.cargaPesada), obrigatorio: true }),
    botao('Salvar parâmetros', { tipo: 'submit' }));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const hum = Number(v.humorBaixo), car = Number(v.cargaPesada);
    if (!(hum >= 1 && hum <= 12) || !(car >= 1 && car <= 12)) {
      avisoSlot.replaceChildren(aviso('erro', 'Valor inválido', 'As semanas seguidas devem ficar entre 1 e 12.'));
      return;
    }
    try { await api.salvarParametros({ ...p, ...v, humorBaixo: hum, cargaPesada: car }); avisoSlot.replaceChildren(aviso('ok', 'Parâmetros salvos')); anunciar('Parâmetros salvos.'); }
    catch { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível salvar', 'Tente novamente.')); }
  });
  return h('section', null, h('h1', null, 'Parâmetros do sistema'), avisoSlot, form);
}

export async function telaRelatorios(ctx) {
  const linhas = await api.relatorios();
  const diretoria = ctx.sessao.perfil === 'diretoria';
  return h('section', null,
    h('h1', null, 'Relatórios agregados'),
    h('p', { class: 'sub' }, diretoria ? 'Médias por departamento, sem identificar pessoas.' : 'Indicadores agregados do seu escopo.'),
    tabela({
      legenda: 'Indicadores por departamento',
      colunas: [
        { rotulo: 'Departamento', celula: l => l.departamento },
        { rotulo: 'Pessoas', celula: l => l.pessoas },
        { rotulo: 'Humor médio (1 a 5)', celula: l => l.humor.toFixed(1).replace('.', ',') },
        { rotulo: 'Carga pesada', celula: l => `${l.cargaPesada}%` },
        { rotulo: 'Progresso médio das metas', celula: l => `${l.progresso}%` }
      ],
      linhas
    }));
}

export async function telaPerfis(ctx) {
  let pessoas = await api.perfis();
  const avisoSlot = h('div', { 'aria-live': 'polite' });
  const corpo = h('div');
  async function mudar(p, novo) {
    if (novo === p.perfil) return;
    const ok = await confirmar({ titulo: `Mudar o perfil de ${p.nome}?`, texto: `De ${ROTULO_PERFIL[p.perfil]} para ${ROTULO_PERFIL[novo]}. A sessão atual da pessoa é encerrada e ela entra de novo com o perfil novo.`, rotuloOk: 'Mudar perfil' });
    if (!ok) { desenhar(); return; }
    try {
      await api.alterarPerfil(p.id, novo);
      pessoas = await api.perfis();
      desenhar();
      // estado "TL-15 mudança"
      avisoSlot.replaceChildren(aviso('ok', 'Perfil alterado', `${p.nome} agora é ${ROTULO_PERFIL[novo]}. Sessão anterior encerrada.`));
      anunciar('Perfil alterado.');
    } catch (e) { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível alterar', e instanceof ApiError && e.status === 404 ? 'Esta pessoa não está disponível.' : 'Tente novamente.')); desenhar(); }
  }
  function desenhar() {
    corpo.replaceChildren(tabela({
      legenda: 'Perfis de acesso',
      colunas: [
        { rotulo: 'Pessoa', celula: p => p.nome },
        { rotulo: 'E-mail', celula: p => p.email },
        { rotulo: 'Perfil atual', celula: p => ROTULO_PERFIL[p.perfil] },
        { rotulo: 'Novo perfil', celula: p => h('select', { 'aria-label': `Novo perfil de ${p.nome}`, onchange: ev => mudar(p, ev.target.value), disabled: !p.ativo || null },
          PERFIS.map(([v, t]) => h('option', { value: v, selected: v === p.perfil || null }, t))) }
      ],
      linhas: pessoas
    }));
  }
  desenhar();
  return h('section', null, h('h1', null, 'Perfis de acesso'), avisoSlot, corpo);
}

export async function telaLog() {
  const linhas = await api.log();
  return h('section', null,
    h('h1', null, 'Log de acesso'),
    h('p', { class: 'sub' }, 'Cada acesso negado a recurso de terceiro aparece como negado (404).'),
    tabela({
      legenda: 'Registro de acessos',
      colunas: [
        { rotulo: 'Quando', celula: l => l.quando },
        { rotulo: 'Quem', celula: l => l.usuario },
        { rotulo: 'Recurso', celula: l => l.recurso },
        { rotulo: 'Resultado', celula: l => (l.resultado.startsWith('negado') ? `✕ ${l.resultado}` : `✓ ${l.resultado}`) }
      ],
      linhas
    }));
}
