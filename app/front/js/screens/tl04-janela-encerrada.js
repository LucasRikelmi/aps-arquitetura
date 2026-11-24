// TL-04 Janela encerrada (extensão 2b do UC01)
import { h, selo } from '../dom.js';
import { api } from '../api.js';

export async function telaJanelaEncerrada(ctx) {
  const d = await api.checkinAtual(); // o servidor decide se a janela está mesmo encerrada
  if (d.aberta) { ctx.navegar('checkin'); return h('section', null, h('h1', null, 'Check-in')); }
  return h('section', null,
    h('div', { class: 'cab-semana' },
      h('div', null, h('h1', null, `Check-in da semana ${d.semana}`), h('p', { class: 'sub' }, d.periodo)),
      selo('Encerrado', 'neutro')),
    h('div', { class: 'cartao' },
      h('h2', null, 'O prazo desta semana terminou'),
      h('p', null, d.regra),
      h('p', null, 'Se precisar corrigir algo, fale com o RH. A reabertura é feita pelo RH e fica registrada. Ao reabrir, o RH define até quando você pode editar.'),
      h('div', { class: 'acoes' },
        h('a', { class: 'btn btn-primario', href: '#historico' }, 'Ver meu histórico'),
        h('a', { class: 'btn btn-secundario', href: '#checkin' }, 'Ir para a semana atual'))));
}
