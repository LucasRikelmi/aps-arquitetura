// TL-09 Cadastrar meta (+ estados "erro" e "salvo")
import { h, preencher, campo, botao, aviso, focarAviso } from '../dom.js';
import { api } from '../api.js';

export async function telaMetaNova(ctx) {
  const form = h('form', { novalidate: true, class: 'cartao' });
  const slot = h('div');
  const desenhar = (v = {}, erros = {}, salvo = false) => {
    const n = Object.keys(erros).length;
    preencher(form, 
      n ? aviso('erro', 'Revise os campos', Object.values(erros).join(' ')) : null, // estado "TL-09 erro"
      salvo ? aviso('ok', 'Meta salva', 'A meta aparece na lista da equipe.') : null, // estado "TL-09 salvo"
      campo({ rotulo: 'Meta', nome: 'titulo', valor: v.titulo || '', obrigatorio: true, erro: erros.titulo }),
      campo({ rotulo: 'Responsável', nome: 'responsavel', valor: v.responsavel || '', obrigatorio: true, erro: erros.responsavel,
        opcoes: [{ valor: '', texto: 'Selecione' }, ...['Ana Souza', 'Bruno Matos', 'Lívia Cardoso', 'Davi Nunes'].map(x => ({ valor: x, texto: x }))] }),
      campo({ rotulo: 'Início', nome: 'inicio', tipo: 'date', valor: v.inicio || '', obrigatorio: true, erro: erros.inicio }),
      campo({ rotulo: 'Prazo', nome: 'prazo', tipo: 'date', valor: v.prazo || '', obrigatorio: true, erro: erros.prazo }),
      campo({ rotulo: 'Indicador', nome: 'indicador', valor: v.indicador || '', obrigatorio: true, erro: erros.indicador, ajuda: 'Como o progresso será medido.' }),
      h('div', { class: 'acoes' }, botao('Salvar meta', { tipo: 'submit' }), h('a', { class: 'btn btn-secundario', href: '#metas' }, 'Voltar')));
    if (n || salvo) focarAviso(form);
  };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const erros = {};
    if (!v.titulo?.trim()) erros.titulo = 'Informe a meta.';
    if (!v.responsavel) erros.responsavel = 'Escolha o responsável.';
    if (!v.inicio) erros.inicio = 'Informe a data de início.';
    if (!v.prazo) erros.prazo = 'Informe o prazo.';
    else if (v.inicio && v.prazo < v.inicio) erros.prazo = 'O prazo não pode ser anterior ao início.';
    if (!v.indicador?.trim()) erros.indicador = 'Informe o indicador.';
    if (Object.keys(erros).length) { desenhar(v, erros); return; }
    try { await api.criarMeta(v); desenhar({}, {}, true); }
    catch (e) { desenhar(v, {}); form.prepend(aviso('erro', 'Não foi possível salvar', 'Tente novamente.')); }
  });
  desenhar();
  return h('section', null, h('h1', null, 'Cadastrar meta'), slot, form);
}
