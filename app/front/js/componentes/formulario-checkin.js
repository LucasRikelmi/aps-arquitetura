// Formulário do check-in semanal (TL-02, TL-03): validação, estados "erro" e "enviado", edição na janela.
import { h, preencher, campo, grupoRadio, botao, aviso, anunciar, focarAviso } from '../dom.js';
import { api, ApiError } from '../api.js';
import { HUMOR, ROTULO_HUMOR, CARGA, fmtData } from '../dominio.js';

export function formularioCheckin(ctx, dados) {
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
        opcoes: HUMOR.map(([v, t]) => ({ valor: v, texto: t })), erro: erros.humor ? 'Selecione como você se sentiu (obrigatório)' : '' }),
      grupoRadio({ legenda: '2. Como esteve sua carga de trabalho?', nome: 'carga', obrigatorio: true, valor: valores.carga,
        opcoes: CARGA.map(c => ({ valor: c, texto: '' })), erro: erros.carga ? 'Selecione sua carga de trabalho (obrigatório)' : '' }),
      h('fieldset', { class: 'grupo' },
        h('legend', null, '3. Progresso das suas metas'),
        dados.metas.length === 0 ? h('p', { class: 'ajuda' }, 'Você não tem metas ativas nesta semana.') :
        dados.metas.map(m => {
          const id = `meta-${m.id}`;
          const saida = h('output', { for: id, class: 'valor-slider' }, `${valores.metas[m.id]}%`);
          return h('div', { class: 'meta-linha' },
            h('label', { for: id }, m.titulo, h('span', { class: 'prazo' }, ` · prazo ${fmtData(m.prazo)}`)),
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
    if (lista.length) focarAviso(form);
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
      const r = await api.enviarCheckin({ humor: Number(valores.humor), carga: valores.carga, obstaculo: valores.obstaculo, comentario: valores.comentario, metas: valores.metas });
      // estado "TL-02 enviado" (Figma: selo com data e hora, resumo das respostas, Ver meu histórico, Editar check-in)
      const ou = v => (String(v || '').trim() ? v : 'não informado');
      const metas = dados.metas.map(m => `${m.titulo} ${valores.metas[m.id]}%`).join(' · ');
      preencher(form,
        aviso('ok', r?.enviadoEm ? `Check-in enviado em ${r.enviadoEm}` : 'Check-in enviado', ''),
        h('h2', null, 'Resumo das suas respostas'),
        h('dl', { class: 'resumo' },
          h('dt', null, 'Humor da semana'), h('dd', null, `${valores.humor} · ${ROTULO_HUMOR[valores.humor]}`),
          h('dt', null, 'Carga de trabalho'), h('dd', null, valores.carga),
          dados.metas.length ? [h('dt', null, 'Metas'), h('dd', null, metas)] : null,
          h('dt', null, 'Algo está atrapalhando'), h('dd', null, ou(valores.obstaculo)),
          h('dt', null, 'Comentário'), h('dd', null, ou(valores.comentario))),
        h('p', { class: 'nota' }, `Você pode editar as respostas até o fechamento da janela${dados.limite ? `, ${dados.limite}` : ''}.`),
        h('div', { class: 'acoes' },
          h('a', { class: 'btn btn-primario', href: '#historico' }, 'Ver meu histórico'),
          botao('Editar check-in', { variante: 'secundario', onClick: () => { dados.enviado = { ...valores }; desenhar(); form.querySelector('input')?.focus(); } })));
      focarAviso(form);
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
