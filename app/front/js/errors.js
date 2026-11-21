export class ApiError extends Error {
  constructor(status, message, detalhe) { super(message); this.status = status; this.detalhe = detalhe; }
}
