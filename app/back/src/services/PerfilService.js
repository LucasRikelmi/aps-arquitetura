
const PRIORIDADE = [
  'administracao',
  'rh',
  'diretoria',
  'gestor',
  'colaborador'
];

function normalizarPerfil(perfil) {
  if (typeof perfil !== 'string') return null;

  const normalizado = perfil
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return PRIORIDADE.includes(normalizado)
    ? normalizado
    : null;
}

function normalizarPerfis(perfis) {
  if (!Array.isArray(perfis)) return [];

  return [
    ...new Set(
      perfis.map(normalizarPerfil).filter(Boolean)
    )
  ];
}

function perfilMaisAlto(perfis) {
  const normalizados = normalizarPerfis(perfis);

  return PRIORIDADE.find(
    perfil => normalizados.includes(perfil)
  ) || 'colaborador';
}

module.exports = {
  PRIORIDADE,
  normalizarPerfil,
  normalizarPerfis,
  perfilMaisAlto
};
