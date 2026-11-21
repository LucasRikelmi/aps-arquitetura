// Configuração do cliente. Mesma origem do Nginx (DA13): sem CORS, sessão por cookie.
// Em produção o build sobrescreve este arquivo com USE_MOCK = false.
window.APP_CONFIG = {
  USE_MOCK: true,          // true: dados fictícios em memória, sem servidor de aplicação
  API_BASE: '/api',        // contrato da API v2.0 (K3), ainda não publicado: ver README.md
  MOSTRAR_RASTRO: true,    // selo TL-xx · UC · RF no cabeçalho (rastreabilidade, item 2.5)
  ATALHOS_DEMO: true       // atalhos "entrar como"; só existem no protótipo
};
