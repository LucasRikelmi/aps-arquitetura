// TL-10 Validar progresso
import { h, botao, aviso, tabela, focarAviso } from '../dom.js';
import { api } from '../api.js';
import { dialogoValor } from '../componentes/dialogo-valor.js';

export async function telaProgresso() {
  const itens = await api.progressoPendente();
  const lista = h('div');
  const desenhar = () => {
    lista.replaceChildren(itens.length === 0 ? aviso('info', 'Nada a validar', 'Os autorrelatos de progresso aparecem aqui.') :
      tabela({
        legenda: 'Progresso informado pelas pessoas',
        colunas: [
          { rotulo: 'Pessoa', celula: p => p.pessoa },
          { rotulo: 'Meta', celula: p => p.meta },
          { rotulo: 'Progresso', celula: p => `${p.valor}%` },
          { rotulo: 'Origem', celula: p => h('span', { class: 'rotulo-origem' }, p.origem) },
          { rotulo: 'Ação', celula: p => p.validado ? '✓ Concluído' : h('div', { class: 'linha-botoes' },
            botao('Validar', { variante: 'secundario', 'aria-label': `Validar progresso de ${p.pessoa}`, onClick: () => decidir(p, 'validar') }),
            botao('Ajustar', { variante: 'secundario', 'aria-label': `Ajustar progresso de ${p.pessoa}`, onClick: () => ajustar(p) })) }
        ],
        linhas: itens
      }));
  };
  async function decidir(p, decisao, valor) {
    try {
      Object.assign(p, await api.validarProgresso(p.id, { decisao, valor }));
      desenhar();
      lista.prepend(aviso('ok', decisao === 'ajustar' ? 'Progresso ajustado' : 'Progresso validado', `${p.pessoa}: ${p.valor}% (${p.origem}).`));
      focarAviso(lista);
    } catch { lista.prepend(aviso('erro', 'Não foi possível registrar a validação')); focarAviso(lista); }
  }
  async function ajustar(p) {
    const n = await dialogoValor({ titulo: `Ajustar progresso de ${p.pessoa}`, rotulo: 'Novo progresso (%)', valor: p.valor, rotuloOk: 'Salvar ajuste' });
    if (n != null) decidir(p, 'ajustar', n);
  }
  desenhar();
  return h('section', null, h('h1', null, 'Validar progresso'),
    h('p', { class: 'sub' }, 'Todo valor mostra sua origem: autorrelato, validado ou ajustado pelo gestor.'), lista);
}
