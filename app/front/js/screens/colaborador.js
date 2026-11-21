// TL-02 Check-in semanal (+ estados "enviado" e "erro"), TL-03 Check-in no celular,
// TL-04 Janela encerrada, TL-05 Meu histórico.
import { h, preencher, campo, grupoRadio, botao, aviso, tabela, anunciar } from '../dom.js';
import { api, ApiError } from '../api.js';

const HUMOR = [[1, 'Muito mal'], [2, 'Mal'], [3, 'Neutro'], [4, 'Bem'], [5, 'Muito bem']];
const ROTULO_HUMOR = Object.fromEntries(HUMOR);
const CARGA = ['Leve', 'Normal', 'Pesada'];

function formularioCheckin(ctx, dados) {
  const slot = h('div', { class: 'slot' });
  const form = h('form', { novalidate: true, class: 'cartao', 'aria-labelledby': 'cab-checkin' });
  let valores = { humor: '', carga: '', obstaculo: '', comentario: '', metas: {} };
  dados.metas.forEach(m => { valores.metas[m.id] = m.progresso; });
  if (dados.enviado) valores = { ...valores, ...dados.enviado };

  const desenhar = (erros = {}) => {
    const lista = Object.entries(erros);
    preencher(form, 
      lista.length ? aviso('erro', 'Revise o formulário',
        `Falta preencher: ${lista.map(([, m]) => m).join('; ')}.`) : null,
      grupoRadio({ legenda: '1. Como você se sentiu nesta semana?', nome: 'humor', obrigatorio: true, valor: valores.humor,
        opcoes: HUMOR.map(([v, t]) => ({ valor: v, texto: t })), erro: erros.humor ? 'Escolha uma opção de 1 a 5.' : '' }),
      grupoRadio({ legenda: '2. Como esteve sua carga de trabalho?', nome: 'carga', obrigatorio: true, valor: valores.carga,
        opcoes: CARGA.map(c => ({ valor: c, texto: '' })), erro: erros.carga ? 'Escolha leve, normal ou pesada.' : '' }),
      h('fieldset', { class: 'grupo' },
        h('legend', null, '3. Progresso das suas metas'),
        dados.metas.length === 0 ? h('p', { class: 'ajuda' }, 'Você não tem metas ativas nesta semana.') :
        dados.metas.map(m => {
          const id = `meta-${m.id}`;
          const saida = h('output', { for: id, class: 'valor-slider' }, `${valores.metas[m.id]}%`);
          return h('div', { class: 'meta-linha' },
            h('label', { for: id }, m.titulo, h('span', { class: 'prazo' }, ` · prazo ${new Date(m.prazo + 'T12:00').toLocaleDateString('pt-BR')}`)),
            h('div', { class: 'slider' },
              h('input', { type: 'range', id, name: `meta-${m.id}`, min: 0, max: 100, step: 5, value: valores.metas[m.id],
                'aria-valuetext': `${valores.metas[m.id]} por cento`,
                oninput: ev => { valores.metas[m.id] = Number(ev.target.value); saida.textContent = `${ev.target.value}%`; ev.target.setAttribute('aria-valuetext', `${ev.target.value} por cento`); } }),
              saida));
        })),
      campo({ rotulo: '4. Algo está atrapalhando seu trabalho?', nome: 'obstaculo', valor: valores.obstaculo, ajuda: 'Pergunta complementar do RH.' }),
      campo({ rotulo: '5. Comentário', nome: 'comentario', tipo: 'textarea', valor: valores.comentario }),
      h('div', { class: 'acoes' }, botao(dados.enviado ? 'Atualizar check-in' : 'Enviar check-in', { tipo: 'submit' }),
        h('span', { class: 'ajuda' }, 'Leva menos de 1 minuto.')));
    if (lista.length) form.querySelector('[role=alert]')?.setAttribute('tabindex', '-1'), form.querySelector('[role=alert]')?.focus();
  };

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = new FormData(form);
    valores.humor = d.get('humor') || '';
    valores.carga = d.get('carga') || '';
    valores.obstaculo = d.get('obstaculo') || '';
    valores.comentario = d.get('comentario') || '';
    const erros = {};
    if (!valores.humor) erros.humor = 'pergunta 1 (humor)';
    if (!valores.carga) erros.carga = 'pergunta 2 (carga de trabalho)';
    if (Object.keys(erros).length) { desenhar(erros); return; } // estado "TL-02 erro"
    try {
      await api.enviarCheckin({ humor: Number(valores.humor), carga: valores.carga, obstaculo: valores.obstaculo, comentario: valores.comentario, metas: valores.metas });
      // estado "TL-02 enviado"
      preencher(form, 
        aviso('ok', 'Check-in enviado', 'Obrigado. Você pode editar a resposta até o fim da janela.'),
        h('dl', { class: 'resumo' },
          h('dt', null, 'Como se sentiu'), h('dd', null, `${valores.humor} · ${ROTULO_HUMOR[valores.humor]}`),
          h('dt', null, 'Carga de trabalho'), h('dd', null, valores.carga)),
        h('div', { class: 'acoes' }, botao('Editar resposta', { variante: 'secundario', onClick: () => { dados.enviado = { ...valores }; desenhar(); form.querySelector('input')?.focus(); } })));
      form.querySelector('[role=status]').setAttribute('tabindex', '-1');
      form.querySelector('[role=status]').focus();
      anunciar('Check-in enviado.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { ctx.navegar('checkin-encerrado'); return; }
      desenhar();
      form.prepend(aviso('erro', 'Não foi possível enviar', e.status >= 500 || e.status === 0 ? 'O serviço está indisponível. Suas respostas continuam na tela; tente de novo.' : 'Tente novamente.'));
    }
  });
  desenhar();
  slot.append(form);
  return slot;
}

async function telaFormulario(ctx, { celular = false } = {}) {
  const dados = await api.checkinAtual();
  if (!dados.aberta) { ctx.navegar('checkin-encerrado'); return h('section', null, h('h1', null, 'Check-in')); }
  const conteudo = h('section', { class: celular ? 'celular' : '' },
    h('h1', { id: 'cab-checkin' }, `Check-in da semana ${dados.semana}`),
    h('p', { class: 'sub' }, `${dados.periodo} · aberto até ${dados.limite}`),
    aviso('info', 'Quem vê suas respostas', 'Seu gestor direto e o RH veem suas respostas individuais. A Diretoria vê apenas médias por departamento, sem identificar ninguém.'),
    formularioCheckin(ctx, dados));
  if (!celular) return conteudo;
  // TL-03: o mesmo formulário dentro de um quadro de 360 px, para demonstrar o uso no celular (RNF02).
  return h('section', null,
    h('h1', { class: 'sr-only' }, 'Check-in no celular'),
    h('p', { class: 'sub' }, 'Pré-visualização em 360 px de largura. Em um celular real, a tela inteira usa este layout.'),
    h('div', { class: 'quadro-celular' }, conteudo));
}

export const telaCheckin = ctx => telaFormulario(ctx);
export const telaCheckinCelular = ctx => telaFormulario(ctx, { celular: true });

export async function telaJanelaEncerrada() {
  return h('section', { class: 'vazio' },
    h('h1', null, 'Janela do check-in encerrada'),
    aviso('aviso', 'A semana 46 já fechou', 'O prazo terminou na sexta-feira, 13/11, às 18:00 (horário de Brasília). Não é possível enviar ou alterar a resposta.'),
    h('p', null, 'Se precisar registrar esta semana, peça ao RH a reabertura.'),
    h('a', { class: 'btn btn-secundario', href: '#/historico' }, 'Ver meu histórico'));
}

export async function telaHistorico() {
  const linhas = await api.historicoPessoal();
  return h('section', null,
    h('h1', null, 'Meu histórico'),
    h('p', { class: 'sub' }, 'Suas respostas das últimas semanas. Só você e as pessoas indicadas no aviso do check-in veem este conteúdo.'),
    linhas.length === 0 ? aviso('info', 'Ainda não há registros', 'O histórico aparece depois do primeiro check-in.') :
    tabela({
      legenda: 'Histórico de check-ins por semana',
      colunas: [
        { rotulo: 'Semana', celula: l => `Semana ${l.semana}` },
        { rotulo: 'Humor', celula: l => `${l.humor} · ${ROTULO_HUMOR[l.humor]}` },
        { rotulo: 'Carga', celula: l => l.carga },
        { rotulo: 'Progresso das metas', celula: l => `${l.progresso}%` }
      ],
      linhas
    }));
}
