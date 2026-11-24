const express=require('express');
const {OrganizationalError}=require('../services/OrganizationalService');
function createOrganizationalRouter({required,service}){
 const router=express.Router();router.use(required);
 const origin=(req,res,next)=>{const expected=process.env.PUBLIC_ORIGIN;if((process.env.NODE_ENV==='production'&&!expected)||(expected&&req.get('origin')!==expected))return res.status(403).json({mensagem:'origem inválida'});next();};
 const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){if(e instanceof OrganizationalError)return res.status(e.status).json({mensagem:e.message});if(e.code==='23505')return res.status(409).json({mensagem:'registro duplicado'});if(e.code==='23503'||e.code==='23514'||e.code==='23502')return res.status(400).json({mensagem:'referência ou período inválido'});next(e);}};
 router.put('/pessoas/:id/perfis',wrap(async(req,res)=>res.json(await service.changeProfiles(req.identity,req.params.id,req.body))));
 router.get('/pessoas',wrap(async(req,res)=>res.json(await service.listPeople(req.identity))));
 router.get('/organizacao/me',wrap(async(req,res)=>res.json(await service.own(req.identity))));
 router.get('/organizacao/pessoas/:id',wrap(async(req,res)=>{const r=await service.person(req.identity,req.params.id);if(!r)return res.status(404).json({mensagem:'recurso não encontrado'});res.json(r);}));
 router.get('/organizacao/equipe',wrap(async(req,res)=>res.json({equipe:await service.team(req.identity)})));
 router.get('/equipe',wrap(async(req,res)=>res.json((await service.team(req.identity)).map(x=>({id:x.id,nome:x.nome})))));
 router.post('/pessoas',origin,wrap(async(req,res)=>res.status(200).json(await service.createPerson(req.identity,req.body))));
 router.post('/rh/organizacao/pessoas',origin,wrap(async(req,res)=>res.status(201).json(await service.createPerson(req.identity,req.body))));
 router.patch('/rh/organizacao/pessoas/:id',origin,wrap(async(req,res)=>res.json(await service.editPerson(req.identity,req.params.id,req.body))));
 router.post('/rh/organizacao/departamentos',origin,wrap(async(req,res)=>res.status(201).json(await service.dictionary(req.identity,'departamento',req.body))));
 router.post('/rh/organizacao/cargos',origin,wrap(async(req,res)=>res.status(201).json(await service.dictionary(req.identity,'cargo',req.body))));
 router.post('/rh/organizacao/lotacoes',origin,wrap(async(req,res)=>res.status(201).json(await service.assign(req.identity,req.body))));
 router.post('/afastamentos',origin,wrap(async(req,res)=>res.status(200).json(await service.leave(req.identity,req.body))));
 router.post('/rh/organizacao/afastamentos',origin,wrap(async(req,res)=>res.status(201).json(await service.leave(req.identity,req.body))));
 router.post('/rh/organizacao/substituicoes',origin,wrap(async(req,res)=>res.status(201).json(await service.substitute(req.identity,req.body))));
 router.post('/pessoas/:id/desligamento',origin,wrap(async(req,res)=>{const r=await service.terminate(req.identity,req.params.id,{data:new Date().toISOString().slice(0,10)});if(!r)return res.status(404).json({mensagem:'Recurso inexistente.'});res.json({ok:true});}));
 router.post('/rh/organizacao/pessoas/:id/desligamento',origin,wrap(async(req,res)=>{const r=await service.terminate(req.identity,req.params.id,req.body);if(!r)return res.status(404).json({mensagem:'recurso não encontrado'});res.json(r);}));
 router.post('/rh/organizacao/sincronizar-folha',origin,wrap(async(req,res)=>res.json(await service.sync(req.identity,req.body))));
 return router;
}
module.exports={createOrganizationalRouter};
