// TL-16 Log de acesso (somente leitura)
import { h, tabela, selo, campo } from '../dom.js';
import { api } from '../api.js';

export async function telaLog(ctx) {
  const f = ctx.params;
  const linhas = await api.log(f);
  const form = h('form', { class: 'cartao filtros' },
    campo({ rotulo: 'Ator', nome: 'ator', valor: f.ator || '', marca: false }),
    campo({ rotulo: 'Ação', nome: 'acao', valor: f.acao || '', opcoes: [['', 'Todas'], ['Consulta', 'Consulta'], ['Exportação', 'Exportação'], ['Alteração de perfil', 'Alteração de perfil'], ['Desligamento', 'Desligamento']].map(([valor, texto]) => ({ valor, texto })), marca: false }),
    campo({ rotulo: 'Resultado', nome: 'resultado', valor: f.resultado || '', opcoes: [['', 'Todos'], ['Permitido', 'Permitido'], ['Negado', 'Negado']].map(([valor, texto]) => ({ valor, texto })), marca: false }),
    campo({ rotulo: 'Período', nome: 'dias', valor: f.dias || '7', opcoes: [['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['180', 'Últimos 6 meses']].map(([valor, texto]) => ({ valor, texto })), marca: false }));
  form.addEventListener('submit', ev => ev.preventDefault());
  form.addEventListener('change', () => {
    const d = new URLSearchParams([...new FormData(form)].filter(([, v]) => v));
    ctx.navegar(`log${d.size ? `?${d}` : ''}`);
  });
  return h('section', null,
    h('div', { class: 'cab-semana' },
      h('div', null, h('h1', null, 'Log de acesso'), h('p', { class: 'sub' }, 'Somente leitura. Registros dos últimos 6 meses; o que passou desse prazo já foi expurgado e não pode ser reconstruído.')),
      selo('Sem edição ou exclusão', 'info')),
    form,
    linhas.length === 0 ? h('p', { class: 'nota' }, 'Nenhum registro para os filtros escolhidos.') :
    tabela({
      legenda: 'Registros de acesso',
      colunas: [
        { rotulo: 'Data e hora', celula: l => l.quando },
        { rotulo: 'Ator', celula: l => l.ator },
        { rotulo: 'Perfil', celula: l => l.perfil },
        { rotulo: 'Recurso', celula: l => l.recurso },
        { rotulo: 'Ação', celula: l => l.acao },
        { rotulo: 'Resultado', celula: l => selo(l.resultado, l.resultado === 'Negado' ? 'erro' : 'ok') }
      ],
      linhas
    }),
    h('p', { class: 'nota' }, 'O recurso aparece como identificador. Consultar o log não abre check-ins, comentários ou ações referenciados. RH e gestor não têm acesso a esta tela.'));
}
