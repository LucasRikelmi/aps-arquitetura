const express=require('express');
const {authorizeIndividual,authorizeLogs,UUID_RE,NOT_FOUND}=require('../middleware/authorize');
function createAccessRouter({sessionMiddleware,repository,audit,auditRepository}) {
 const router=express.Router();router.use(sessionMiddleware);
 const read=(action)=>[authorizeIndividual(repository,audit,{kind:'checkin',action}),async(req,res,next)=>{
  try{const items=await repository.getCheckins(req.params.userId);req.auditAction();res.status(200).json({usuario_id:req.params.userId,checkins:items});}
  catch(e){next(e);}
 }];
 router.get('/pessoas/:userId/checkins',...read('consulta'));
 // Exportacao demonstrativa em JSON; PDF/CSV do sistema completo nao esta implementado.
 router.get('/pessoas/:userId/checkins/export',...read('exportacao'));
 // Metas e PDI: consulta somente por dono, RH, gestor da equipe vigente ou designacao explicita.
 for(const kind of ['meta','pdi']) {
   router.get(`/pessoas/:userId/${kind}/:resourceId`,authorizeIndividual(repository,audit,{kind}),async(req,res,next)=>{
     try {
       if(!UUID_RE.test(req.params.resourceId))return res.status(404).json(NOT_FOUND);
       const data=await repository.getResource(req.params.userId,req.params.resourceId,kind);
       if(!data)return res.status(404).json(NOT_FOUND);
       req.auditAction();return res.status(200).json(data);
     }catch(e){next(e);}
   });
 }
 router.get('/log-acesso',authorizeLogs(audit),async(req,res,next)=>{
  try{const logs=await auditRepository.list({limit:50});req.auditAction();res.json(logs);}catch(e){next(e);}
 });
 router.get('/admin/logs',authorizeLogs(audit),async(req,res,next)=>{
  try {
   const limit=req.query.limit===undefined?50:Number(req.query.limit);
   if(!Number.isInteger(limit)||limit<1||limit>100) return res.status(400).json({mensagem:'requisição inválida'});
   const before=req.query.before;
   if(before!==undefined && !/^[1-9][0-9]{0,17}$/.test(String(before)))return res.status(400).json({mensagem:'requisição inválida'});
   const logs=await auditRepository.list({limit,beforeId:before||null});req.auditAction();res.status(200).json({logs});
  }catch(e){next(e);}
 });
 return router;
}
module.exports={createAccessRouter};
