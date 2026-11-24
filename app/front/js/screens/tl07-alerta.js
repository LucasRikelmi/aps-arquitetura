// TL-07 Tratar alerta (+ estado "tratado"). O RH só observa (UC15).
import { h, preencher, campo, botao, aviso, selo, focarAviso, anunciar } from '../dom.js';
import { api } from '../api.js';

const MSG_DESCRICAO = 'Informe o que foi feito.';
const TIPOS = ['Conversa individual (1:1)', 'Ajuste de carga', 'Ajuste de prazo da meta', 'Encaminhado ao RH', 'Outra'];

export async function telaAlerta(ctx) {
  const id = ctx.params.id;
  if (!id) { ctx.navegar('painel'); return h('section', null, h('h1', null, 'Alerta')); }
  let a = await api.alerta(id);
  const gestor = ctx.sessao.perfil === 'gestor';
  const acaoSlot = h('div');
  const seloTopo = h('span');
  const seloResp = h('span');
  const desenharSelos = () => {
    const aberto = a.status === 'aberto';
    preencher(seloTopo, selo(aberto ? 'Aberto' : 'Tratado', aberto ? 'aviso' : 'ok'));
    preencher(seloResp, selo(aberto ? 'aberto' : 'tratado', aberto ? 'aviso' : 'ok'));
  };
  desenharSelos();

  // erroCampo: só para a validação da descrição; erro de serviço aparece apenas no aviso do topo.
  const desenharAcao = (v = {}, erro = '', erroCampo = false) => {
    if (a.status === 'tratado') {
      preencher(acaoSlot, h('div', { class: 'cartao' },
        aviso('ok', 'Alerta tratado', `Ação registrada: ${a.acao.tipo}.${a.acao.revisao ? ` Revisão em ${a.acao.revisao.split('-').reverse().join('/')}.` : ''}`),
        h('p', null, a.acao.descricao),
        h('a', { class: 'btn btn-secundario', href: '#painel' }, 'Voltar ao painel')));
      return;
    }
    if (!gestor) { preencher(acaoSlot); return; }
    const form = h('form', { novalidate: true, class: 'cartao' });
    preencher(form,
      h('h2', null, 'Registrar a ação tomada'),
      h('p', { class: 'sub' }, 'Registre depois de conversar ou decidir o acompanhamento. A conversa acontece fora do sistema.'),
      erro ? aviso('erro', 'Revise o formulário', erro) : null,
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Tipo de ação', nome: 'tipo', valor: v.tipo || TIPOS[0], obrigatorio: true, opcoes: TIPOS.map(t => ({ valor: t, texto: t })), ajuda: 'Ajuste de prazo não altera a meta sozinho; a alteração é feita em Metas.' }),
        campo({ rotulo: 'Data de revisão', nome: 'revisao', tipo: 'date', valor: v.revisao || '', ajuda: 'Você recebe um lembrete nessa data.' })),
      campo({ rotulo: 'O que foi feito', nome: 'descricao', tipo: 'textarea', valor: v.descricao || '', obrigatorio: true, erro: erroCampo ? MSG_DESCRICAO : '' }),
      h('div', { class: 'acoes' },
        botao('Registrar ação e marcar como tratado', { tipo: 'submit' }),
        h('a', { class: 'btn btn-secundario', href: '#painel' }, 'Voltar sem registrar')),
      h('p', { class: 'nota' }, 'Voltar sem registrar mantém o alerta aberto: ler o alerta não conta como tratamento. Sem data de revisão, a ação é registrada e nenhum lembrete é criado.'));
    if (erro) setTimeout(() => focarAviso(form), 0);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      if (!dados.descricao?.trim()) { desenharAcao(dados, MSG_DESCRICAO, true); return; }
      try {
        a = await api.tratarAlerta(id, dados);
        desenharSelos();
        desenharAcao(); // estado "TL-07 tratado"
        focarAviso(acaoSlot); anunciar('Alerta tratado.');
      } catch (e) {
        if (e.status === 422) desenharAcao(dados, MSG_DESCRICAO, true);
        else desenharAcao(dados, e.status >= 500 || e.status === 0 ? 'O serviço está indisponível. Tente novamente.' : 'Não foi possível registrar. Tente novamente.');
      }
    });
    preencher(acaoSlot, form);
  };
  desenharAcao();

  return h('section', null,
    h('a', { class: 'link-voltar', href: '#painel' }, 'Voltar ao painel'),
    h('div', { class: 'cab-semana' },
      h('div', null, h('h1', null, `Alerta: ${a.titulo}`),
        h('p', { class: 'sub' }, `${a.pessoa} · Operações · criado em ${a.criado}, ao salvar o check-in da semana ${a.semana} · alerta ${a.codigo}`)),
      seloTopo),
    h('div', { class: 'duas-colunas' },
      h('div', { class: 'cartao' }, h('h2', null, 'Por que este alerta existe'),
        h('p', null, h('strong', null, 'Regra disparada: '), a.regra),
        h('dl', { class: 'resumo' },
          h('dt', null, 'Humor informado'), h('dd', null, a.humor),
          h('dt', null, 'Meta atrasada'), h('dd', null, a.meta),
          h('dt', null, 'Progresso'), h('dd', null, a.progresso),
          h('dt', null, 'Carga'), h('dd', null, a.carga)),
        h('p', { class: 'nota' }, 'O alerta indica necessidade de acompanhamento. Não substitui sua decisão.')),
      h('div', { class: 'cartao' }, h('h2', null, 'Destinatários'),
        h('dl', { class: 'resumo' },
          h('dt', null, 'Responsável'), h('dd', null, 'Rafael Torres, gestor direto ', seloResp),
          h('dt', null, 'Observador'), h('dd', null, 'RH · recebe resumo diário')),
        h('p', { class: 'nota' }, 'O colaborador não vê este alerta nem as ações registradas sobre ele. Diretoria e Administração também não.'))),
    acaoSlot);
}
