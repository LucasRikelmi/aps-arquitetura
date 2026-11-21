// TL-06 Painel da equipe
import { h, tabela } from '../dom.js';
import { api } from '../api.js';
import { ROTULO_HUMOR } from '../dominio.js';
import { barraProgresso } from '../componentes/barra-progresso.js';

export async function telaPainel() {
  const p = await api.painel();
  const comAlerta = p.equipe.filter(m => m.alertas > 0).length;
  const semCheckin = p.equipe.filter(m => m.humor == null).length;
  return h('section', null,
    h('h1', null, 'Painel da equipe'),
    h('p', { class: 'sub' }, `Semana ${p.semana}`),
    h('ul', { class: 'resumo-cartoes' },
      h('li', { class: 'cartao-mini' }, h('strong', null, p.equipe.length), h('span', null, 'pessoas na equipe')),
      h('li', { class: 'cartao-mini' }, h('strong', null, comAlerta), h('span', null, 'com alerta aberto')),
      h('li', { class: 'cartao-mini' }, h('strong', null, semCheckin), h('span', null, 'sem check-in na semana'))),
    tabela({
      legenda: 'Situação da equipe na semana',
      colunas: [
        { rotulo: 'Pessoa', celula: m => m.nome },
        { rotulo: 'Humor', celula: m => m.humor == null ? 'Sem resposta' : `${m.humor} · ${ROTULO_HUMOR[m.humor]}${m.humor <= 2 ? ' (atenção)' : ''}` },
        { rotulo: 'Carga', celula: m => m.carga ?? 'Sem resposta' },
        { rotulo: 'Progresso das metas', celula: m => barraProgresso(m.progresso, `Progresso de ${m.nome}`) },
        { rotulo: 'Alertas', celula: m => m.alertas ? `${m.alertas} aberto` : 'Nenhum' }
      ],
      linhas: p.equipe
    }),
    h('p', { class: 'ajuda' }, h('a', { href: '#/alertas' }, 'Ver e tratar alertas')));
}
