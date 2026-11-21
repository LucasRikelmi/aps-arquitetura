// TL-05 Meu histórico de check-ins
import { h, aviso, tabela, selo } from '../dom.js';
import { api } from '../api.js';
import { ROTULO_HUMOR } from '../dominio.js';

export async function telaHistorico() {
  const linhas = await api.historicoPessoal();
  const vazio = '—';
  return h('section', null,
    h('h1', null, 'Meu histórico de check-ins'),
    h('p', { class: 'sub' }, 'A semana mais recente para a mais antiga. Só você, seu gestor direto e o RH veem estes registros.'),
    linhas.length === 0 ? aviso('info', 'Ainda não há registros', 'O histórico aparece depois do primeiro check-in.') :
    tabela({
      legenda: 'Histórico de check-ins por semana',
      colunas: [
        { rotulo: 'Semana', celula: l => String(l.semana) },
        { rotulo: 'Período', celula: l => l.periodo },
        { rotulo: 'Humor (1 a 5)', celula: l => l.humor == null ? selo('Sem resposta') : `${l.humor} · ${ROTULO_HUMOR[l.humor]}` },
        { rotulo: 'Carga', celula: l => l.humor == null ? '' : l.carga },
        { rotulo: 'Progresso informado', celula: l => l.humor == null ? '' : l.progresso },
        { rotulo: 'Comentário', celula: l => l.humor == null ? '' : (l.comentario || vazio) }
      ],
      linhas
    }),
    h('p', { class: 'nota' }, 'Semana sem check-in aparece como "Sem resposta", não como erro nem como valor zero. Ações registradas pela gestão sobre você não aparecem aqui. O progresso mostrado é o que você informou; a validação do gestor fica separada.'));
}
