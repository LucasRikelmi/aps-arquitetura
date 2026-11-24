// 503 apenas para falhas de conectividade/disponibilidade do PostgreSQL.
const DB_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH',
  'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  '57P01', '57P02', '57P03',
  '08000', '08001', '08003', '08004', '08006', '08007', '08P01',
  '53300', '53400',
]);

function isDatabaseUnavailable(error) {
  return Boolean(
    error &&
    (
      DB_UNAVAILABLE_CODES.has(error.code) ||
      /connection timeout|timeout exceeded/i.test(error.message || '')
    )
  );
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      mensagem: 'Requisição muito grande.'
    });
  }

  if (
    err.type === 'entity.parse.failed' ||
    err.status === 400 ||
    err.status === 415
  ) {
    return res.status(400).json({
      mensagem: 'Requisição inválida.'
    });
  }

  // Não registrar objetos completos que possam conter SQL ou parâmetros.
  console.error('Falha na requisição:', {
    code: err.code || 'UNKNOWN',
    name: err.name
  });

  if (isDatabaseUnavailable(err)) {
    return res.status(503).json({
      mensagem: 'Serviço indisponível.'
    });
  }

  return res.status(500).json({
    mensagem: 'Erro interno.'
  });
}

module.exports = {
  errorHandler,
  isDatabaseUnavailable
};