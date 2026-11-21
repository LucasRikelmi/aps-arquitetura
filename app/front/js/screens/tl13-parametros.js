// TL-13 Parâmetros do sistema
import { h, campo, botao, aviso, anunciar } from '../dom.js';
import { api } from '../api.js';

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
