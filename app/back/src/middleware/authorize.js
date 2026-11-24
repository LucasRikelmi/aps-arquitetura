const crypto=require('node:crypto');
const {evaluateIndividual,canReadAudit}=require('../services/AuthorizationPolicy');
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND=Object.freeze({mensagem:'recurso não encontrado'});
function auditEvent(req,{recurso,acao,resultado,alvoId}){
 return {atorId:req.identity.id,perfis:req.identity.perfis,recurso,acao,resultado,alvoId,correlacaoId:req.requestId||crypto.randomUUID()};
}
function authorizeIndividual(repository,audit,{kind='checkin',action='consulta'}={}) {
 return async (req,res,next)=>{
  const ownerId=req.params.userId;
  // Mesmo erro para ID malformado, inexistente e fora do escopo (RB-07).
  if(!UUID_RE.test(ownerId)){
   audit.record(auditEvent(req,{recurso:kind,acao:'negativa',resultado:'negado'}));
   return res.status(404).json(NOT_FOUND);
  }
  try{
   // Verifica perfil autorizado antes de qualquer consulta ao recurso.
   const {scope,designation}=await repository.scopeFor(req.identity.id,ownerId,{kind,resourceId:req.params.resourceId});
   const allowed=evaluateIndividual(req.identity,{ownerId,kind,scope,designation});
   if(!allowed){audit.record(auditEvent(req,{recurso:kind,acao:'negativa',resultado:'negado',alvoId:ownerId}));return res.status(404).json(NOT_FOUND);}
   if(!await repository.userExists(ownerId)){
    audit.record(auditEvent(req,{recurso:kind,acao:'negativa',resultado:'negado',alvoId:ownerId}));return res.status(404).json(NOT_FOUND);
   }
   req.auditAction=()=>audit.record(auditEvent(req,{recurso:kind,acao:action,resultado:'permitido',alvoId:ownerId}));
   next();
  }catch(e){next(e);}
 };
}
function authorizeLogs(audit){return(req,res,next)=>{
 if(!canReadAudit(req.identity)){
  audit.record(auditEvent(req,{recurso:'log_acesso',acao:'negativa',resultado:'negado'}));return res.status(404).json(NOT_FOUND);
 }
 req.auditAction=()=>audit.record(auditEvent(req,{recurso:'log_acesso',acao:'consulta_log',resultado:'permitido'}));next();
};}
module.exports={authorizeIndividual,authorizeLogs,NOT_FOUND,UUID_RE};
