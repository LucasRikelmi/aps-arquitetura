// Tabela de rotas (TL-xx ↔ UC ↔ RF), perfis autorizados e menu por perfil.
import { telaEntrar } from './screens/tl01-entrar.js';
import { telaCheckin } from './screens/tl02-checkin.js';
import { telaCheckinCelular } from './screens/tl03-checkin-celular.js';
import { telaJanelaEncerrada } from './screens/tl04-janela-encerrada.js';
import { telaHistorico } from './screens/tl05-historico.js';
import { telaPainel } from './screens/tl06-painel.js';
import { telaAlerta } from './screens/tl07-alerta.js';
import { telaMetas } from './screens/tl08-metas.js';
import { telaMetaNova } from './screens/tl09-meta-nova.js';
import { telaProgresso } from './screens/tl10-progresso.js';
import { telaCadastro } from './screens/tl11-cadastro.js';
import { telaFormulario } from './screens/tl12-formulario.js';
import { telaParametros } from './screens/tl13-parametros.js';
import { telaRelatorios } from './screens/tl14-relatorios.js';
import { telaPerfis } from './screens/tl15-perfis.js';
import { telaLog } from './screens/tl16-log.js';
import { telaNaoEncontrado } from './screens/tl17-nao-encontrado.js';

export const ROTAS = [
  { caminho: 'entrar', tl: 'TL-01', rastro: 'RF09', publica: true, tela: telaEntrar },
  { caminho: 'checkin', tl: 'TL-02', rastro: 'UC01 · RF01 RF04 RNF03 RNF08', perfis: ['colaborador'], tela: telaCheckin },
  { caminho: 'checkin-celular', tl: 'TL-03', rastro: 'UC01 · RNF02', perfis: ['colaborador'], tela: telaCheckinCelular },
  { caminho: 'checkin-encerrado', tl: 'TL-04', rastro: 'UC01 ext. 2b · RF01', perfis: ['colaborador'], tela: telaJanelaEncerrada },
  { caminho: 'historico', tl: 'TL-05', rastro: 'UC05 · RF10 RNF07', perfis: ['colaborador'], tela: telaHistorico },
  { caminho: 'painel', tl: 'TL-06', rastro: 'UC03 · RF05 RF06 RF08 RNF06', perfis: ['gestor', 'rh'], tela: telaPainel },
  { caminho: 'alertas', tl: 'TL-07', rastro: 'UC04 UC15 · RF07 RF15', perfis: ['gestor', 'rh'], tela: telaAlerta },
  { caminho: 'metas', tl: 'TL-08', rastro: 'UC02 ext. 1a · RF03', perfis: ['gestor'], tela: telaMetas },
  { caminho: 'metas-nova', tl: 'TL-09', rastro: 'UC02 · RF03 RNF04', perfis: ['gestor'], tela: telaMetaNova },
  { caminho: 'progresso', tl: 'TL-10', rastro: 'UC06 · RF04', perfis: ['gestor'], tela: telaProgresso },
  { caminho: 'cadastro', tl: 'TL-11', rastro: 'UC07 · RF02 RNF04', perfis: ['rh', 'administracao'], tela: telaCadastro },
  { caminho: 'formulario', tl: 'TL-12', rastro: 'UC10 · RF11', perfis: ['rh'], tela: telaFormulario },
  { caminho: 'parametros', tl: 'TL-13', rastro: 'UC16 · RF01 RF06 RF07 RNF01', perfis: ['rh'], tela: telaParametros },
  { caminho: 'relatorios', tl: 'TL-14', rastro: 'UC13 UC14 · RF12 RF13', perfis: ['rh', 'gestor', 'diretoria'], tela: telaRelatorios },
  { caminho: 'perfis', tl: 'TL-15', rastro: 'UC08 · RF09', perfis: ['administracao'], tela: telaPerfis },
  { caminho: 'log', tl: 'TL-16', rastro: 'UC09 · RNF01 RF09', perfis: ['administracao'], tela: telaLog }
];
export const NAO_ENCONTRADO = { caminho: '404', tl: 'TL-17', rastro: 'ext. *a · RF09 RNF07', publica: true, tela: telaNaoEncontrado };

export const MENU = {
  colaborador: [['checkin', 'Check-in da semana'], ['historico', 'Meu histórico']],
  gestor: [['painel', 'Painel da equipe'], ['alertas', 'Alertas'], ['metas', 'Metas da equipe'], ['progresso', 'Validar progresso'], ['relatorios', 'Relatórios']],
  rh: [['painel', 'Painel'], ['alertas', 'Alertas'], ['cadastro', 'Cadastro'], ['formulario', 'Formulário de check-in'], ['parametros', 'Parâmetros'], ['relatorios', 'Relatórios']],
  diretoria: [['relatorios', 'Relatórios agregados']],
  administracao: [['cadastro', 'Cadastro'], ['perfis', 'Perfis de acesso'], ['log', 'Log de acesso']]
};
