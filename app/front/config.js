// Configuração do cliente, carregada antes dos módulos.
// Mesma origem do Nginx (DA13): sem CORS e com sessão por cookie. O build sobrescreve API_BASE.
window.APP_CONFIG = {
  API_BASE: '/api'
};
