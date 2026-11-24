
const INVALID_REQUEST = Object.freeze({
  mensagem: 'Requisição inválida.'
});

const INVALID_CREDENTIALS = Object.freeze({
  mensagem: 'E-mail ou senha incorretos.'
});

function validBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }

  const { email, senha } = body;

  if (typeof email !== 'string' || typeof senha !== 'string') {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedEmail.length < 3 ||
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return false;
  }

  if (senha.length < 1 || senha.length > 128) {
    return false;
  }

  return true;
}

function createAuthController(authenticationService) {
  return async function login(req, res, next) {
    if (!validBody(req.body)) {
      return res.status(400).json(INVALID_REQUEST);
    }

    try {
      const identity = await authenticationService.authenticate(
        req.body.email,
        req.body.senha
      );

      if (!identity) {
        return res.status(401).json(INVALID_CREDENTIALS);
      }

      return res.status(200).json(identity);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createAuthController,
  validBody,
  INVALID_REQUEST,
  INVALID_CREDENTIALS
};
