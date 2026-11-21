// TL-02 Check-in semanal (+ estados "enviado" e "erro"). TL-03 (celular) é este mesmo layout em tela estreita (RNF02).
import { h, aviso } from '../dom.js';
import { api } from '../api.js';
import { formularioCheckin } from '../componentes/formulario-checkin.js';

export async function telaCheckin(ctx) {
  const dados = await api.checkinAtual();
  if (!dados.aberta) { ctx.navegar('checkin-encerrado'); return h('section', null, h('h1', null, 'Check-in')); }
  return h('section', null,
    h('h1', { id: 'cab-checkin' }, `Check-in da semana ${dados.semana}`),
    h('p', { class: 'sub' }, `${dados.periodo} · aberto até ${dados.limite}`),
    aviso('info', 'Quem vê suas respostas', 'Seu gestor direto e o RH veem suas respostas individuais. A Diretoria vê apenas médias por departamento, sem identificar ninguém.'),
    formularioCheckin(ctx, dados));
}
