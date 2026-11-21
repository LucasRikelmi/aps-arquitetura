// Cliente da API: fetch na mesma origem, com sessão por cookie (DA13).
import { ApiError } from './errors.js';

export { ApiError };
const cfg = window.APP_CONFIG || {};

// Sessão expirada em qualquer chamada autenticada (401) avisa a aplicação, que volta ao login.
async function chamar(metodo, caminho, corpo, { autenticada = true } = {}) {
  let res;
  try {
    res = await fetch(cfg.API_BASE + caminho, {
      method: metodo,
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json', ...(corpo ? { 'Content-Type': 'application/json' } : {}), 'X-Requested-With': 'fetch' },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* corpo vazio ou não JSON (error_page do Nginx deve ser JSON, item 3.12) */ }
  if (!res.ok) {
    if (res.status === 401 && autenticada) window.dispatchEvent(new CustomEvent('sessao-expirada'));
    throw new ApiError(res.status, json?.mensagem || json?.message || 'Falha na requisição.', json);
  }
  return json;
}

// Rotas assumidas até a publicação do contrato v2.0 (item 3.10). Centralizadas aqui para ajustar em um ponto só.
// As rotas abaixo seguem o contrato assumido; ajustar aqui quando a API v2.0 (item 3.10) for publicada.
export const api = {
  login: (email, senha) => chamar('POST', '/auth/login', { email, senha }, { autenticada: false }),
  sessao: () => chamar('GET', '/auth/sessao', undefined, { autenticada: false }).catch(e => (e.status === 401 ? null : Promise.reject(e))),
  logout: () => chamar('POST', '/auth/logout'),
  checkinAtual: () => chamar('GET', '/checkins/atual'),
  enviarCheckin: d => chamar('PUT', '/checkins/atual', d),
  historicoPessoal: () => chamar('GET', '/checkins/historico'),
  painel: () => chamar('GET', '/painel'),
  alertas: () => chamar('GET', '/alertas'),
  tratarAlerta: (id, d) => chamar('POST', `/alertas/${id}/tratamento`, d),
  metas: () => chamar('GET', '/metas'),
  criarMeta: m => chamar('POST', '/metas', m),
  progressoPendente: () => chamar('GET', '/progresso?pendente=1'),
  validarProgresso: (id, d) => chamar('POST', `/progresso/${id}/validacao`, d),
  pessoas: () => chamar('GET', '/pessoas'),
  criarPessoa: p => chamar('POST', '/pessoas', p),
  desligarPessoa: id => chamar('POST', `/pessoas/${id}/desligamento`),
  formulario: () => chamar('GET', '/formulario-checkin'),
  salvarFormulario: f => chamar('PUT', '/formulario-checkin', f),
  parametros: () => chamar('GET', '/parametros'),
  salvarParametros: p => chamar('PUT', '/parametros', p),
  relatorios: () => chamar('GET', '/relatorios/agregados'),
  perfis: () => chamar('GET', '/pessoas'),
  alterarPerfil: (id, perfil) => chamar('PUT', `/pessoas/${id}/perfil`, { perfil }),
  log: () => chamar('GET', '/log-acesso')
};

