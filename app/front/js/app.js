// Casca da aplicação: sessão, roteador por hash e menu por perfil.
// O cliente não decide acesso (DA11, RF09): cada tela pede seus dados ao servidor, que responde 404
// para recurso de outro perfil, e a aplicação mostra TL-17. O menu por perfil é só conveniência.
import { h, anunciar } from './dom.js';
import { api, ApiError } from './api.js';
import { ROTAS, NAO_ENCONTRADO, MENU } from './rotas.js';
import { ROTULO_PERFIL } from './dominio.js';
import { telaNaoEncontrado } from './screens/tl17-nao-encontrado.js';

const raiz = document.getElementById('app');

let sessao = null;
let geracao = 0; // descarta renderizações obsoletas quando o usuário navega rápido

export const navegar = destino => { location.hash = `#${destino}`; };
export const sessaoAtual = () => sessao;
export function encerrarSessaoLocal() { sessao = null; }

function logotipo() {
  return h('div', { class: 'marca' },
    h('span', { class: 'marca-icone', 'aria-hidden': 'true' }, 'RH'),
    h('div', null, h('strong', null, 'RH Soluções'), h('span', { class: 'marca-sub' }, 'Gestão de Pessoas')));
}

function casca(rota, conteudo) {
  if (!sessao) return h('div', { class: 'pagina-simples' }, h('main', { id: 'conteudo', tabindex: '-1', 'data-tela': rota.tl }, conteudo));
  const atual = rota.menu || rota.caminho; // telas internas destacam o item de menu de origem
  const itens = MENU[sessao.perfil] || [];
  const sair = h('button', { type: 'button', class: 'link-botao', onclick: sairDoSistema }, 'Sair');
  return h('div', { class: 'casca' },
    h('header', { class: 'topo' },
      logotipo(),
      h('div', { class: 'topo-direita' },
        h('span', { class: 'selo-perfil' }, ROTULO_PERFIL[sessao.perfil]),
        h('span', { class: 'nome' }, sessao.nome),
        sair)),
    h('div', { class: 'corpo' },
      h('nav', { class: 'menu', 'aria-label': 'Principal' },
        h('ul', null, itens.map(([c, t]) =>
          h('li', null, h('a', { href: `#${c}`, 'aria-current': atual === c ? 'page' : null }, t))))),
      h('main', { id: 'conteudo', tabindex: '-1', 'data-tela': rota.tl }, conteudo)));
}

async function sairDoSistema() {
  try { await api.logout(); } catch { /* sessão já inválida no servidor */ }
  sessao = null;
  navegar('entrar');
}

function primeiraRota() {
  const m = MENU[sessao.perfil];
  return m ? m[0][0] : 'entrar';
}

async function renderizar() {
  const minha = ++geracao;
  if (!raiz.firstChild) raiz.append(h('p', { class: 'carregando', role: 'status' }, 'Carregando…'));
  const [caminho, consulta = ''] = (location.hash.replace(/^#\/?/, '').split('?'));
  const params = Object.fromEntries(new URLSearchParams(consulta));
  if (!sessao) sessao = await api.sessao().catch(() => null);
  if (minha !== geracao) return;

  if (!caminho) return navegar(sessao ? primeiraRota() : 'entrar');
  let rota = ROTAS.find(r => r.caminho === caminho);
  if (!rota) rota = NAO_ENCONTRADO;
  if (!rota.publica && !sessao) return navegar('entrar');
  if (rota.caminho === 'entrar' && sessao) return navegar(primeiraRota());

  const ctx = { sessao, navegar, anunciar, rota, params };
  let conteudo;
  try {
    conteudo = await rota.tela(ctx);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) { sessao = null; return navegar('entrar'); }
    if (e instanceof ApiError && e.status === 404) { rota = NAO_ENCONTRADO; conteudo = await telaNaoEncontrado(ctx); }
    else conteudo = h('section', null, h('h1', null, 'Não foi possível carregar'), h('p', { role: 'alert' }, e.status >= 500 || e.status === 0 ? 'O serviço está indisponível. Tente novamente em instantes.' : 'Ocorreu um erro inesperado.'));
  }
  if (minha !== geracao) return;

  raiz.replaceChildren(casca(rota, conteudo));
  const titulo = conteudo.querySelector?.('h1')?.textContent || rota.tl;
  document.title = `${titulo} · RH Soluções`;
  // Foco no conteúdo a cada troca de tela: leitor de tela e teclado começam do ponto certo (HU-17).
  const alvo = document.getElementById('conteudo');
  alvo?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  anunciar(`${titulo}. Tela carregada.`);
}

// Qualquer chamada autenticada que volte 401 encerra a sessão local e leva ao login.
window.addEventListener('sessao-expirada', () => {
  if (!sessao) return;
  sessao = null;
  try { sessionStorage.setItem('aviso-entrada', 'Sua sessão expirou. Entre novamente.'); } catch { /* armazenamento indisponível */ }
  navegar('entrar');
  if (location.hash === '#entrar') renderizar();
});
window.addEventListener('hashchange', renderizar);
renderizar();
