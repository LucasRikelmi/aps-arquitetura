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
    throw new ApiError(res.status, json?.mensagem || json?.message || 'Falha na requisição.', json, res.headers.get('Retry-After'));
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
  painel: escopo => chamar('GET', `/painel${escopo ? `?escopo=${encodeURIComponent(escopo)}` : ''}`),
  alerta: id => chamar('GET', `/alertas/${encodeURIComponent(id)}`),
  tratarAlerta: (id, d) => chamar('POST', `/alertas/${encodeURIComponent(id)}/tratamento`, d),
  equipe: () => chamar('GET', '/equipe'),
  metas: () => chamar('GET', '/metas'),
  meta: id => chamar('GET', `/metas/${encodeURIComponent(id)}`),
  criarMeta: m => chamar('POST', '/metas', m),
  validarMeta: (id, d) => chamar('POST', `/metas/${encodeURIComponent(id)}/validacao`, d),
  pessoas: () => chamar('GET', '/pessoas'),
  criarPessoa: p => chamar('POST', '/pessoas', p),
  desligarPessoa: id => chamar('POST', `/pessoas/${id}/desligamento`),
  registrarAfastamento: a => chamar('POST', '/afastamentos', a),
  alterarPerfis: (id, perfis) => chamar('PUT', `/pessoas/${id}/perfis`, { perfis }),
  formulario: () => chamar('GET', '/formulario-checkin'),
  criarPergunta: q => chamar('POST', '/formulario-checkin/perguntas', q),
  alterarPergunta: (id, texto) => chamar('PUT', `/formulario-checkin/perguntas/${id}`, { texto }),
  inativarPergunta: id => chamar('POST', `/formulario-checkin/perguntas/${id}/inativacao`),
  parametros: () => chamar('GET', '/parametros'),
  salvarParametros: p => chamar('PUT', '/parametros', p),
  relatorios: departamento => chamar('GET', `/relatorios/agregados${departamento ? `?departamento=${encodeURIComponent(departamento)}` : ''}`),
  sincronizacaoFolha: () => chamar('GET', '/sincronizacao-folha'),
  log: filtros => chamar('GET', `/log-acesso${new URLSearchParams(filtros || {}).size ? `?${new URLSearchParams(filtros)}` : ''}`)
};
