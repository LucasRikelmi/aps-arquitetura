// TL-17 Recurso inexistente
import { h } from '../dom.js';

export async function telaNaoEncontrado(ctx) {
  const logado = !!ctx.sessao;
  return h('section', { class: 'vazio' },
    h('h1', null, 'Recurso inexistente'),
    h('p', null, 'O endereço que você abriu não existe ou não está disponível para o seu perfil.'),
    h('p', { class: 'ajuda' }, 'Código 404'),
    h('a', { class: 'btn btn-primario', href: logado ? '#' : '#entrar' }, logado ? 'Voltar ao início' : 'Ir para a entrada'));
}
