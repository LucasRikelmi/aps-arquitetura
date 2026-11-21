// TL-12 Formulário de check-in (perguntas complementares, UC10)
import { h, preencher, campo, botao, aviso, tabela, selo, pedirTexto, anunciar, focarAviso } from '../dom.js';
import { api } from '../api.js';

export async function telaFormulario() {
  let perguntas = await api.formulario();
  const form = h('form', { novalidate: true, class: 'cartao' });
  const tabelaSlot = h('div');
  const avisoSlot = h('div', { 'aria-live': 'polite' });

  const desenharForm = (v = {}, erro = '') => {
    preencher(form,
      h('h2', null, 'Nova pergunta'),
      erro ? aviso('erro', 'Revise o formulário', erro) : null,
      campo({ rotulo: 'Texto da pergunta', nome: 'texto', valor: v.texto || '', obrigatorio: true, erro, ajuda: 'Entra no check-in da semana seguinte.' }),
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Tipo de resposta', nome: 'tipo', valor: v.tipo || 'Texto', opcoes: ['Texto', 'Opção'].map(x => ({ valor: x, texto: x })) }),
        campo({ rotulo: 'Resposta', nome: 'resposta', valor: v.resposta || 'opcional', opcoes: [{ valor: 'opcional', texto: 'Opcional' }, { valor: 'obrigatória', texto: 'Obrigatória' }] }),
        campo({ rotulo: 'Ordem no formulário', nome: 'ordem', tipo: 'number', valor: v.ordem || '' })),
      h('p', { class: 'nota' }, 'Campos conforme PERGUNTA_COMPLEMENTAR do modelo ER. Pergunta obrigatória alonga o check-in; usar com cuidado (RNF03).'),
      botao('Adicionar pergunta', { tipo: 'submit' }));
    if (erro) focarAviso(form);
  };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    if (!v.texto?.trim()) { desenharForm(v, 'Informe o texto da pergunta.'); return; }
    try {
      await api.criarPergunta({ ...v, ordem: v.ordem === '' ? null : Number(v.ordem) });
      perguntas = await api.formulario(); desenharForm(); desenharTabela();
      avisoSlot.replaceChildren(aviso('ok', 'Pergunta adicionada', 'Ela entra no próximo check-in.')); focarAviso(avisoSlot); anunciar('Pergunta adicionada.');
    } catch { desenharForm(v, 'Não foi possível adicionar. Tente novamente.'); }
  });

  async function alterar(q) {
    const texto = await pedirTexto({ titulo: 'Alterar texto da pergunta', rotulo: 'Novo texto', valor: q.texto });
    if (!texto || texto === q.texto) return;
    try { await api.alterarPergunta(q.id, texto); perguntas = await api.formulario(); desenharTabela(); avisoSlot.replaceChildren(aviso('ok', 'Pergunta nova criada', 'A anterior foi inativada; as respostas antigas continuam ligadas ao texto original.')); focarAviso(avisoSlot); }
    catch { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível alterar', 'Tente novamente.')); focarAviso(avisoSlot); }
  }
  async function inativar(q) {
    try { await api.inativarPergunta(q.id); perguntas = await api.formulario(); desenharTabela(); avisoSlot.replaceChildren(aviso('ok', 'Pergunta inativada', 'As respostas já dadas foram preservadas.')); focarAviso(avisoSlot); }
    catch { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível inativar', 'Tente novamente.')); focarAviso(avisoSlot); }
  }
  function desenharTabela() {
    preencher(tabelaSlot, tabela({
      legenda: 'Perguntas complementares',
      colunas: [
        { rotulo: 'Pergunta', celula: q => q.texto },
        { rotulo: 'Tipo', celula: q => `${q.tipo} · ${q.resposta}` },
        { rotulo: 'Situação', celula: q => q.ativa ? selo('Ativa', 'ok') : selo('Inativa · respostas preservadas') },
        { rotulo: 'Respostas', celula: q => q.respostas.toLocaleString('pt-BR') },
        { rotulo: 'Ações', celula: q => q.ativa ? [
          botao('Alterar texto', { variante: 'secundario', 'aria-label': `Alterar texto de: ${q.texto}`, onClick: () => alterar(q) }),
          botao('Inativar', { variante: 'secundario', 'aria-label': `Inativar: ${q.texto}`, onClick: () => inativar(q) })] : '' }
      ],
      linhas: perguntas
    }));
  }
  desenharForm(); desenharTabela();
  return h('section', null,
    h('h1', null, 'Formulário de check-in'),
    h('p', { class: 'sub' }, 'Humor, carga, progresso e comentário são fixos. Aqui o RH mantém as perguntas complementares.'),
    avisoSlot, form, tabelaSlot,
    aviso('aviso', null, 'Alterar o texto cria uma pergunta nova e inativa a anterior; respostas antigas continuam ligadas ao texto original (ERS 1.2).'));
}
