// Criação de DOM sem innerHTML: todo texto entra como textContent (sem XSS por dados da API).
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  add(el, children);
  return el;
}

export function add(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

// replaceChildren converte null/false em texto; este helper os ignora.
export function preencher(el, ...filhos) { el.replaceChildren(); return add(el, filhos); }

let seq = 0;
export const uid = (p = 'id') => `${p}-${++seq}`;

export function anunciar(texto) {
  const r = document.getElementById('anuncio');
  if (!r) return;
  r.textContent = '';
  setTimeout(() => { r.textContent = texto; }, 30);
}

// Aviso: ícone + texto + papel ARIA. A informação nunca depende só da cor (RNF08, HU-17).
const ICONES = { info: 'i', erro: '!', ok: '✓', aviso: '▲' };
export function aviso(tipo, titulo, corpo, { role } = {}) {
  return h('div', { class: `aviso aviso-${tipo}`, role: role || (tipo === 'erro' ? 'alert' : 'status') },
    h('span', { class: 'aviso-icone', 'aria-hidden': 'true' }, ICONES[tipo] || 'i'),
    h('div', null, titulo && h('strong', null, titulo), corpo && h('p', null, corpo)));
}

export function campo({ rotulo, nome, tipo = 'text', valor = '', obrigatorio = false, erro = '', ajuda = '', opcoes, autocomplete }) {
  const id = uid(nome);
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;
  const descr = [ajuda && idAjuda, erro && idErro].filter(Boolean).join(' ') || null;
  const base = { id, name: nome, 'aria-describedby': descr, 'aria-invalid': erro ? 'true' : null, required: obrigatorio || null, autocomplete };
  let ctl;
  if (opcoes) {
    ctl = h('select', base, opcoes.map(o => h('option', { value: o.valor, selected: o.valor === valor || null }, o.texto)));
  } else if (tipo === 'textarea') {
    ctl = h('textarea', { ...base, rows: 3 }, valor);
  } else {
    ctl = h('input', { ...base, type: tipo, value: valor });
  }
  return h('div', { class: `campo${erro ? ' tem-erro' : ''}` },
    h('label', { for: id }, rotulo, obrigatorio ? h('span', { class: 'obrig' }, ' (obrigatório)') : ' (opcional)'),
    ajuda && h('p', { id: idAjuda, class: 'ajuda' }, ajuda),
    ctl,
    erro && h('p', { id: idErro, class: 'msg-erro' }, h('span', { 'aria-hidden': 'true' }, '! '), erro));
}

// Grupo de opções exclusivas (radio): navegável por setas, rótulo textual em cada opção.
export function grupoRadio({ legenda, nome, opcoes, valor, obrigatorio = false, erro = '' }) {
  const idErro = uid('err');
  return h('fieldset', { class: `grupo${erro ? ' tem-erro' : ''}`, 'aria-describedby': erro ? idErro : null },
    h('legend', null, legenda, obrigatorio ? h('span', { class: 'obrig' }, ' (obrigatório)') : ' (opcional)'),
    h('div', { class: 'opcoes' }, opcoes.map(o => {
      const id = uid(nome);
      return h('div', { class: 'opcao' },
        h('input', { type: 'radio', id, name: nome, value: o.valor, checked: String(o.valor) === String(valor) || null, required: obrigatorio || null }),
        h('label', { for: id }, h('span', { class: 'opcao-valor' }, o.valor), o.texto && h('span', { class: 'opcao-texto' }, o.texto)));
    })),
    erro && h('p', { id: idErro, class: 'msg-erro' }, h('span', { 'aria-hidden': 'true' }, '! '), erro));
}

export function botao(texto, { tipo = 'button', variante = 'primario', classe = '', onClick, desabilitado, ...rest } = {}) {
  return h('button', { ...rest, type: tipo, class: `btn btn-${variante} ${classe}`.trim(), onclick: onClick, disabled: desabilitado || null }, texto);
}

// Tabela que vira lista de cartões em telas estreitas (sem rolagem horizontal, RNF02).
export function tabela({ legenda, colunas, linhas }) {
  return h('table', { class: 'tabela' },
    h('caption', null, legenda),
    h('thead', null, h('tr', null, colunas.map(c => h('th', { scope: 'col' }, c.rotulo)))),
    h('tbody', null, linhas.map(l => h('tr', null, colunas.map((c, i) => {
      const cel = c.celula(l);
      return i === 0
        ? h('th', { scope: 'row', 'data-rotulo': c.rotulo }, cel)
        : h('td', { 'data-rotulo': c.rotulo }, cel);
    })))));
}

export function confirmar({ titulo, texto, rotuloOk, perigo = false }) {
  return new Promise(resolve => {
    const antes = document.activeElement;
    const dlg = h('dialog', { class: 'dialogo', 'aria-labelledby': 'dlg-t' },
      h('h2', { id: 'dlg-t' }, titulo),
      h('p', null, texto),
      h('div', { class: 'acoes' },
        botao('Cancelar', { variante: 'secundario', onClick: () => dlg.close('cancel') }),
        botao(rotuloOk, { variante: perigo ? 'perigo' : 'primario', onClick: () => dlg.close('ok') })));
    dlg.addEventListener('close', () => { dlg.remove(); antes?.focus?.(); resolve(dlg.returnValue === 'ok'); });
    document.body.append(dlg);
    dlg.showModal();
  });
}
