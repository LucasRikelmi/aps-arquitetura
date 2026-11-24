const express=require('express');
function createAlertaRouter({required,service}){
 const router=express.Router();router.use(required);
 router.get('/alertas',async(req,res,next)=>{try{res.json({alertas:await service.list(req.identity)});}catch(e){next(e);}});
 // Regra UC04: o tratamento exige uma acao com descricao. A rota legada /tratar
 // foi removida para impedir a transicao sem acao. Encerramento permanece explicito.
 router.get('/alertas/:id',async(req,res,next)=>{try{const a=await service.detail(req.identity,req.params.id);if(!a)return res.status(404).json({mensagem:'Recurso inexistente.'});res.json(a);}catch(e){next(e);}});
 router.post('/alertas/:id/tratamento',async(req,res,next)=>{try{const a=await service.treat(req.identity,req.params.id,req.body);if(!a)return res.status(404).json({mensagem:'Recurso inexistente.'});res.json(a);}catch(e){if(e.status===422)return res.status(422).json({mensagem:e.message});next(e);}});
 router.post('/alertas/:id/encerrar',async(req,res,next)=>{
  const expected=process.env.PUBLIC_ORIGIN;
  if((process.env.NODE_ENV==='production'&&!expected)||(expected&&req.get('origin')!==expected))return res.status(403).json({mensagem:'origem inválida'});
  try{const item=await service.close(req.identity,req.params.id,'encerrado');if(!item)return res.status(404).json({mensagem:'recurso não encontrado'});res.json(item);}catch(e){next(e);}
 });
 return router;
}
module.exports={createAlertaRouter};
