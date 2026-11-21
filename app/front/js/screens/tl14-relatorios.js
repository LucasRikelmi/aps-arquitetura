// TL-14 Relatórios agregados
import { h, tabela } from '../dom.js';
import { api } from '../api.js';

export async function telaRelatorios(ctx) {
  const linhas = await api.relatorios();
  const diretoria = ctx.sessao.perfil === 'diretoria';
  return h('section', null,
    h('h1', null, 'Relatórios agregados'),
    h('p', { class: 'sub' }, diretoria ? 'Médias por departamento, sem identificar pessoas.' : 'Indicadores agregados do seu escopo.'),
    tabela({
      legenda: 'Indicadores por departamento',
      colunas: [
        { rotulo: 'Departamento', celula: l => l.departamento },
        { rotulo: 'Pessoas', celula: l => l.pessoas },
        { rotulo: 'Humor médio (1 a 5)', celula: l => l.humor.toFixed(1).replace('.', ',') },
        { rotulo: 'Carga pesada', celula: l => `${l.cargaPesada}%` },
        { rotulo: 'Progresso médio das metas', celula: l => `${l.progresso}%` }
      ],
      linhas
    }));
}
