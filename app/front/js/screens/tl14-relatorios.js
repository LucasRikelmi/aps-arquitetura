// TL-14 Relatórios agregados (sem identificar pessoas; recortes pequenos são ocultados pelo servidor, RNF06)
import { h, tabela, cartaoMini, selo, campo } from '../dom.js';
import { api } from '../api.js';

export async function telaRelatorios(ctx) {
  const d = await api.relatorios(ctx.params.departamento);
  const dep = campo({ rotulo: 'Departamento', nome: 'departamento', valor: ctx.params.departamento || 'Todos', opcoes: d.departamentos.map(x => ({ valor: x, texto: x })), marca: false });
  dep.querySelector('select').addEventListener('change', ev => ctx.navegar(`relatorios?departamento=${encodeURIComponent(ev.target.value)}`));
  const val = x => (x == null ? '—' : x);
  const exportar = formato => h('a', { class: 'btn btn-secundario', href: `${(window.APP_CONFIG || {}).API_BASE}/relatorios/agregados/exportacao?formato=${formato}`, download: '' }, formato === 'pdf' ? 'Exportar PDF' : 'Exportar Excel');
  return h('section', null,
    h('h1', null, 'Relatórios agregados'),
    h('p', { class: 'sub' }, 'Somente agregados. Nenhuma pessoa é identificada nesta tela.'),
    h('div', { class: 'cartao filtros' },
      dep,
      campo({ rotulo: 'Tipo de período', nome: 'tipo', valor: 'Mês', opcoes: [{ valor: 'Mês', texto: 'Mês' }], marca: false }),
      campo({ rotulo: 'Período', nome: 'periodo', valor: d.periodo, opcoes: [{ valor: d.periodo, texto: d.periodo }], marca: false })),
    h('p', { class: 'nota' }, 'Só períodos fixos (mês ou trimestre). Não há intervalo livre de datas, para impedir dedução de pessoas por diferença entre recortes.'),
    h('ul', { class: 'resumo-cartoes' },
      cartaoMini('Participação média', `${d.resumo.participacao}%`, 'respostas por semana no período'),
      cartaoMini('Humor médio', d.resumo.humor, 'escala de 1 a 5'),
      cartaoMini('Semanas com carga pesada', `${d.resumo.cargaPesada}%`, 'das respostas'),
      cartaoMini('Progresso médio das metas', `${d.resumo.progresso}%`, 'validado quando existe')),
    tabela({
      legenda: 'Indicadores por departamento',
      colunas: [
        { rotulo: 'Departamento', celula: l => l.departamento },
        { rotulo: 'Respondentes', celula: l => l.ocultoPor ? selo(l.ocultoPor, 'info') : val(l.respondentes) },
        { rotulo: 'Participação', celula: l => l.ocultoPor ? '' : `${l.participacao}%` },
        { rotulo: 'Humor médio', celula: l => l.ocultoPor ? '' : l.humor },
        { rotulo: 'Carga pesada', celula: l => l.ocultoPor ? '' : `${l.cargaPesada}%` },
        { rotulo: 'Progresso médio das metas', celula: l => l.ocultoPor ? '' : `${l.progresso}%` }
      ],
      linhas: d.linhas
    }),
    h('p', { class: 'nota' }, 'Recorte com menos de 5 respondentes não é exibido: soma ao departamento superior até atingir o mínimo.'),
    h('div', { class: 'cartao' }, h('h2', null, 'Exportar'), h('div', { class: 'acoes' }, exportar('pdf'), exportar('xlsx'))));
}
