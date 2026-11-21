// TL-15 Perfis de acesso (+ estado "mudança"). Gestor e Diretoria vêm da estrutura organizacional; RH e Administração são atribuídos aqui.
import { h, preencher, aviso, tabela, confirmar, anunciar, focarAviso } from '../dom.js';
import { api } from '../api.js';

const fmt = iso => iso.split('-').reverse().join('/');

export async function telaPerfis() {
  let pessoas = (await api.pessoas()).filter(p => p.ativo);
  const tabelaSlot = h('div');
  const avisoSlot = h('div', { 'aria-live': 'polite' });
  const ROTULO = { rh: 'RH', administracao: 'Administração' };

  async function alternar(p, perfil, marcado, caixa) {
    const antes = !marcado;
    const ok = await confirmar({ titulo: `${marcado ? 'Atribuir' : 'Remover'} o perfil ${ROTULO[perfil]} ${marcado ? 'a' : 'de'} ${p.nome}?`, texto: 'A sessão atual da pessoa é encerrada e ela entra de novo com o perfil novo. A alteração fica registrada com autor e data.', rotuloOk: marcado ? 'Atribuir' : 'Remover' });
    if (!ok) { caixa.checked = antes; caixa.focus(); return; }
    const novos = p.perfis.filter(x => x !== perfil && x !== 'colaborador');
    if (marcado) novos.push(perfil);
    try {
      await api.alterarPerfis(p.id, novos);
      pessoas = (await api.pessoas()).filter(x => x.ativo);
      desenhar();
      avisoSlot.replaceChildren(aviso('ok', 'Perfil alterado', `${p.nome}: perfil ${ROTULO[perfil]} ${marcado ? 'atribuído' : 'removido'}. A sessão da pessoa foi encerrada.`)); // estado "TL-15 mudança"
      focarAviso(avisoSlot); anunciar('Perfil alterado.');
    } catch (e) {
      caixa.checked = antes;
      avisoSlot.replaceChildren(aviso('erro', 'Não foi possível alterar', e.status === 422 ? e.message : 'Tente novamente.')); focarAviso(avisoSlot);
    }
  }
  const caixa = (p, perfil) => {
    const c = h('input', { type: 'checkbox', checked: p.perfis.includes(perfil) || null, 'aria-label': `${ROTULO[perfil]}: ${p.nome}` });
    c.addEventListener('change', () => alternar(p, perfil, c.checked, c));
    return c;
  };
  const desde = (p, perfil) => (p.perfis.includes(perfil) && p.desde?.[perfil] ? `Atribuído em ${fmt(p.desde[perfil])}` : 'Não');
  function desenhar() {
    preencher(tabelaSlot, tabela({
      legenda: 'Perfis de acesso por pessoa',
      colunas: [
        { rotulo: 'Pessoa', celula: p => p.nome },
        { rotulo: 'Gestor', celula: p => desde(p, 'gestor') },
        { rotulo: 'Diretoria', celula: p => desde(p, 'diretoria') },
        { rotulo: 'RH', celula: p => caixa(p, 'rh') },
        { rotulo: 'Administração', celula: p => caixa(p, 'administracao') }
      ],
      linhas: pessoas
    }));
    tabelaSlot.firstChild.classList.add('tabela-matriz');
  }
  desenhar();
  return h('section', null,
    h('h1', null, 'Perfis de acesso'),
    h('p', { class: 'sub' }, 'Todo usuário é colaborador. Gestor, Diretoria, RH e Administração são atribuídos aqui, com data de início e autor, e o histórico fica guardado. Ter dois perfis não soma permissões por inferência.'),
    avisoSlot, tabelaSlot,
    aviso('aviso', null, 'Cada atribuição registra perfil, início, fim e quem atribuiu (ATRIBUIÇÃO_PERFIL no modelo ER). Gerenciar um departamento não dá o perfil Gestor sozinho, e a Diretoria, isoladamente, só vê agregados (ERS 1.3, seção 2.3).'));
}
