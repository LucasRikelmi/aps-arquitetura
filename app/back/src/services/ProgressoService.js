const {UUID,validate,canValidate,resolveProgress}=require('./ProgressoPolicy');
class ProgressoError extends Error { constructor(status,message){super(message);this.status=status;} }
class ProgressoService {
 constructor(repo){this.repo=repo;}
 async validate(identity,metaId,body){
  if(!UUID.test(metaId||'')||validate(body))throw new ProgressoError(400,'requisição inválida');
  const context=await this.repo.context(metaId,body.checkin_id,identity.id);
  if(!context||!canValidate(identity,context.responsavel_id,context.scope))throw new ProgressoError(404,'recurso não encontrado');
  const saved=await this.repo.validateAtomic(identity,metaId,body);
  if(!saved)throw new ProgressoError(409,'autorrelato inexistente ou alterado; atualize a consulta');
  return saved;
 }
 async detail(identity,metaId,checkinId){
  if(!UUID.test(metaId||'')||!UUID.test(checkinId||''))throw new ProgressoError(404,'recurso não encontrado');
  const context=await this.repo.context(metaId,checkinId,identity.id);
  if(!context||!context.scope?.ownerActive)throw new ProgressoError(404,'recurso não encontrado');
  const own=identity.id===context.responsavel_id;
  if(!own && !canValidate(identity,context.responsavel_id,context.scope) && !identity.perfis?.includes('RH'))throw new ProgressoError(404,'recurso não encontrado');
  const data=await this.repo.detail(metaId,checkinId);
  if(!data)throw new ProgressoError(404,'recurso não encontrado');
  const {historico,...safeData}=data;
  return {...safeData, ...resolveProgress(data.autorrelato,data.validacao),
    // Historico completo apenas para gestor/RH; autor so enxerga os valores correntes.
    ...(own?{}:{historico:data.historico})};
 }
}
module.exports={ProgressoService,ProgressoError};
