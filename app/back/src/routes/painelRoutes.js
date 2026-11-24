const express=require('express');
const {PainelError}=require('../services/PainelService');
function createPainelRouter({sessionMiddleware,painel}){
 const router=express.Router();router.use(sessionMiddleware);
 const wrap=fn=>async(req,res,next)=>{try{res.json(await fn(req));}catch(e){if(e instanceof PainelError)return res.status(e.status).json({mensagem:e.message});next(e);}};
 router.get('/painel/equipe',wrap(req=>painel.team(req.identity)));
 router.get('/painel',wrap(req=>painel.team(req.identity,req.query.escopo)));
 router.get('/painel/equipe/:usuarioId',wrap(req=>painel.individual(req.identity,req.params.usuarioId)));
 return router;
}
module.exports={createPainelRouter};
