// TL-11 Cadastro organizacional (+ estados "e-mail duplicado" e "desligado") e registro de afastamento
import { h, preencher, campo, botao, aviso, tabela, selo, confirmar, anunciar, focarAviso } from '../dom.js';
import { api, ApiError } from '../api.js';
import { EMAIL_OK } from '../dominio.js';

const CONTRATOS = ['CLT', 'PJ', 'Estágio', 'Temporário'];
const AFASTAMENTOS = ['Férias', 'Licença', 'Afastamento'];
const unicos = l => [...new Set(l.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
const sel = (l, vazio = 'Selecione') => [{ valor: '', texto: vazio }, ...l.map(x => ({ valor: x, texto: x }))];

export async function telaCadastro() {
  let pessoas = await api.pessoas();
  const form = h('form', { novalidate: true, class: 'cartao' });
  const formAfast = h('form', { novalidate: true, class: 'cartao' });
  const tabelaSlot = h('div');
  const avisoSlot = h('div', { 'aria-live': 'polite' });

  const ativas = () => pessoas.filter(p => p.ativo);
  const desenharForm = (v = {}, erros = {}) => {
    const n = Object.keys(erros).length;
    preencher(form,
      h('h2', null, 'Incluir colaborador'),
      n ? aviso('erro', 'Revise os campos', Object.values(erros).join(' ')) : null,
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Matrícula', nome: 'matricula', valor: v.matricula || '', obrigatorio: true, erro: erros.matricula, autocomplete: 'off' }),
        campo({ rotulo: 'Nome completo', nome: 'nome', valor: v.nome || '', obrigatorio: true, erro: erros.nome, autocomplete: 'off' }),
        campo({ rotulo: 'E-mail corporativo', nome: 'email', tipo: 'email', valor: v.email || '', obrigatorio: true, erro: erros.email, ajuda: 'Único por pessoa.', autocomplete: 'off' }), // "e-mail duplicado" vem daqui
        campo({ rotulo: 'Cargo', nome: 'cargo', valor: v.cargo || '', obrigatorio: true, erro: erros.cargo, opcoes: sel(unicos(pessoas.map(p => p.cargo))) })),
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Departamento', nome: 'departamento', valor: v.departamento || '', obrigatorio: true, erro: erros.departamento, opcoes: sel(unicos(pessoas.map(p => p.departamento))) }),
        campo({ rotulo: 'Data de admissão', nome: 'admissao', tipo: 'date', valor: v.admissao || '', obrigatorio: true, erro: erros.admissao }),
        campo({ rotulo: 'Tipo de contrato', nome: 'contrato', valor: v.contrato || 'CLT', opcoes: CONTRATOS.map(c => ({ valor: c, texto: c })) }),
        campo({ rotulo: 'Gestor direto', nome: 'gestor', valor: v.gestor || '', opcoes: sel(ativas().filter(p => p.perfis.includes('gestor')).map(p => p.nome)) })),
      h('p', { class: 'nota' }, 'CPF, nascimento e endereço: ', selo('Restrito ao RH', 'info')),
      botao('Salvar cadastro', { tipo: 'submit' }));
    if (n) focarAviso(form);
  };

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(form));
    const erros = {};
    if (!v.matricula?.trim()) erros.matricula = 'Informe a matrícula.';
    if (!v.nome?.trim()) erros.nome = 'Informe o nome completo.';
    if (!EMAIL_OK.test(v.email || '')) erros.email = 'Informe um e-mail válido.';
    if (!v.cargo) erros.cargo = 'Escolha o cargo.';
    if (!v.departamento) erros.departamento = 'Escolha o departamento.';
    if (!v.admissao) erros.admissao = 'Informe a data de admissão.';
    if (Object.keys(erros).length) { desenharForm(v, erros); return; }
    try {
      await api.criarPessoa(v);
      pessoas = await api.pessoas();
      desenharForm(); desenharAfast(); desenharTabela();
      avisoSlot.replaceChildren(aviso('ok', 'Pessoa cadastrada', `${v.nome} foi incluída no cadastro.`));
      focarAviso(avisoSlot); anunciar('Pessoa cadastrada.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) desenharForm(v, { email: 'Este e-mail já está cadastrado.' }); // estado "TL-11 e-mail duplicado"
      else { desenharForm(v); avisoSlot.replaceChildren(aviso('erro', 'Não foi possível cadastrar', 'Tente novamente.')); focarAviso(avisoSlot); }
    }
  });

  const desenharAfast = (v = {}, erro = '') => {
    const gestores = ativas().filter(p => p.perfis.includes('gestor')).map(p => p.nome);
    preencher(formAfast,
      h('h2', null, 'Registrar afastamento'),
      erro ? aviso('erro', 'Revise os campos', erro) : null,
      h('div', { class: 'grade-campos' },
        campo({ rotulo: 'Pessoa', nome: 'pessoa', valor: v.pessoa || '', obrigatorio: true, opcoes: sel(ativas().map(p => p.nome)) }),
        campo({ rotulo: 'Tipo', nome: 'tipo', valor: v.tipo || AFASTAMENTOS[0], opcoes: AFASTAMENTOS.map(t => ({ valor: t, texto: t })) }),
        campo({ rotulo: 'Início', nome: 'inicio', tipo: 'date', valor: v.inicio || '', obrigatorio: true }),
        campo({ rotulo: 'Retorno previsto', nome: 'retorno', tipo: 'date', valor: v.retorno || '', obrigatorio: true }),
        campo({ rotulo: 'Substituto na gerência', nome: 'substituto', valor: v.substituto || '', opcoes: sel(gestores, 'Nenhum'), ajuda: 'Só para gestor afastado. Atua apenas no período. Sem substituto, a chefia sobe na hierarquia.' })),
      h('p', { class: 'nota' }, 'Durante o afastamento a pessoa não recebe lembretes e as semanas não contam para o alerta de ausência.'),
      botao('Registrar afastamento', { tipo: 'submit', variante: 'secundario' }));
  };
  formAfast.addEventListener('submit', async ev => {
    ev.preventDefault();
    const v = Object.fromEntries(new FormData(formAfast));
    if (!v.pessoa || !v.inicio || !v.retorno) { desenharAfast(v, 'Informe pessoa, início e retorno previsto.'); focarAviso(formAfast); return; }
    if (v.retorno < v.inicio) { desenharAfast(v, 'O retorno previsto não pode ser anterior ao início.'); focarAviso(formAfast); return; }
    try { await api.registrarAfastamento(v); desenharAfast(); avisoSlot.replaceChildren(aviso('ok', 'Afastamento registrado', `${v.pessoa}: ${v.tipo}.`)); focarAviso(avisoSlot); anunciar('Afastamento registrado.'); }
    catch { desenharAfast(v, 'Não foi possível registrar. Tente novamente.'); focarAviso(formAfast); }
  });

  async function desligar(p) {
    const ok = await confirmar({ titulo: `Desligar ${p.nome}?`, texto: 'O acesso é encerrado imediatamente, inclusive sessões abertas. Esta ação fica registrada.', rotuloOk: 'Desligar', perigo: true });
    if (!ok) return;
    try {
      await api.desligarPessoa(p.id);
      pessoas = await api.pessoas();
      desenharTabela(); desenharAfast();
      avisoSlot.replaceChildren(aviso('ok', 'Pessoa desligada', `${p.nome} perdeu o acesso agora.`)); // estado "TL-11 desligado"
      focarAviso(avisoSlot); anunciar(`${p.nome} desligada.`);
    } catch { avisoSlot.replaceChildren(aviso('erro', 'Não foi possível desligar', 'Tente novamente.')); focarAviso(avisoSlot); }
  }

  function desenharTabela() {
    preencher(tabelaSlot, tabela({
      legenda: 'Pessoas cadastradas',
      colunas: [
        { rotulo: 'Pessoa', celula: p => p.nome },
        { rotulo: 'E-mail', celula: p => p.email },
        { rotulo: 'Cargo', celula: p => p.cargo },
        { rotulo: 'Departamento', celula: p => p.departamento },
        { rotulo: 'Gestor', celula: p => p.gestor || '—' },
        { rotulo: 'Situação', celula: p => p.ativo ? selo('Ativa', 'ok') : selo(`Desligado em ${p.desligadoEm}`) },
        { rotulo: 'Ações', celula: p => p.ativo ? botao('Desligar', { variante: 'secundario', 'aria-label': `Desligar ${p.nome}`, onClick: () => desligar(p) }) : '' }
      ],
      linhas: pessoas
    }));
  }
  const sinc = await api.sincronizacaoFolha();
  desenharForm(); desenharAfast(); desenharTabela();
  return h('section', null,
    h('h1', null, 'Cadastro organizacional'),
    h('p', { class: 'sub' }, 'Pessoas, cargos, departamentos e relações de gestão. Um único cadastro alimenta todas as telas.'),
    aviso('info', null, `Sincronização com a folha ${sinc.ativa ? 'ativa' : 'inativa'} (última execução ${sinc.ultima}). Cargo, departamento e situação são alterados na folha e aparecem aqui como somente leitura.`),
    avisoSlot, form, tabelaSlot, formAfast);
}
