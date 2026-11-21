// TL-11 Cadastro organizacional (+ estados "e-mail duplicado" e "desligado")
import { h, preencher, campo, botao, aviso, tabela, confirmar, anunciar, focarAviso } from '../dom.js';
import { api, ApiError } from '../api.js';
import { PERFIS, ROTULO_PERFIL, EMAIL_OK } from '../dominio.js';

export async function telaCadastro() {
  let pessoas = await api.pessoas();
  const form = h('form', { novalidate: true, class: 'cartao' });
  const tabelaSlot = h('div');
  const avisoSlot = h('div', { 'aria-live': 'polite' });

  const desenharForm = (v = {}, erros = {}) => {
    const n = Object.keys(erros).length;
    preencher(form, 
      h('h2', null, 'Nova pessoa'),
      n ? aviso('erro', 'Revise os campos', Object.values(erros).join(' ')) : null,
      campo({ rotulo: 'Nome', nome: 'nome', valor: v.nome || '', obrigatorio: true, erro: erros.nome, autocomplete: 'off' }),
      campo({ rotulo: 'E-mail corporativo', nome: 'email', tipo: 'email', valor: v.email || '', obrigatorio: true, erro: erros.email, autocomplete: 'off' }), // estado "e-mail duplicado" vem daqui
      campo({ rotulo: 'Cargo', nome: 'cargo', valor: v.cargo || '', obrigatorio: true, erro: erros.cargo }),
      campo({ rotulo: 'Departamento', nome: 'departamento', valor: v.departamento || '', obrigatorio: true, erro: erros.departamento }),
      campo({ rotulo: 'Gestor', nome: 'gestor', valor: v.gestor || '', opcoes: [{ valor: '', texto: 'Selecione' }, ...pessoas.filter(p => p.ativo && p.perfil === 'gestor').map(p => ({ valor: p.nome, texto: p.nome }))] }),
      campo({ rotulo: 'Perfil', nome: 'perfil', valor: v.perfil || 'colaborador', opcoes: PERFIS.map(([x, t]) => ({ valor: x, texto: t })) }),
      botao('Cadastrar', { tipo: 'submit' }));
    if (n) focarAviso(form);
  };

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const erros = {};
    if (!v.nome?.trim()) erros.nome = 'Informe o nome.';
    if (!EMAIL_OK.test(v.email || '')) erros.email = 'Informe um e-mail válido.';
    if (!v.cargo?.trim()) erros.cargo = 'Informe o cargo.';
    if (!v.departamento?.trim()) erros.departamento = 'Informe o departamento.';
    if (Object.keys(erros).length) { desenharForm(v, erros); return; }
    try {
      await api.criarPessoa(v);
      pessoas = await api.pessoas();
      desenharForm(); desenharTabela();
      avisoSlot.replaceChildren(aviso('ok', 'Pessoa cadastrada', `${v.nome} já pode acessar com o perfil ${ROTULO_PERFIL[v.perfil]}.`));
      focarAviso(avisoSlot);
      anunciar('Pessoa cadastrada.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) desenharForm(v, { email: 'Este e-mail já está cadastrado.' });
      else { desenharForm(v); avisoSlot.replaceChildren(aviso('erro', 'Não foi possível cadastrar', 'Tente novamente.')); }
    }
  });

  async function desligar(p) {
    const ok = await confirmar({ titulo: `Desligar ${p.nome}?`, texto: 'O acesso é encerrado imediatamente, inclusive sessões abertas. Esta ação fica registrada.', rotuloOk: 'Desligar', perigo: true });
    if (!ok) return;
    try {
      await api.desligarPessoa(p.id);
      pessoas = await api.pessoas();
      desenharTabela();
      // estado "TL-11 desligado"
      avisoSlot.replaceChildren(aviso('ok', 'Pessoa desligada', `${p.nome} perdeu o acesso agora.`));
      focarAviso(avisoSlot);
      anunciar(`${p.nome} desligada.`);
    } catch { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível desligar', 'Tente novamente.')); }
  }

  function desenharTabela() {
    tabelaSlot.replaceChildren(tabela({
      legenda: 'Pessoas cadastradas',
      colunas: [
        { rotulo: 'Nome', celula: p => p.nome },
        { rotulo: 'Cargo', celula: p => p.cargo },
        { rotulo: 'Departamento', celula: p => p.departamento },
        { rotulo: 'Gestor', celula: p => p.gestor || '—' },
        { rotulo: 'Perfil', celula: p => ROTULO_PERFIL[p.perfil] },
        { rotulo: 'Situação', celula: p => p.ativo ? 'Ativa' : 'Desligada' },
        { rotulo: 'Ação', celula: p => p.ativo ? botao('Desligar', { variante: 'secundario', 'aria-label': `Desligar ${p.nome}`, onClick: () => desligar(p) }) : '—' }
      ],
      linhas: pessoas
    }));
  }
  desenharForm(); desenharTabela();
  return h('section', null, h('h1', null, 'Cadastro organizacional'), avisoSlot, form, tabelaSlot);
}
