const {validateMeta,canCreate,canView,UUID}=require('./MetaPolicy');
class MetaError extends Error {constructor(status,message){super(message);this.status=status;}}
class MetaService {
 constructor(repo){this.repo=repo;}
 async create(identity,body){
  if(body && typeof body.responsavel==='string' && !body.responsavel_id){
    const id=await this.repo.findResponsavelByName(identity.id,body.responsavel);
    if(!id)throw new MetaError(422,'Responsável fora da sua equipe ou nome ambíguo.');
    body={...body,responsavel_id:id};
  }
  const err=validateMeta(body);if(err)throw new MetaError(400,err);
  const scope=await this.repo.scope(identity.id,body.responsavel_id);
  if(!scope?.active || !canCreate(identity,body.responsavel_id,scope))throw new MetaError(404,'recurso não encontrado');
  return this.repo.create(identity.id,body);
 }
 async get(identity,id){
  if(!UUID.test(id))throw new MetaError(404,'recurso não encontrado');
  const meta=await this.repo.get(id);
  if(!meta)throw new MetaError(404,'recurso não encontrado');
  const scope=await this.repo.scope(identity.id,meta.responsavel_id);
  if(!scope?.active||!canView(identity,meta.responsavel_id,scope))throw new MetaError(404,'recurso não encontrado');
  return meta;
 }
 async list(identity){if(!identity.perfis?.includes('Gestor'))throw new MetaError(404,'recurso não encontrado');return this.repo.listFor(identity.id);}
 async designate(identity,body){
  if(!identity.perfis?.includes('RH'))throw new MetaError(404,'recurso não encontrado');
  if(!body||!UUID.test(body.diretor_id||'')||!UUID.test(body.gestor_id||'')||body.diretor_id===body.gestor_id||
   typeof body.fim_em!=='string'||Number.isNaN(Date.parse(body.fim_em))||Date.parse(body.fim_em)<=Date.now())throw new MetaError(400,'designação inválida');
  const result=await this.repo.designateByRH(identity.id,body.diretor_id,body.gestor_id,body.fim_em);
  if(!result)throw new MetaError(404,'recurso não encontrado');return result;
 }
}
module.exports={MetaService,MetaError};
