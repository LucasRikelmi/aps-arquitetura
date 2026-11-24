// TL-17 Recurso inexistente (mesma resposta para recurso que não existe e para o de terceiro, RF09/RNF07)
import { h, selo } from '../dom.js';

export async function telaNaoEncontrado(ctx) {
  const logado = !!ctx.sessao;
  return h('section', { class: 'cartao vazio' },
    h('p', null, selo('Erro 404')),
    h('h1', null, 'Página não encontrada'),
    h('p', null, 'O endereço não existe ou não está disponível para você.'),
    h('a', { class: 'btn btn-primario', href: logado ? '#' : '#entrar' }, 'Voltar ao início'));
}
