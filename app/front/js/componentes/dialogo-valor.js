// Diálogo modal que pede um número dentro de uma faixa. Substitui window.prompt (sem rótulo, sem foco gerenciado).
import { h, botao, campo } from '../dom.js';

export function dialogoValor({ titulo, rotulo, valor, min = 0, max = 100, rotuloOk = 'Confirmar' }) {
  return new Promise(resolve => {
    const antes = document.activeElement;
    const corpo = h('div');
    const form = h('form', { novalidate: true, method: 'dialog' });
    const desenhar = erro => {
      corpo.replaceChildren(campo({ rotulo, nome: 'valor', tipo: 'number', valor: String(valor), obrigatorio: true, erro, ajuda: `De ${min} a ${max}.` }));
      const inp = corpo.querySelector('input');
      inp.min = String(min); inp.max = String(max); inp.step = '1';
      return inp;
    };
    const dlg = h('dialog', { class: 'dialogo', 'aria-labelledby': 'dlg-v-t' }, h('h2', { id: 'dlg-v-t' }, titulo), form);
    form.append(corpo, h('div', { class: 'acoes' },
      botao('Cancelar', { variante: 'secundario', onClick: () => dlg.close('cancel') }),
      botao(rotuloOk, { tipo: 'submit' })));
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const n = Number(new FormData(form).get('valor'));
      if (!Number.isInteger(n) || n < min || n > max) { desenhar(`Informe um número inteiro de ${min} a ${max}.`).focus(); return; }
      dlg.returnValue = String(n);
      dlg.close(String(n));
    });
    dlg.addEventListener('close', () => {
      const ok = dlg.returnValue !== 'cancel' && dlg.returnValue !== '';
      dlg.remove(); antes?.focus?.(); resolve(ok ? Number(dlg.returnValue) : null);
    });
    desenhar('');
    document.body.append(dlg);
    dlg.showModal();
    corpo.querySelector('input').select();
  });
}
