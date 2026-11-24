const express=require('express');
const {normalizarPerfis}=require('../services/PerfilService');
function createFrontIntegrationRouter({required,repository}) {
 const r=express.Router();r.use(required);
 const allowed=(req,...roles)=>normalizarPerfis(req.identity.perfis).some(x=>roles.includes(x));
 const deny=(res)=>res.status(404).json({mensagem:'Recurso inexistente.'});
 const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
 const integer=id=>/^[1-9]\d*$/.test(String(id))&&Number.isSafeInteger(Number(id));
 r.get('/formulario-checkin',wrap(async(req,res)=>{if(!allowed(req,'rh'))return deny(res);res.json(await repository.perguntas());}));
 r.post('/formulario-checkin/perguntas',wrap(async(req,res)=>{
   if(!allowed(req,'rh'))return deny(res);
   const d=req.body;
   if(!d||typeof d.texto!=='string'||!d.texto.trim()||d.texto.length>500||!['Texto','Opção'].includes(d.tipo)||!['opcional','obrigatória'].includes(d.resposta))
     return res.status(422).json({mensagem:'Pergunta inválida.'});
   await repository.criarPergunta(d);res.json({ok:true});
 }));
 r.put('/formulario-checkin/perguntas/:id',wrap(async(req,res)=>{
   if(!allowed(req,'rh'))return deny(res);
   if(!integer(req.params.id)||typeof req.body?.texto!=='string'||!req.body.texto.trim()||req.body.texto.length>500)return res.status(422).json({mensagem:'Pergunta inválida.'});
   if(!await repository.alterarPergunta(req.params.id,req.body))return deny(res);res.json({ok:true});
 }));
 r.post('/formulario-checkin/perguntas/:id/inativacao',wrap(async(req,res)=>{
   if(!allowed(req,'rh'))return deny(res);
   if(!integer(req.params.id)||!await repository.inativarPergunta(req.params.id))return deny(res);res.json({ok:true});
 }));
 r.get('/parametros',wrap(async(req,res)=>{if(!allowed(req,'rh'))return deny(res);res.json(await repository.parametros());}));
 r.put('/parametros',wrap(async(req,res)=>{
   if(!allowed(req,'rh'))return deny(res);
   const d=req.body;
   if(!d||typeof d!=='object'||Array.isArray(d)||!['humorAte','semanasSemResposta','cargaPesadaSemanas','metaRiscoProgresso'].every(k=>Number.isInteger(d[k])&&d[k]>0&&d[k]<=100))
     return res.status(422).json({mensagem:'Valor inválido.'});
   const permitted=['textoVisibilidade','abre','fecha','fuso','humorAte','semanasSemResposta','cargaPesadaSemanas','metaRiscoProgresso','retencaoLog','retencaoCheckins'];
   if(Object.keys(d).some(k=>!permitted.includes(k)))return res.status(422).json({mensagem:'Parâmetro inválido.'});
   await repository.salvarParametros(d);res.json({ok:true});
 }));
 r.get('/relatorios/agregados',wrap(async(req,res)=>{
   if(!allowed(req,'rh','gestor','diretoria'))return deny(res);
   res.json(await repository.agregados(req.identity,req.query.departamento));
 }));
 r.get('/sincronizacao-folha',wrap(async(req,res)=>{
   if(!allowed(req,'rh','administracao'))return deny(res);
   res.json(await repository.sincronizacaoFolha());
 }));
 return r;
}
module.exports={createFrontIntegrationRouter};
