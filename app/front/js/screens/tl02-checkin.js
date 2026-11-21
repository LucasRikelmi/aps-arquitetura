// TL-02 Check-in semanal (+ estados "enviado" e "erro")
import { h, aviso } from '../dom.js';
import { api } from '../api.js';
import { formularioCheckin } from '../componentes/formulario-checkin.js';

export async function montarCheckin(ctx, { celular = false } = {}) {
  const dados = await api.checkinAtual();
  if (!dados.aberta) { ctx.navegar('checkin-encerrado'); return h('section', null, h('h1', null, 'Check-in')); }
  const conteudo = h('section', { class: celular ? 'celular' : '' },
    h('h1', { id: 'cab-checkin' }, `Check-in da semana ${dados.semana}`),
    h('p', { class: 'sub' }, `${dados.periodo} · aberto até ${dados.limite}`),
    aviso('info', 'Quem vê suas respostas', 'Seu gestor direto e o RH veem suas respostas individuais. A Diretoria vê apenas médias por departamento, sem identificar ninguém.'),
    formularioCheckin(ctx, dados));
  if (!celular) return conteudo;
  // TL-03: o mesmo formulário dentro de um quadro de 360 px, para demonstrar o uso no celular (RNF02).
  return h('section', null,
    h('h1', { class: 'sr-only' }, 'Check-in no celular'),
    h('p', { class: 'sub' }, 'Pré-visualização em 360 px de largura. Em um celular real, a tela inteira usa este layout.'),
    h('div', { class: 'quadro-celular' }, conteudo));
}

export const telaCheckin = ctx => montarCheckin(ctx);
