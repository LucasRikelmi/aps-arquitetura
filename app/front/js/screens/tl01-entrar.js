// TL-01 Entrar (+ estado "TL-01 erro")
import { h, preencher, campo, botao, aviso, focarAviso } from '../dom.js';
import { api, ApiError } from '../api.js';
import { segundosDeRetryAfter } from '../errors.js';

function avisoDeEntrada() {
  try {
    const m = sessionStorage.getItem('aviso-entrada');
    sessionStorage.removeItem('aviso-entrada');
    return m;
  } catch { return null; }
}

// 429: o prazo vem do servidor (Retry-After). Sem o cabeçalho, mensagem genérica, sem inventar duração.
export function mensagemBloqueio(retryAfter) {
  const s = segundosDeRetryAfter(retryAfter);
  if (s == null) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  if (s < 60) return 'Muitas tentativas. Tente de novo em menos de 1 minuto.';
  const min = Math.ceil(s / 60);
  return `Muitas tentativas. Tente de novo em ${min} ${min === 1 ? 'minuto' : 'minutos'}.`;
}

export async function telaEntrar(ctx) {
  const slot = h('div', { class: 'slot-erro' });
  const form = h('form', { novalidate: true, class: 'cartao cartao-estreito' });
  const expirou = avisoDeEntrada();
  let enviando = false;

  const desenhar = (erro = '', email = '') => {
    preencher(form,
      h('h1', null, 'Entrar'),
      h('p', { class: 'sub' }, 'Use o e-mail corporativo cadastrado pelo RH.'),
      slot,
      campo({ rotulo: 'E-mail corporativo', nome: 'email', tipo: 'email', valor: email, obrigatorio: true, autocomplete: 'username' }),
      campo({ rotulo: 'Senha', nome: 'senha', tipo: 'password', obrigatorio: true, autocomplete: 'current-password' }),
      botao('Entrar', { tipo: 'submit', classe: 'largo' }));
    slot.replaceChildren();
    if (erro) {
      // Mensagem única, sem dizer se o e-mail existe (RF03; item 3.1a).
      slot.append(aviso('erro', 'Não foi possível entrar', erro));
      focarAviso(slot);
    } else if (expirou) {
      slot.append(aviso('info', 'Sessão encerrada', expirou));
    }
  };

  async function submeter(email, senha) {
    if (enviando) return;
    if (!email || !senha) { desenhar('Informe o e-mail e a senha.', email); return; }
    enviando = true;
    form.setAttribute('aria-busy', 'true');
    try {
      await api.login(email, senha);
      ctx.navegar('');
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 401 ? 'E-mail ou senha incorretos.'
        : e instanceof ApiError && e.status === 429 ? mensagemBloqueio(e.retryAfter)
        : e instanceof ApiError && (e.status === 0 || e.status >= 500) ? 'O serviço está indisponível. Tente novamente em instantes.'
        : 'Não foi possível entrar. Tente novamente.';
      desenhar(msg, email);
    } finally {
      enviando = false;
      form.removeAttribute('aria-busy');
    }
  }

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const d = new FormData(form);
    submeter(String(d.get('email') || '').trim(), String(d.get('senha') || ''));
  });
  desenhar();

  return h('section', { class: 'entrar' },
    h('div', { class: 'marca marca-grande' },
      h('span', { class: 'marca-icone', 'aria-hidden': 'true' }, 'RH'),
      h('div', null, h('strong', null, 'RH Soluções'), h('span', { class: 'marca-sub' }, 'Gestão de Pessoas'))),
    form);
}
