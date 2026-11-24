// Constantes e formatadores do domínio, compartilhados pelas telas.
export const PERFIS = [['colaborador', 'Colaborador'], ['gestor', 'Gestor'], ['rh', 'RH'], ['diretoria', 'Diretoria'], ['administracao', 'Administração']];
export const ROTULO_PERFIL = Object.fromEntries(PERFIS);
export const HUMOR = [[1, 'Muito mal'], [2, 'Mal'], [3, 'Neutro'], [4, 'Bem'], [5, 'Muito bem']];
export const ROTULO_HUMOR = Object.fromEntries(HUMOR);
export const CARGA = ['Leve', 'Normal', 'Pesada'];
export const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const fmtData = iso => new Date(iso + 'T12:00').toLocaleDateString('pt-BR');
