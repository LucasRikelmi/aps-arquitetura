const express=require('express');
const {DomainError}=require('../services/CheckinService');
const {UUID_RE}=require('../middleware/authorize');
const {NOT_FOUND}=require('../middleware/authorize');
function createCheckinRouter({sessionMiddleware,checkins,alertas=null}){
 const router=express.Router();router.use(sessionMiddleware);
 const current=()=>checkins.getCurrentWeek();
 const mutating=(req,res,next)=>{
  const expected=process.env.PUBLIC_ORIGIN;
  if((process.env.NODE_ENV==='production'&&!expected)||(expected&&req.get('origin')!==expected)) return res.status(403).json({mensagem:'origem inválida'});
  return next();
 };
 const selfWrite=(req,res,next)=>req.identity.perfis.includes('Colaborador')?next():res.status(404).json(NOT_FOUND);
 const handler=(fn)=>async(req,res,next)=>{try{await fn(req,res);}catch(err){if(err instanceof DomainError)return res.status(err.status).json({mensagem:err.message});if(err.status===400)return res.status(400).json({mensagem:'requisição inválida'});next(err);}};
 // Colaborador: consulta e grava somente seu próprio check-in.
 router.get('/checkins/atual',handler(async(req,res)=>res.json(await checkins.currentFront(req.identity.id))));
 router.put('/checkins/atual',mutating,selfWrite,handler(async(req,res)=>{
  const w=current(req),body=req.body||{};
  if(!body.metas||typeof body.metas!=='object'||Array.isArray(body.metas))return res.status(400).json({mensagem:'Metas inválidas.'});
  const progressos=Object.entries(body.metas).map(([meta_id,progresso])=>({meta_id,progresso:Number(progresso)}));
  const result=await checkins.save(req.identity.id,w.year,w.week,{humor:body.humor,carga:body.carga,comentario:body.comentario||null,obstaculo:body.obstaculo||null,progressos});
  res.json({ok:true,enviadoEm:new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(result.atualizado_em||new Date())});
  if(alertas)alertas.reconcileUser(req.identity.id).catch(()=>console.error('Falha ao reconciliar alertas'));
 }));
 router.get('/checkins/historico',handler(async(req,res)=>res.json(await checkins.history(req.identity.id))));
 router.get('/checkins/:ano/:semana',handler(async(req,res)=>{const data=await checkins.read(req.identity.id,Number(req.params.ano),Number(req.params.semana));if(!data)return res.status(404).json(NOT_FOUND);res.json(data);if(alertas)alertas.reconcileUser(req.identity.id).catch(()=>console.error("Falha ao reconciliar alertas após check-in"));return;}));
 router.put('/checkins/:ano/:semana',mutating,selfWrite,handler(async(req,res)=>{const data=await checkins.save(req.identity.id,Number(req.params.ano),Number(req.params.semana),req.body);res.json(data);if(alertas)alertas.reconcileUser(req.identity.id).catch(()=>console.error("Falha ao reconciliar alertas após check-in"));return;}));
 // API sem interface: RH reabre semana encerrada de colaborador ativo.
 router.post('/rh/checkins/:userId/:ano/:semana/reabrir',mutating,handler(async(req,res)=>{
  if(!req.identity.perfis.includes('RH')||!UUID_RE.test(req.params.userId))return res.status(404).json(NOT_FOUND);

  const out=await checkins.reopen(req.identity.id,req.identity.perfis,req.params.userId,Number(req.params.ano),Number(req.params.semana));
  return res.status(201).json(out);
 }));
 return router;
}
module.exports={createCheckinRouter};
