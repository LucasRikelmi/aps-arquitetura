// Casca da aplicação: sessão, roteador por hash com guarda de perfil e menu por perfil.
// A guarda aqui é só conveniência de navegação. A autorização de verdade é do servidor (DA11, RF09):
// recurso de outro perfil responde 404 e a tela cai em TL-17.
import { h, anunciar } from './dom.js';
import { api, ApiError } from './api.js';
import { telaEntrar, telaNaoEncontrado } from './screens/acesso.js';
import { telaCheckin, telaCheckinCelular, telaJanelaEncerrada, telaHistorico } from './screens/colaborador.js';
import { telaPainel, telaAlerta, telaMetas, telaMetaNova, telaProgresso } from './screens/gestao.js';
import { telaCadastro, telaFormulario, telaParametros, telaRelatorios, telaPerfis, telaLog } from './screens/rh-admin.js';

const cfg = window.APP_CONFIG || {};
const raiz = document.getElementById('app');

const ROTAS = [
  { caminho: 'entrar', tl: 'TL-01', rastro: 'RF09', publica: true, tela: telaEntrar },
  { caminho: 'checkin', tl: 'TL-02', rastro: 'UC01 · RF01 RF04 RNF03 RNF08', perfis: ['colaborador'], tela: telaCheckin },
  { caminho: 'checkin-celular', tl: 'TL-03', rastro: 'UC01 · RNF02', perfis: ['colaborador'], tela: telaCheckinCelular },
  { caminho: 'checkin-encerrado', tl: 'TL-04', rastro: 'UC01 ext. 2b · RF01', perfis: ['colaborador'], tela: telaJanelaEncerrada },
  { caminho: 'historico', tl: 'TL-05', rastro: 'UC05 · RF10 RNF07', perfis: ['colaborador'], tela: telaHistorico },
  { caminho: 'painel', tl: 'TL-06', rastro: 'UC03 · RF05 RF06 RF08 RNF06', perfis: ['gestor', 'rh'], tela: telaPainel },
  { caminho: 'alertas', tl: 'TL-07', rastro: 'UC04 UC15 · RF07 RF15', perfis: ['gestor', 'rh'], tela: telaAlerta },
  { caminho: 'metas', tl: 'TL-08', rastro: 'UC02 ext. 1a · RF03', perfis: ['gestor'], tela: telaMetas },
  { caminho: 'metas/nova', tl: 'TL-09', rastro: 'UC02 · RF03 RNF04', perfis: ['gestor'], tela: telaMetaNova },
  { caminho: 'progresso', tl: 'TL-10', rastro: 'UC06 · RF04', perfis: ['gestor'], tela: telaProgresso },
  { caminho: 'cadastro', tl: 'TL-11', rastro: 'UC07 · RF02 RNF04', perfis: ['rh', 'administracao'], tela: telaCadastro },
  { caminho: 'formulario', tl: 'TL-12', rastro: 'UC10 · RF11', perfis: ['rh'], tela: telaFormulario },
  { caminho: 'parametros', tl: 'TL-13', rastro: 'UC16 · RF01 RF06 RF07 RNF01', perfis: ['rh'], tela: telaParametros },
  { caminho: 'relatorios', tl: 'TL-14', rastro: 'UC13 UC14 · RF12 RF13', perfis: ['rh', 'gestor', 'diretoria'], tela: telaRelatorios },
  { caminho: 'perfis', tl: 'TL-15', rastro: 'UC08 · RF09', perfis: ['administracao'], tela: telaPerfis },
  { caminho: 'log', tl: 'TL-16', rastro: 'UC09 · RNF01 RF09', perfis: ['administracao'], tela: telaLog }
];
const NAO_ENCONTRADO = { caminho: '404', tl: 'TL-17', rastro: 'ext. *a · RF09 RNF07', publica: true, tela: telaNaoEncontrado };

const MENU = {
  colaborador: [['checkin', 'Check-in da semana'], ['historico', 'Meu histórico']],
  gestor: [['painel', 'Painel da equipe'], ['alertas', 'Alertas'], ['metas', 'Metas da equipe'], ['progresso', 'Validar progresso'], ['relatorios', 'Relatórios']],
  rh: [['painel', 'Painel'], ['alertas', 'Alertas'], ['cadastro', 'Cadastro'], ['formulario', 'Formulário de check-in'], ['parametros', 'Parâmetros'], ['relatorios', 'Relatórios']],
  diretoria: [['relatorios', 'Relatórios agregados']],
  administracao: [['cadastro', 'Cadastro'], ['perfis', 'Perfis de acesso'], ['log', 'Log de acesso']]
};
const ROTULO_PERFIL = { colaborador: 'Colaborador', gestor: 'Gestor', rh: 'RH', diretoria: 'Diretoria', administracao: 'Administração' };

let sessao = null;
let geracao = 0; // descarta renderizações obsoletas quando o usuário navega rápido

export const navegar = destino => { location.hash = `#/${destino}`; };
export const sessaoAtual = () => sessao;
export function encerrarSessaoLocal() { sessao = null; }

function logotipo() {
  return h('div', { class: 'marca' },
    h('span', { class: 'marca-icone', 'aria-hidden': 'true' }, 'RH'),
    h('div', null, h('strong', null, 'RH Soluções'), h('span', { class: 'marca-sub' }, 'Gestão de Pessoas')));
}

function casca(rota, conteudo) {
  if (!sessao) return h('div', { class: 'pagina-simples' }, h('main', { id: 'conteudo', tabindex: '-1' }, conteudo));
  const atual = rota.caminho;
  const itens = MENU[sessao.perfil] || [];
  const sair = h('button', { type: 'button', class: 'link-botao', onclick: sairDoSistema }, 'Sair');
  return h('div', { class: 'casca' },
    h('header', { class: 'topo' },
      logotipo(),
      h('div', { class: 'topo-direita' },
        cfg.MOSTRAR_RASTRO && h('span', { class: 'selo-tl', title: 'Identificador de rastreabilidade' }, `${rota.tl} · ${rota.rastro}`),
        h('span', { class: 'selo-perfil' }, ROTULO_PERFIL[sessao.perfil]),
        h('span', { class: 'nome' }, sessao.nome),
        sair)),
    h('div', { class: 'corpo' },
      h('nav', { class: 'menu', 'aria-label': 'Principal' },
        h('ul', null, itens.map(([c, t]) =>
          h('li', null, h('a', { href: `#/${c}`, 'aria-current': atual === c || (c === 'checkin' && atual.startsWith('checkin')) || (c === 'metas' && atual.startsWith('metas')) ? 'page' : null }, t))))),
      h('main', { id: 'conteudo', tabindex: '-1' }, conteudo)));
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
  const caminho = (location.hash.replace(/^#\/?/, '').split('?')[0]) || '';
  if (!sessao) sessao = await api.sessao().catch(() => null);
  if (minha !== geracao) return;

  if (!caminho) return navegar(sessao ? primeiraRota() : 'entrar');
  let rota = ROTAS.find(r => r.caminho === caminho);
  if (!rota) rota = NAO_ENCONTRADO;
  if (!rota.publica && !sessao) return navegar('entrar');
  if (rota.caminho === 'entrar' && sessao) return navegar(primeiraRota());
  // Perfil sem acesso: mesma resposta de recurso inexistente (RB-07, HU-09.C01), sem revelar que existe.
  if (rota.perfis && !rota.perfis.includes(sessao.perfil)) rota = NAO_ENCONTRADO;

  const ctx = { sessao, navegar, anunciar, rota };
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

window.addEventListener('hashchange', renderizar);
renderizar();
