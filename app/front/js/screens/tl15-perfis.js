// TL-15 Perfis de acesso (+ estado "mudança")
import { h, aviso, tabela, confirmar, anunciar, focarAviso } from '../dom.js';
import { api, ApiError } from '../api.js';
import { PERFIS, ROTULO_PERFIL } from '../dominio.js';

export async function telaPerfis(ctx) {
  let pessoas = await api.perfis();
  const avisoSlot = h('div', { 'aria-live': 'polite' });
  const corpo = h('div');
  async function mudar(p, novo) {
    if (novo === p.perfil) return;
    const ok = await confirmar({ titulo: `Mudar o perfil de ${p.nome}?`, texto: `De ${ROTULO_PERFIL[p.perfil]} para ${ROTULO_PERFIL[novo]}. A sessão atual da pessoa é encerrada e ela entra de novo com o perfil novo.`, rotuloOk: 'Mudar perfil' });
    if (!ok) { desenhar(); return; }
    try {
      await api.alterarPerfil(p.id, novo);
      pessoas = await api.perfis();
      desenhar();
      // estado "TL-15 mudança"
      avisoSlot.replaceChildren(aviso('ok', 'Perfil alterado', `${p.nome} agora é ${ROTULO_PERFIL[novo]}. Sessão anterior encerrada.`));
      focarAviso(avisoSlot);
      anunciar('Perfil alterado.');
    } catch (e) { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível alterar', e instanceof ApiError && e.status === 404 ? 'Esta pessoa não está disponível.' : 'Tente novamente.')); desenhar(); }
  }
  function desenhar() {
    corpo.replaceChildren(tabela({
      legenda: 'Perfis de acesso',
      colunas: [
        { rotulo: 'Pessoa', celula: p => p.nome },
        { rotulo: 'E-mail', celula: p => p.email },
        { rotulo: 'Perfil atual', celula: p => ROTULO_PERFIL[p.perfil] },
        { rotulo: 'Novo perfil', celula: p => h('select', { 'aria-label': `Novo perfil de ${p.nome}`, onchange: ev => mudar(p, ev.target.value), disabled: !p.ativo || null },
          PERFIS.map(([v, t]) => h('option', { value: v, selected: v === p.perfil || null }, t))) }
      ],
      linhas: pessoas
    }));
  }
  desenhar();
  return h('section', null, h('h1', null, 'Perfis de acesso'), avisoSlot, corpo);
}
