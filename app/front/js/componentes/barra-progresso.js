// Barra de progresso com valor em texto (a informação não depende só da cor, RNF08).
import { h } from '../dom.js';

// Largura pela API de estilo (CSSOM), compatível com CSP sem 'unsafe-inline' em style-src.
function preenchimento(valor) {
  const el = h('div', { class: 'barra-preenchimento' });
  el.style.width = `${valor}%`;
  return el;
}

export function barraProgresso(valor, rotulo) {
  return h('div', { class: 'barra-linha' },
    h('div', { class: 'barra', role: 'progressbar', 'aria-valuenow': valor, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': rotulo },
      preenchimento(valor)),
    h('span', { class: 'barra-texto' }, `${valor}%`));
}
