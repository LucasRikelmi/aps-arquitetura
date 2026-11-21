// TL-12 Formulário de check-in
import { h, campo, botao, aviso, anunciar } from '../dom.js';
import { api } from '../api.js';

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
