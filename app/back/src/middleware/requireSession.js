const {
  COOKIE_NAME,
  parseCookie,
  cookieOptions
} = require('../services/SessionService');

function requireSession(sessionService, secureCookies) {
  return async (req, res, next) => {
    try {
      const token = parseCookie(req.headers.cookie, COOKIE_NAME);

      const identity = await sessionService.validate(token);

      if (!identity) {
        res.clearCookie(
          COOKIE_NAME,
          cookieOptions(secureCookies)
        );

        return res.status(401).json({
          mensagem: 'Sessão ausente ou expirada.'
        });
      }

      req.identity = identity;
      return next();

    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { requireSession };