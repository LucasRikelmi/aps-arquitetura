// TL-07 Tratar alerta (+ estado "tratado")
import { h, campo, botao, aviso, anunciar, focarAviso } from '../dom.js';
import { api, ApiError } from '../api.js';

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
        focarAviso(detalhe);
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
