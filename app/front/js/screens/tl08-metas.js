// TL-08 Metas da equipe
import { h, aviso, tabela, selo } from '../dom.js';
import { api } from '../api.js';
import { fmtData } from '../dominio.js';
import { barraProgresso } from '../componentes/barra-progresso.js';

const tipoSituacao = s => (s.includes('vencido') ? 'aviso' : s.includes('risco') ? 'aviso' : s === 'Concluída' ? 'ok' : 'neutro');

export async function telaMetas() {
  const metas = await api.metas();
  return h('section', null,
    h('div', { class: 'cabecalho-acao' },
      h('div', null, h('h1', null, 'Metas da equipe'), h('p', { class: 'sub' }, 'Operações · somente metas de pessoas da sua equipe')),
      h('a', { class: 'btn btn-primario', href: '#metas-nova' }, 'Cadastrar meta')),
    metas.length === 0 ? aviso('info', 'Ainda não há metas', 'Use "Cadastrar meta" para criar a primeira.') :
    tabela({
      legenda: 'Metas da equipe',
      colunas: [
        { rotulo: 'Meta', celula: m => m.titulo },
        { rotulo: 'Responsável', celula: m => m.responsavel },
        { rotulo: 'Início', celula: m => fmtData(m.inicio) },
        { rotulo: 'Prazo', celula: m => fmtData(m.prazo) },
        { rotulo: 'Indicador', celula: m => m.indicador },
        { rotulo: 'Progresso', celula: m => h('div', { class: 'barra-origem' }, barraProgresso(m.progresso, `Progresso de ${m.titulo}`), h('span', { class: 'ajuda' }, m.origem)) },
        { rotulo: 'Situação', celula: m => selo(m.situacao, tipoSituacao(m.situacao)) },
        { rotulo: 'Ações', celula: m => m.validavel ? h('a', { class: 'btn btn-secundario', href: `#validar?id=${m.id}`, 'aria-label': `Validar progresso de ${m.titulo}` }, 'Validar') : '' }
      ],
      linhas: metas
    }),
    h('p', { class: 'nota' }, 'Situação segue o domínio da entidade META (em andamento, concluída, cancelada). Prazo vencido e risco são sinais derivados, não situação.'),
    h('p', { class: 'nota' }, 'Cadastrar meta não é avaliação de desempenho. O sistema não gera nota, ranking nem comparação entre pessoas.'));
}
