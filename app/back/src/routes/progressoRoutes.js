const express=require('express');
const {ProgressoError}=require('../services/ProgressoService');
function createProgressoRouter({sessionMiddleware,progressos}){
 const router=express.Router();router.use(sessionMiddleware);
 const mutation=(req,res,next)=>{
  const expected=process.env.PUBLIC_ORIGIN;
  if((process.env.NODE_ENV==='production'&&!expected)||(expected&&req.get('origin')!==expected))return res.status(403).json({mensagem:'origem inválida'});
  next();
 };
 const wrap=(f)=>async(req,res,next)=>{try{await f(req,res);}catch(err){if(err instanceof ProgressoError)return res.status(err.status).json({mensagem:err.message});next(err);}};
 router.get('/metas/:metaId/checkins/:checkinId/progresso',wrap(async(req,res)=>{
   res.json(await progressos.detail(req.identity,req.params.metaId,req.params.checkinId));
 }));
 router.post('/metas/:id/validacao',mutation,wrap(async(req,res)=>{
   res.status(200).json(await progressos.validate(req.identity,req.params.id,req.body));
 }));
 router.post('/metas/:metaId/progresso/validacoes',mutation,wrap(async(req,res)=>{
   res.status(201).json(await progressos.validate(req.identity,req.params.metaId,req.body));
 }));
 return router;
}
module.exports={createProgressoRouter};
