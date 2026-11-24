const express=require('express');
const {MetaError}=require('../services/MetaService');
function createMetaRouter({sessionMiddleware,metas}){
 const router=express.Router();router.use(sessionMiddleware);
 const mutation=(req,res,next)=>{
  const expected=process.env.PUBLIC_ORIGIN;
  if((process.env.NODE_ENV==='production'&&!expected)||(expected&&req.get('origin')!==expected))return res.status(403).json({mensagem:'origem inválida'});
  return next();
 };
 const wrap=(fn)=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e instanceof MetaError)return res.status(e.status).json({mensagem:e.message});next(e);}};
 router.get('/metas',wrap(async(req,res)=>res.json(await metas.list(req.identity))));
 router.get('/metas/:id',wrap(async(req,res)=>res.json(await metas.get(req.identity,req.params.id))));
 router.post('/metas',mutation,wrap(async(req,res)=>{await metas.create(req.identity,req.body);res.json({ok:true});}));
 router.post('/rh/metas/designacoes',mutation,wrap(async(req,res)=>res.status(201).json(await metas.designate(req.identity,req.body))));
 return router;
}
module.exports={createMetaRouter};
