// TL-09 Cadastrar meta (+ estados "erro" e "salvo")
import { h, preencher, campo, botao, aviso, focarAviso, anunciar } from '../dom.js';
import { api } from '../api.js';

const UNIDADES = ['horas', '%', 'unidades', 'processos', 'R$'];

export async function telaMetaNova(ctx) {
  const equipe = await api.equipe(); // o servidor devolve só a equipe do gestor (UC02)
  const form = h('form', { novalidate: true, class: 'cartao' });
  const desenhar = (v = {}, erros = {}, salvo = false) => {
    const n = Object.keys(erros).length;
    preencher(form,
      n ? aviso('erro', 'Revise os campos', Object.values(erros).join(' ')) : null, // estado "TL-09 erro"
      salvo ? aviso('ok', 'Meta salva', 'A meta aparece em Metas, na lista da equipe.') : null, // estado "TL-09 salvo"
      campo({ rotulo: 'Título da meta', nome: 'titulo', valor: v.titulo || '', obrigatorio: true, erro: erros.titulo }),
      campo({ rotulo: 'Descrição', nome: 'descricao', tipo: 'textarea', valor: v.descricao || '' }),
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Responsável', nome: 'responsavel', valor: v.responsavel || '', obrigatorio: true, erro: erros.responsavel, ajuda: 'Só aparecem pessoas da sua equipe.',
          opcoes: [{ valor: '', texto: 'Selecione' }, ...equipe.map(p => ({ valor: p.nome, texto: p.nome }))] }),
        campo({ rotulo: 'Indicador de acompanhamento', nome: 'indicador', valor: v.indicador || '', obrigatorio: true, erro: erros.indicador }),
        campo({ rotulo: 'Valor alvo', nome: 'valorAlvo', tipo: 'number', valor: v.valorAlvo || '', erro: erros.valorAlvo })),
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Unidade de medida', nome: 'unidade', valor: v.unidade || UNIDADES[0], opcoes: UNIDADES.map(u => ({ valor: u, texto: u })) }),
        campo({ rotulo: 'Data de início', nome: 'inicio', tipo: 'date', valor: v.inicio || '', obrigatorio: true, erro: erros.inicio }),
        campo({ rotulo: 'Prazo', nome: 'prazo', tipo: 'date', valor: v.prazo || '', obrigatorio: true, erro: erros.prazo })),
      h('div', { class: 'acoes' }, botao('Salvar meta', { tipo: 'submit' }), h('a', { class: 'btn btn-secundario', href: '#metas' }, 'Cancelar')),
      h('p', { class: 'nota' }, 'Validação de início posterior ao prazo é proposta do grupo (P02) e ainda depende de confirmação do RH.'));
    if (n || salvo) focarAviso(form);
  };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const erros = {};
    if (!v.titulo?.trim()) erros.titulo = 'Informe o título da meta.';
    if (!v.responsavel) erros.responsavel = 'Escolha o responsável.';
    if (!v.indicador?.trim()) erros.indicador = 'Informe o indicador de acompanhamento.';
    if (v.valorAlvo !== '' && !(Number(v.valorAlvo) >= 0)) erros.valorAlvo = 'O valor alvo deve ser um número positivo.';
    if (!v.inicio) erros.inicio = 'Informe a data de início.';
    if (!v.prazo) erros.prazo = 'Informe o prazo.';
    else if (v.inicio && v.prazo < v.inicio) erros.prazo = 'O prazo não pode ser anterior ao início.';
    if (Object.keys(erros).length) { desenhar(v, erros); return; }
    try { await api.criarMeta({ ...v, valorAlvo: v.valorAlvo === '' ? null : Number(v.valorAlvo) }); desenhar({}, {}, true); anunciar('Meta salva.'); }
    catch (e) { desenhar(v); form.prepend(aviso('erro', 'Não foi possível salvar', e.status === 422 ? e.message : 'Tente novamente.')); focarAviso(form); }
  });
  desenhar();
  return h('section', null, h('a', { class: 'link-voltar', href: '#metas' }, 'Voltar às metas'), h('h1', null, 'Cadastrar meta'), form);
}
