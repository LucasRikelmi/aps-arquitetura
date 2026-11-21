// TL-06 Painel da equipe, TL-07 Tratar alerta (+ estado "tratado"), TL-08 Metas da equipe,
// TL-09 Cadastrar meta (+ estados "erro" e "salvo"), TL-10 Validar progresso.
import { h, preencher, campo, botao, aviso, tabela, grupoRadio, anunciar } from '../dom.js';
import { api, ApiError } from '../api.js';

const HUMOR_TXT = { 1: 'Muito mal', 2: 'Mal', 3: 'Neutro', 4: 'Bem', 5: 'Muito bem' };
const fmtData = iso => new Date(iso + 'T12:00').toLocaleDateString('pt-BR');

// Largura pela API de estilo (CSSOM), compatível com CSP sem 'unsafe-inline' em style-src.
function preenchimento(valor) {
  const el = h('div', { class: 'barra-preenchimento' });
  el.style.width = `${valor}%`;
  return el;
}

function barra(valor, rotulo) {
  return h('div', { class: 'barra-linha' },
    h('div', { class: 'barra', role: 'progressbar', 'aria-valuenow': valor, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': rotulo },
      preenchimento(valor)),
    h('span', { class: 'barra-texto' }, `${valor}%`));
}

export async function telaPainel() {
  const p = await api.painel();
  const comAlerta = p.equipe.filter(m => m.alertas > 0).length;
  const semCheckin = p.equipe.filter(m => m.humor == null).length;
  return h('section', null,
    h('h1', null, 'Painel da equipe'),
    h('p', { class: 'sub' }, `Semana ${p.semana}`),
    h('ul', { class: 'resumo-cartoes' },
      h('li', { class: 'cartao-mini' }, h('strong', null, p.equipe.length), h('span', null, 'pessoas na equipe')),
      h('li', { class: 'cartao-mini' }, h('strong', null, comAlerta), h('span', null, 'com alerta aberto')),
      h('li', { class: 'cartao-mini' }, h('strong', null, semCheckin), h('span', null, 'sem check-in na semana'))),
    tabela({
      legenda: 'Situação da equipe na semana',
      colunas: [
        { rotulo: 'Pessoa', celula: m => m.nome },
        { rotulo: 'Humor', celula: m => m.humor == null ? 'Sem resposta' : `${m.humor} · ${HUMOR_TXT[m.humor]}${m.humor <= 2 ? ' (atenção)' : ''}` },
        { rotulo: 'Carga', celula: m => m.carga ?? 'Sem resposta' },
        { rotulo: 'Progresso das metas', celula: m => barra(m.progresso, `Progresso de ${m.nome}`) },
        { rotulo: 'Alertas', celula: m => m.alertas ? `${m.alertas} aberto` : 'Nenhum' }
      ],
      linhas: p.equipe
    }),
    h('p', { class: 'ajuda' }, h('a', { href: '#/alertas' }, 'Ver e tratar alertas')));
}

export async function telaAlerta(ctx) {
  const alertas = await api.alertas();
  const podeTratar = ctx.sessao.perfil === 'gestor'; // RH é observador (RF15, HU-13)
  const detalhe = h('div', { class: 'detalhe', 'aria-live': 'polite' });
  const lista = h('ul', { class: 'lista-alertas' });

  const desenharLista = () => {
    lista.replaceChildren(...alertas.map(a => h('li', null,
      h('button', { type: 'button', class: 'item-alerta', 'aria-pressed': 'false', onclick: ev => abrir(a, ev.currentTarget) },
        h('strong', null, a.pessoa), h('span', null, a.tipo),
        h('span', { class: `status status-${a.status}` }, a.status === 'tratado' ? '✓ Tratado' : 'Aberto')))));
  };

  const abrir = (a, botaoItem) => {
    lista.querySelectorAll('.item-alerta').forEach(b => b.setAttribute('aria-pressed', String(b === botaoItem)));
    if (a.status === 'tratado') {
      detalhe.replaceChildren(h('h2', null, a.pessoa),
        aviso('ok', 'Alerta tratado', `Ação registrada: ${a.acao?.acao}${a.acao?.nota ? `. ${a.acao.nota}` : ''}`)); // estado "TL-07 tratado"
      return;
    }
    const slot = h('div');
    const form = h('form', { novalidate: true },
      h('h2', null, a.pessoa), h('p', null, a.tipo),
      !podeTratar && aviso('info', 'Somente leitura', 'O RH acompanha os alertas, mas quem trata é a chefia vigente.'),
      campo({ rotulo: 'Ação realizada', nome: 'acao', obrigatorio: true, opcoes: [
        { valor: '', texto: 'Selecione' }, { valor: 'Conversa individual', texto: 'Conversa individual' },
        { valor: 'Redistribuição de tarefas', texto: 'Redistribuição de tarefas' }, { valor: 'Encaminhado ao RH', texto: 'Encaminhado ao RH' }] }),
      campo({ rotulo: 'Observação', nome: 'nota', tipo: 'textarea' }),
      slot,
      botao('Registrar tratamento', { tipo: 'submit', desabilitado: !podeTratar }));
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const d = new FormData(form);
      if (!d.get('acao')) { slot.replaceChildren(aviso('erro', 'Escolha a ação realizada')); return; }
      try {
        const novo = await api.tratarAlerta(a.id, { acao: d.get('acao'), nota: d.get('nota') });
        Object.assign(a, novo);
        desenharLista();
        abrir(a, null);
        anunciar('Alerta tratado.');
      } catch (e) {
        slot.replaceChildren(aviso('erro', 'Não foi possível registrar', e instanceof ApiError && e.status === 404 ? 'Este alerta não está disponível para o seu perfil.' : 'Tente novamente.'));
      }
    });
    detalhe.replaceChildren(form);
  };

  desenharLista();
  return h('section', null,
    h('h1', null, 'Tratar alerta'),
    h('p', { class: 'sub' }, `${alertas.filter(a => a.status === 'aberto').length} alertas abertos`),
    alertas.length === 0 ? aviso('info', 'Nenhum alerta', 'Quando uma condição de alerta ocorrer, ela aparece aqui.') :
    h('div', { class: 'duas-colunas' }, lista, detalhe));
}

export async function telaMetas() {
  const metas = await api.metas();
  return h('section', null,
    h('h1', null, 'Metas da equipe'),
    h('div', { class: 'barra-acao' }, h('a', { class: 'btn btn-primario', href: '#/metas/nova' }, 'Cadastrar meta')),
    metas.length === 0
      ? aviso('info', 'Nenhuma meta cadastrada', 'Cadastre a primeira meta para acompanhar o progresso da equipe.') // estado vazio: confirmar na ficha do UC02 ext. 1a
      : tabela({
        legenda: 'Metas da equipe',
        colunas: [
          { rotulo: 'Meta', celula: m => m.titulo },
          { rotulo: 'Responsável', celula: m => m.responsavel },
          { rotulo: 'Prazo', celula: m => fmtData(m.prazo) },
          { rotulo: 'Indicador', celula: m => m.indicador },
          { rotulo: 'Progresso', celula: m => barra(m.progresso, `Progresso de ${m.titulo}`) }
        ],
        linhas: metas
      }));
}

export async function telaMetaNova(ctx) {
  const form = h('form', { novalidate: true, class: 'cartao' });
  const slot = h('div');
  const desenhar = (v = {}, erros = {}, salvo = false) => {
    const n = Object.keys(erros).length;
    preencher(form, 
      n ? aviso('erro', 'Revise os campos', Object.values(erros).join(' ')) : null, // estado "TL-09 erro"
      salvo ? aviso('ok', 'Meta salva', 'A meta aparece na lista da equipe.') : null, // estado "TL-09 salvo"
      campo({ rotulo: 'Meta', nome: 'titulo', valor: v.titulo || '', obrigatorio: true, erro: erros.titulo }),
      campo({ rotulo: 'Responsável', nome: 'responsavel', valor: v.responsavel || '', obrigatorio: true, erro: erros.responsavel,
        opcoes: [{ valor: '', texto: 'Selecione' }, ...['Ana Souza', 'Bruno Matos', 'Lívia Cardoso', 'Davi Nunes'].map(x => ({ valor: x, texto: x }))] }),
      campo({ rotulo: 'Início', nome: 'inicio', tipo: 'date', valor: v.inicio || '', obrigatorio: true, erro: erros.inicio }),
      campo({ rotulo: 'Prazo', nome: 'prazo', tipo: 'date', valor: v.prazo || '', obrigatorio: true, erro: erros.prazo }),
      campo({ rotulo: 'Indicador', nome: 'indicador', valor: v.indicador || '', obrigatorio: true, erro: erros.indicador, ajuda: 'Como o progresso será medido.' }),
      h('div', { class: 'acoes' }, botao('Salvar meta', { tipo: 'submit' }), h('a', { class: 'btn btn-secundario', href: '#/metas' }, 'Voltar')));
    if (n) { const a = form.querySelector('[role=alert]'); a.setAttribute('tabindex', '-1'); a.focus(); }
    if (salvo) { const a = form.querySelector('[role=status]'); a.setAttribute('tabindex', '-1'); a.focus(); }
  };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const erros = {};
    if (!v.titulo?.trim()) erros.titulo = 'Informe a meta.';
    if (!v.responsavel) erros.responsavel = 'Escolha o responsável.';
    if (!v.inicio) erros.inicio = 'Informe a data de início.';
    if (!v.prazo) erros.prazo = 'Informe o prazo.';
    else if (v.inicio && v.prazo < v.inicio) erros.prazo = 'O prazo não pode ser anterior ao início.';
    if (!v.indicador?.trim()) erros.indicador = 'Informe o indicador.';
    if (Object.keys(erros).length) { desenhar(v, erros); return; }
    try { await api.criarMeta(v); desenhar({}, {}, true); }
    catch (e) { desenhar(v, {}); form.prepend(aviso('erro', 'Não foi possível salvar', 'Tente novamente.')); }
  });
  desenhar();
  return h('section', null, h('h1', null, 'Cadastrar meta'), slot, form);
}

export async function telaProgresso() {
  const itens = await api.progressoPendente();
  const lista = h('div');
  const desenhar = () => {
    lista.replaceChildren(itens.length === 0 ? aviso('info', 'Nada a validar', 'Os autorrelatos de progresso aparecem aqui.') :
      tabela({
        legenda: 'Progresso informado pelas pessoas',
        colunas: [
          { rotulo: 'Pessoa', celula: p => p.pessoa },
          { rotulo: 'Meta', celula: p => p.meta },
          { rotulo: 'Progresso', celula: p => `${p.valor}%` },
          { rotulo: 'Origem', celula: p => h('span', { class: 'rotulo-origem' }, p.origem) },
          { rotulo: 'Ação', celula: p => p.validado ? '✓ Concluído' : h('div', { class: 'linha-botoes' },
            botao('Validar', { variante: 'secundario', 'aria-label': `Validar progresso de ${p.pessoa}`, onClick: () => decidir(p, 'validar') }),
            botao('Ajustar', { variante: 'secundario', 'aria-label': `Ajustar progresso de ${p.pessoa}`, onClick: () => ajustar(p) })) }
        ],
        linhas: itens
      }));
  };
  async function decidir(p, decisao, valor) {
    try { Object.assign(p, await api.validarProgresso(p.id, { decisao, valor })); desenhar(); anunciar(`Progresso de ${p.pessoa} ${decisao === 'ajustar' ? 'ajustado' : 'validado'}.`); }
    catch { lista.prepend(aviso('erro', 'Não foi possível registrar a validação')); }
  }
  function ajustar(p) {
    const v = window.prompt(`Novo progresso de ${p.pessoa} (0 a 100):`, String(p.valor));
    const n = Number(v);
    if (v == null) return;
    if (!Number.isFinite(n) || n < 0 || n > 100) { lista.prepend(aviso('erro', 'Valor inválido', 'Informe um número de 0 a 100.')); return; }
    decidir(p, 'ajustar', n);
  }
  desenhar();
  return h('section', null, h('h1', null, 'Validar progresso'),
    h('p', { class: 'sub' }, 'Todo valor mostra sua origem: autorrelato, validado ou ajustado pelo gestor.'), lista);
}
