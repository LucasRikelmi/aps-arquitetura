export class ApiError extends Error {
  // retryAfter: valor bruto do cabeçalho Retry-After (segundos ou data HTTP), quando o servidor envia.
  constructor(status, message, detalhe, retryAfter = null) { super(message); this.status = status; this.detalhe = detalhe; this.retryAfter = retryAfter; }
}

// Converte Retry-After (RFC 9110, 10.2.3) em segundos. Devolve null se ausente ou inválido.
export function segundosDeRetryAfter(valor, agora = Date.now()) {
  if (valor == null || String(valor).trim() === '') return null;
  const v = String(valor).trim();
  if (/^\d+$/.test(v)) return Number(v);
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - agora) / 1000));
}
