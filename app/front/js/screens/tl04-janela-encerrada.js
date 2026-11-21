// TL-04 Janela encerrada (extensão 2b do UC01)
import { h, aviso } from '../dom.js';
import { api } from '../api.js';

export async function telaJanelaEncerrada(ctx) {
  const dados = await api.checkinAtual(); // o servidor decide se a janela está mesmo encerrada
  if (dados.aberta) { ctx.navegar('checkin'); return h('section', null, h('h1', null, 'Check-in')); }
  return h('section', { class: 'vazio' },
    h('h1', null, 'Janela do check-in encerrada'),
    aviso('aviso', `A semana ${dados.semana} já fechou`, `O prazo terminou em ${dados.limite}. Não é possível enviar ou alterar a resposta.`),
    h('p', null, 'Se precisar registrar esta semana, peça ao RH a reabertura.'),
    h('a', { class: 'btn btn-secundario', href: '#historico' }, 'Ver meu histórico'));
}
