// TL-01 Entrar (+ estado "TL-01 erro")
import { h, preencher, campo, botao, aviso, focarAviso } from '../dom.js';
import { api, ApiError } from '../api.js';

const cfg = window.APP_CONFIG || {};
const PERFIS_DEMO = [['colaborador', 'Colaborador'], ['gestor', 'Gestor'], ['rh', 'RH'], ['diretoria', 'Diretoria'], ['administracao', 'Administração']];

export async function telaEntrar(ctx) {
  const demo = cfg.USE_MOCK && cfg.ATALHOS_DEMO && typeof api.entrarComo === 'function';
  const cred = demo ? api.credencialDemo() : { email: '', senha: '' };
  const slot = h('div', { class: 'slot-erro' });
  const form = h('form', { novalidate: true, class: 'cartao cartao-estreito' });
  let enviando = false;

  const desenhar = (erro = '') => {
    preencher(form, 
      h('h1', null, 'Entrar'),
      h('p', { class: 'sub' }, 'Use o e-mail corporativo cadastrado pelo RH.'),
      slot,
      campo({ rotulo: 'E-mail corporativo', nome: 'email', tipo: 'email', valor: cred.email, obrigatorio: true, autocomplete: 'username' }),
      campo({ rotulo: 'Senha', nome: 'senha', tipo: 'password', valor: cred.senha, obrigatorio: true, autocomplete: 'current-password' }),
      botao('Entrar', { tipo: 'submit', classe: 'largo' }),
      demo && botao('Simular credencial inválida', { variante: 'secundario', onClick: () => submeter('x@empresa.com.br', 'errada') })
    );
    slot.replaceChildren();
    if (erro) {
      // Mensagem única, sem dizer se o e-mail existe (RF03; item 3.1a).
      slot.append(aviso('erro', 'Não foi possível entrar', erro));
      focarAviso(slot);
    }
  };

  async function submeter(email, senha) {
    if (enviando) return;
    if (!email || !senha) { desenhar('Informe o e-mail e a senha.'); return; }
    enviando = true;
    form.setAttribute('aria-busy', 'true');
    try {
      await api.login(email, senha);
      ctx.navegar('');
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 401 ? 'E-mail ou senha incorretos.'
        : e instanceof ApiError && e.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
        : e instanceof ApiError && (e.status === 0 || e.status >= 500) ? 'O serviço está indisponível. Tente novamente em instantes.'
        : 'Não foi possível entrar. Tente novamente.';
      desenhar(msg);
    } finally {
      enviando = false;
      form.removeAttribute('aria-busy');
    }
  }

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const d = new FormData(form);
    submeter(d.get('email'), d.get('senha'));
  });
  desenhar();

  const raiz = h('section', { class: 'entrar' },
    h('div', { class: 'marca marca-grande' },
      h('span', { class: 'marca-icone', 'aria-hidden': 'true' }, 'RH'),
      h('div', null, h('strong', null, 'RH Soluções'), h('span', { class: 'marca-sub' }, 'Gestão de Pessoas'))),
    form);

  if (demo) {
    raiz.append(h('section', { class: 'cartao cartao-estreito atalhos', 'aria-labelledby': 'atalhos-t' },
      h('h2', { id: 'atalhos-t' }, 'Atalhos do protótipo: entrar como'),
      h('div', { class: 'linha-botoes' }, PERFIS_DEMO.map(([p, t]) =>
        botao(t, { variante: 'secundario', onClick: async () => { await api.entrarComo(p); ctx.navegar(''); } }))),
      h('p', { class: 'ajuda' }, 'Atalhos existem só no protótipo. No sistema o perfil vem do cadastro e é validado no servidor (RF09).')));
  }
  return raiz;
}
