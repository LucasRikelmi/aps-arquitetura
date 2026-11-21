// TL-06 Painel da equipe (gestor) / Painel da empresa (RH)
import { h, tabela, cartaoMini, selo, campo } from '../dom.js';
import { api } from '../api.js';
import { barraProgresso } from '../componentes/barra-progresso.js';

export async function telaPainel(ctx) {
  const d = await api.painel(ctx.params.escopo);
  const rh = ctx.sessao.perfil === 'rh';
  const escopo = campo({ rotulo: 'Escopo', nome: 'escopo', valor: ctx.params.escopo || d.escopos[0], opcoes: d.escopos.map(e => ({ valor: e, texto: e })), marca: false });
  escopo.querySelector('select').addEventListener('change', ev => ctx.navegar(`painel?escopo=${encodeURIComponent(ev.target.value)}`));
  return h('section', null,
    h('div', { class: 'cabecalho-acao' },
      h('div', null, h('h1', null, rh ? 'Painel da empresa' : 'Painel da minha equipe'), h('p', { class: 'sub' }, `Semana ${d.semana} · ${d.periodo} · ${d.janela}`)),
      h('div', null, escopo)),
    h('ul', { class: 'resumo-cartoes' },
      cartaoMini('Responderam na semana', `${d.respondentes.responderam} de ${d.respondentes.total}`, `${d.respondentes.total - d.respondentes.responderam} ainda sem resposta`),
      cartaoMini('Humor médio', d.humorMedio, `escala de 1 a 5 · semana anterior ${d.humorAnterior}`),
      cartaoMini('Carga pesada', String(d.cargaPesada), 'pessoas nesta semana'),
      cartaoMini('Alertas abertos', String(d.alertasAbertos), 'aguardando ação do gestor')),
    tabela({
      legenda: 'Pessoas da equipe',
      colunas: [
        { rotulo: 'Pessoa', celula: p => p.nome },
        { rotulo: 'Humor (4 sem.)', celula: p => p.humor.map(x => x ?? '—').join(' · ') },
        { rotulo: 'Carga atual', celula: p => p.carga },
        { rotulo: 'Carga pesada recorrente', celula: p => p.cargaRecorrente || '—' },
        { rotulo: 'Progresso das metas', celula: p => h('div', { class: 'barra-origem' }, barraProgresso(p.progresso, `Progresso de ${p.nome}`), selo(p.origem, p.origem.startsWith('Validado') ? 'ok' : 'neutro')) },
        { rotulo: 'Alerta', celula: p => p.alerta ? selo(p.alerta, 'aviso') : 'Nenhum' },
        { rotulo: 'Ações', celula: p => [
          p.alertaId && h('a', { class: 'btn btn-secundario', href: `#alerta?id=${p.alertaId}`, 'aria-label': `Ver alerta de ${p.nome}` }, 'Ver alerta'),
          !rh && h('a', { class: 'btn btn-secundario', href: '#metas', 'aria-label': `Validar progresso de ${p.nome}` }, 'Validar')] }
      ],
      linhas: d.equipe
    }),
    h('p', { class: 'nota' }, 'Humor das últimas 4 semanas, da mais antiga para a atual. "—" = sem resposta.'));
}
