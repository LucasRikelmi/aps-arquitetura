// TL-05 Meu histórico
import { h, aviso, tabela } from '../dom.js';
import { api } from '../api.js';
import { ROTULO_HUMOR } from '../dominio.js';

export async function telaHistorico() {
  const linhas = await api.historicoPessoal();
  return h('section', null,
    h('h1', null, 'Meu histórico'),
    h('p', { class: 'sub' }, 'Suas respostas das últimas semanas. Só você e as pessoas indicadas no aviso do check-in veem este conteúdo.'),
    linhas.length === 0 ? aviso('info', 'Ainda não há registros', 'O histórico aparece depois do primeiro check-in.') :
    tabela({
      legenda: 'Histórico de check-ins por semana',
      colunas: [
        { rotulo: 'Semana', celula: l => `Semana ${l.semana}` },
        { rotulo: 'Humor', celula: l => `${l.humor} · ${ROTULO_HUMOR[l.humor]}` },
        { rotulo: 'Carga', celula: l => l.carga },
        { rotulo: 'Progresso das metas', celula: l => `${l.progresso}%` }
      ],
      linhas
    }));
}
