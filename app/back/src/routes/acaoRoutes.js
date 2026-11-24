const express=require('express');
const {AcaoError}=require('../services/AcaoPolicy');
function createAcaoRouter({required,service}){
 const router=express.Router();router.use(required);
 function csrf(req,res,next){const expected=process.env.PUBLIC_ORIGIN;
  if((process.env.NODE_ENV==='production'&&!expected)||(expected&&req.get('origin')!==expected))return res.status(403).json({mensagem:'origem inválida'});
  next();}
 function wrap(fn){return async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e instanceof AcaoError)return res.status(e.status).json({mensagem:e.message});next(e);}};}
 router.post('/acoes',csrf,wrap(async(req,res)=>{const result=await service.create(req.identity,req.body);res.status(201).json(result);}));
 router.get('/colaboradores/:id/acoes',wrap(async(req,res)=>{res.json({acoes:await service.list(req.identity,req.params.id)});}));
 router.get('/alertas/:id/acoes',wrap(async(req,res)=>{res.json({acoes:await service.listAlert(req.identity,req.params.id)});}));
 return router;
}
module.exports={createAcaoRouter};
