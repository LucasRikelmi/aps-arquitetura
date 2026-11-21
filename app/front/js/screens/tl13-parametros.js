// TL-13 Parâmetros do sistema (UC16)
import { h, preencher, campo, botao, aviso, focarAviso, anunciar } from '../dom.js';
import { api } from '../api.js';

const DIA_HORA = /^(Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo), ([01]\d|2[0-3]):[0-5]\d$/;
const LIMIARES = [
  ['humorAte', 'Humor baixo com meta atrasada', 'humor até', '', 'RF07 · HU-08'],
  ['semanasSemResposta', 'Sem resposta consecutiva', '', 'semanas', 'RF07 · HU-08'],
  ['cargaPesadaSemanas', 'Carga pesada recorrente', '', 'em 8 semanas', 'RF06 · RB-02 (ratificar)'],
  ['metaRiscoProgresso', 'Meta em risco', '75% do prazo e progresso abaixo de', '%', 'RF07 · ERS 1.2 (ratificar)']
];

export async function telaParametros() {
  const p = await api.parametros();
  const form = h('form', { novalidate: true });
  const desenhar = (v = p, erros = {}) => {
    const n = Object.keys(erros).length;
    preencher(form,
      n ? aviso('erro', 'Revise os campos', Object.values(erros).join(' ')) : null,
      h('div', { class: 'cartao' }, h('h2', null, 'Aviso de visibilidade do check-in'),
        campo({ rotulo: 'Texto exibido ao colaborador', nome: 'textoVisibilidade', tipo: 'textarea', valor: v.textoVisibilidade, obrigatorio: true, erro: erros.textoVisibilidade, ajuda: 'Deve explicar os três níveis: gestor direto, RH e Diretoria.' })),
      h('div', { class: 'cartao' }, h('h2', null, 'Janela do check-in'),
        h('div', { class: 'grade-campos' },
          campo({ rotulo: 'Abre', nome: 'abre', valor: v.abre, obrigatorio: true, erro: erros.abre, ajuda: 'Formato: Segunda, 08:00.' }),
          campo({ rotulo: 'Fecha', nome: 'fecha', valor: v.fecha, obrigatorio: true, erro: erros.fecha, ajuda: 'Formato: Sexta, 18:00.' }),
          (() => { const c = campo({ rotulo: 'Fuso', nome: 'fuso', valor: v.fuso, obrigatorio: true }); c.querySelector('input').readOnly = true; return c; })())),
      h('div', { class: 'cartao' }, h('h2', null, 'Limiares de alerta'),
        h('div', { class: 'grade-campos' }, LIMIARES.map(([k, rotulo, antes, depois, origem]) =>
          campo({ rotulo: `${rotulo}${antes ? ` (${antes})` : ''}`, nome: k, tipo: 'number', valor: String(v[k]), obrigatorio: true, erro: erros[k], ajuda: `${depois ? `Unidade: ${depois}. ` : ''}Origem: ${origem}.` })))),
      h('div', { class: 'cartao' }, h('h2', null, 'Retenção de dados'),
        h('div', { class: 'grade-campos' },
          campo({ rotulo: 'Log de acesso', nome: 'retencaoLog', valor: v.retencaoLog, obrigatorio: true, ajuda: 'Prazo documentado, sujeito à ratificação.' }),
          campo({ rotulo: 'Check-ins e ações', nome: 'retencaoCheckins', valor: v.retencaoCheckins, obrigatorio: true }))),
      h('div', { class: 'acoes' }, botao('Salvar parâmetros', { tipo: 'submit' }), h('span', { class: 'ajuda' }, 'Cada alteração fica registrada com autor e data.')));
    if (n) focarAviso(form);
  };
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form)); d.fuso = p.fuso;
    for (const [k] of LIMIARES) d[k] = Number(d[k]);
    const erros = {};
    if (!d.textoVisibilidade.trim()) erros.textoVisibilidade = 'Informe o texto de visibilidade.';
    if (!DIA_HORA.test(d.abre)) erros.abre = 'Use o formato "Segunda, 08:00".';
    if (!DIA_HORA.test(d.fecha)) erros.fecha = 'Use o formato "Sexta, 18:00".';
    for (const [k, r] of LIMIARES) if (!Number.isInteger(d[k]) || d[k] < 1) erros[k] = `${r}: informe um número inteiro maior que zero.`;
    if (Object.keys(erros).length) { desenhar(d, erros); return; }
    try { await api.salvarParametros(d); Object.assign(p, d); desenhar(d); form.prepend(aviso('ok', 'Parâmetros salvos', 'A alteração foi registrada com autor e data.')); focarAviso(form); anunciar('Parâmetros salvos.'); }
    catch { desenhar(d); form.prepend(aviso('erro', 'Não foi possível salvar', 'Tente novamente.')); focarAviso(form); }
  });
  desenhar();
  return h('section', null, h('h1', null, 'Parâmetros do sistema'), h('p', { class: 'sub' }, 'Nenhum parâmetro desta tela amplia permissões de acesso.'), form);
}
