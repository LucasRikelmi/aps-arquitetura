// TL-08 Metas da equipe
import { h, aviso, tabela, confirmar } from '../dom.js';
import { api } from '../api.js';
import { fmtData } from '../dominio.js';
import { barraProgresso } from '../componentes/barra-progresso.js';

export async function telaMetas() {
  const metas = await api.metas();
  return h('section', null,
    h('h1', null, 'Metas da equipe'),
    h('div', { class: 'barra-acao' }, h('a', { class: 'btn btn-primario', href: '#/metas/nova' }, 'Cadastrar meta')),
    metas.length === 0
      ? aviso('info', 'Nenhuma meta cadastrada', 'Cadastre a primeira meta para acompanhar o progresso da equipe.') // estado vazio: confirmar na ficha do UC02 ext. 1a
      : tabela({
        legenda: 'Metas da equipe',
        colunas: [
          { rotulo: 'Meta', celula: m => m.titulo },
          { rotulo: 'Responsável', celula: m => m.responsavel },
          { rotulo: 'Prazo', celula: m => fmtData(m.prazo) },
          { rotulo: 'Indicador', celula: m => m.indicador },
          { rotulo: 'Progresso', celula: m => barraProgresso(m.progresso, `Progresso de ${m.titulo}`) }
        ],
        linhas: metas
      }));
}
