// TL-04 Janela encerrada
import { h, aviso } from '../dom.js';

export async function telaJanelaEncerrada() {
  return h('section', { class: 'vazio' },
    h('h1', null, 'Janela do check-in encerrada'),
    aviso('aviso', 'A semana 46 já fechou', 'O prazo terminou na sexta-feira, 13/11, às 18:00 (horário de Brasília). Não é possível enviar ou alterar a resposta.'),
    h('p', null, 'Se precisar registrar esta semana, peça ao RH a reabertura.'),
    h('a', { class: 'btn btn-secundario', href: '#/historico' }, 'Ver meu histórico'));
}
