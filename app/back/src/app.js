const express = require('express');
const { validBody, INVALID_REQUEST, INVALID_CREDENTIALS } = require('./controllers/AuthController');
const { COOKIE_NAME, parseCookie, cookieOptions } = require('./services/SessionService');
const { requireSession } = require('./middleware/requireSession');
const { errorHandler } = require('./utils/errors');
const { createCsrfProtection } = require('./middleware/csrf');
const { perfilMaisAlto } = require('./services/PerfilService');
function createApp(authenticationService, sessionService, {secureCookies=process.env.NODE_ENV==='production', access=null,checkins=null,metas=null,progressos=null,painel=null,alertas=null,acoes=null,organizacao=null,frontIntegration=null,loginRateLimiter=null,csrfSecret=process.env.CSRF_SECRET||'development-only-secret-please-change-now-123456',publicOrigin=process.env.PUBLIC_ORIGIN}={}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use('/api', (req,res,next)=>{res.set('Cache-Control','no-store');next();});
  // Limite de 1KiB exclusivo do login; os demais endpoints mantêm seu limite independente.
  app.use('/api/auth/login',express.json({limit:'1kb',strict:true}));
  app.use(express.json({limit:'100kb',strict:true}));
  app.use(createCsrfProtection({secret:csrfSecret,publicOrigin}));
 
app.post('/api/auth/login', async (req, res, next) => {
  // Impede login por origem cruzada.
  if (
    publicOrigin &&
    req.get('origin') &&
    req.get('origin') !== publicOrigin
  ) {
    return res.status(403).json({
      mensagem: 'Requisição não autorizada.'
    });
  }

  if (req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({
      mensagem: 'Requisição não autorizada.'
    });
  }

  // Validação do JSON recebido.
  if (!req.is('application/json') || !validBody(req.body)) {
    return res.status(400).json(INVALID_REQUEST);
  }

  try {
    // Controle de tentativas de login.
    const email = req.body.email.trim().toLowerCase();
    const rateSource = req.ip || req.socket.remoteAddress || 'unknown';

    if (loginRateLimiter && !(await loginRateLimiter.check(rateSource))) {
      return res
        .set('Retry-After', String(await loginRateLimiter.retryAfter(rateSource)))
        .status(429)
        .json({
          mensagem: 'Muitas tentativas. Tente novamente mais tarde.'
        });
    }

    // Autenticação por e-mail e senha.
    const identity = await authenticationService.authenticate(
      email,
      req.body.senha
    );

    if (!identity) {
      return res.status(401).json(INVALID_CREDENTIALS);
    }

    if (loginRateLimiter?.reset) await loginRateLimiter.reset(rateSource);

    // Criação da sessão.
    const token = await sessionService.create(identity.id);

    if (!token) {
      return res.status(401).json(INVALID_CREDENTIALS);
    }

    // Recupera os dados e perfis vigentes.
    const sessionIdentity = await sessionService.validate(token);

    if (!sessionIdentity) {
      await sessionService.revoke(token);
      return res.status(401).json(INVALID_CREDENTIALS);
    }

    // Criação do cookie de sessão.
    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions(secureCookies),
      maxAge: sessionService.absoluteMs
    });

    // Resposta esperada pelo front-end do Lucas.
    return res.status(200).json({
      nome: sessionIdentity.nome,
      perfil: perfilMaisAlto(sessionIdentity.perfis)
    });

  } catch (error) {
    return next(error);
  }
});

  const required=requireSession(sessionService,secureCookies);
 
app.get('/api/auth/sessao', required, (req, res) => {
  return res.status(200).json({
    nome: req.identity.nome,
    perfil: perfilMaisAlto(req.identity.perfis)
  });
});

  // Em producao, configure PUBLIC_ORIGIN com a origem HTTPS exata da interface.
  app.post('/api/auth/logout', required, async (req,res,next) => {
    const origin=req.get('origin');
    const expected=process.env.PUBLIC_ORIGIN;
    if (expected && origin !== expected) return res.status(403).json({mensagem:'origem inválida'});
    if (!expected && process.env.NODE_ENV === 'production') return res.status(503).json({mensagem:'serviço indisponível'});
    try {
      await sessionService.revoke(parseCookie(req.headers.cookie,COOKIE_NAME));
      res.clearCookie(COOKIE_NAME,cookieOptions(secureCookies));
      res.status(204).end();
    } catch(e) { next(e); }
  });
  if(access) {
    const {createAccessRouter}=require('./routes/accessRoutes');
    app.use('/api',createAccessRouter({...access,sessionMiddleware:required}));
  }
  if(checkins) { const {createCheckinRouter}=require('./routes/checkinRoutes'); app.use('/api',createCheckinRouter({sessionMiddleware:required,checkins,alertas})); }
  if(metas){const {createMetaRouter}=require('./routes/metaRoutes');app.use('/api',createMetaRouter({sessionMiddleware:required,metas}));}
  if(progressos){const {createProgressoRouter}=require('./routes/progressoRoutes');app.use('/api',createProgressoRouter({sessionMiddleware:required,progressos}));}
  if(painel){const {createPainelRouter}=require('./routes/painelRoutes');app.use('/api',createPainelRouter({sessionMiddleware:required,painel}));}
  if(alertas){const {createAlertaRouter}=require('./routes/alertaRoutes');app.use('/api',createAlertaRouter({required,service:alertas}));}
  if(acoes){const {createAcaoRouter}=require('./routes/acaoRoutes');app.use('/api',createAcaoRouter({required,service:acoes}));}
  if(organizacao){const {createOrganizationalRouter}=require('./routes/organizationalRoutes');app.use('/api',createOrganizationalRouter({required,service:organizacao}));}
  if(frontIntegration){const {createFrontIntegrationRouter}=require('./routes/frontIntegrationRoutes');app.use('/api',createFrontIntegrationRouter({required,repository:frontIntegration}));}
  app.use(errorHandler);
  return app;
}
module.exports={createApp};
