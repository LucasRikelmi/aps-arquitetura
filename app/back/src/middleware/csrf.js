const UNSAFE = new Set(['POST','PUT','PATCH','DELETE']);
function createCsrfProtection({publicOrigin}={}) {
  return (req,res,next)=>{
    if (!req.path.startsWith('/api/') || !UNSAFE.has(req.method)) return next();
    if (process.env.NODE_ENV==='production' && !publicOrigin) return res.status(503).json({mensagem:'Serviço indisponível.'});
    if (req.get('x-requested-with') !== 'fetch') return res.status(403).json({mensagem:'Requisição não autorizada.'});
    const origin=req.get('origin');
    const fetchSite=req.get('sec-fetch-site');
    if (fetchSite==='cross-site' || (publicOrigin && origin && origin!==publicOrigin))
      return res.status(403).json({mensagem:'Requisição não autorizada.'});
    // Um cliente sem Origin so e aceito com o cabecalho personalizado;
    // navegadores cross-site exigem preflight CORS, que a API nao habilita.
    return next();
  };
}
module.exports={createCsrfProtection};
