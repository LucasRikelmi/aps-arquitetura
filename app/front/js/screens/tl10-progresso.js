// TL-10 Validar progresso de uma meta (o gestor confirma ou ajusta o valor informado; o autorrelato não é sobrescrito)
import { h, preencher, campo, botao, aviso, focarAviso, anunciar } from '../dom.js';
import { api } from '../api.js';
import { fmtData } from '../dominio.js';

export async function telaProgresso(ctx) {
  const id = ctx.params.id;
  if (!id) { ctx.navegar('metas'); return h('section', null, h('h1', null, 'Validar progresso')); }
  let m = await api.meta(id);
  const informado = m.progresso;
  const cartoes = h('div', { class: 'duas-colunas' });
  const formSlot = h('div');
  const desenhar = (valor = informado, erro = '') => {
    const validado = !m.validavel;
    preencher(cartoes,
      h('div', { class: 'cartao-mini' }, h('span', { class: 'cartao-mini-titulo' }, 'Informado pelo colaborador'), h('strong', null, `${informado}%`), h('span', null, 'check-in da semana 46, 09/11/2026')),
      h('div', { class: 'cartao-mini' }, h('span', { class: 'cartao-mini-titulo' }, 'Validado pelo gestor'), h('strong', null, validado ? `${m.progresso}%` : 'Pendente'), h('span', null, validado ? 'validado' : 'ainda não validado')));
    if (validado) {
      preencher(formSlot, aviso('ok', 'Progresso validado', `${m.titulo}: ${m.progresso}% (${m.origem}).`), h('a', { class: 'btn btn-secundario', href: '#metas' }, 'Voltar às metas'));
      return;
    }
    const form = h('form', { novalidate: true, class: 'cartao' });
    const saida = h('output', { for: 'valor-validado', class: 'valor-slider' }, `${valor}%`);
    preencher(form,
      erro ? aviso('erro', 'Não foi possível registrar', erro) : null,
      h('div', { class: 'meta-linha' },
        h('label', { for: 'valor-validado' }, 'Progresso validado'),
        h('div', { class: 'slider' },
          h('input', { type: 'range', id: 'valor-validado', name: 'percentual', min: 0, max: 100, step: 5, value: valor, 'aria-valuetext': `${valor} por cento`, 'aria-describedby': 'ajuda-validado',
            oninput: ev => { saida.textContent = `${ev.target.value}%`; ev.target.setAttribute('aria-valuetext', `${ev.target.value} por cento`); } }),
          saida),
        h('p', { class: 'ajuda', id: 'ajuda-validado' }, 'Confirme o valor informado ou o ajuste. O autorrelato não é sobrescrito.')),
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Avaliação qualitativa', nome: 'avaliacao', tipo: 'textarea', ajuda: 'Separada do percentual.' }),
        campo({ rotulo: 'Comentário do gestor', nome: 'comentario', tipo: 'textarea' })),
      h('div', { class: 'acoes' },
        botao('Registrar validação', { tipo: 'submit' }),
        botao('Confirmar progresso', { variante: 'secundario', onClick: () => enviar(form, informado) })),
      h('p', { class: 'nota' }, 'Sem nota, ranking ou comparação entre colaboradores. Se não houver autorrelato no período, a validação não é concluída com valor fictício.'));
    form.addEventListener('submit', ev => { ev.preventDefault(); enviar(form, Number(form.elements.percentual.value)); });
    preencher(formSlot, form);
    if (erro) focarAviso(form);
  };
  async function enviar(form, percentual) {
    const d = Object.fromEntries(new FormData(form));
    try {
      m = await api.validarMeta(id, { percentual, avaliacao: d.avaliacao || '', comentario: d.comentario || '' });
      desenhar(); focarAviso(formSlot); anunciar('Progresso validado.');
    } catch (e) { desenhar(percentual, e.status === 422 ? 'Valor inválido.' : 'Tente novamente.'); }
  }
  desenhar();
  return h('section', null,
    h('a', { class: 'link-voltar', href: '#metas' }, 'Voltar às metas'),
    h('h1', null, 'Validar progresso'),
    h('p', { class: 'sub' }, `${m.titulo} · ${m.responsavel} · prazo ${fmtData(m.prazo)}`),
    cartoes, formSlot);
}
