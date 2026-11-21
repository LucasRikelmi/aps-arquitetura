// TL-16 Log de acesso
import { h, tabela } from '../dom.js';
import { api } from '../api.js';

export async function telaLog() {
  const linhas = await api.log();
  return h('section', null,
    h('h1', null, 'Log de acesso'),
    h('p', { class: 'sub' }, 'Cada acesso negado a recurso de terceiro aparece como negado (404).'),
    tabela({
      legenda: 'Registro de acessos',
      colunas: [
        { rotulo: 'Quando', celula: l => l.quando },
        { rotulo: 'Quem', celula: l => l.usuario },
        { rotulo: 'Recurso', celula: l => l.recurso },
        { rotulo: 'Resultado', celula: l => (l.resultado.startsWith('negado') ? `✕ ${l.resultado}` : `✓ ${l.resultado}`) }
      ],
      linhas
    }));
}
