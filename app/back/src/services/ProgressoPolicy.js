const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).sort().join(',')!=='avaliacao_qualitativa,checkin_id,valor_validado'||
   typeof body.checkin_id!=='string'||!UUID.test(body.checkin_id)||
   !Number.isInteger(body.valor_validado)||body.valor_validado<0||body.valor_validado>100||
   typeof body.avaliacao_qualitativa!=='string'||!body.avaliacao_qualitativa.trim()||
   body.avaliacao_qualitativa.length>1000) return 'requisição inválida';
 return null;
}
function canValidate(identity, ownerId, scope){
 return Boolean(identity && ownerId && identity.id!==ownerId &&
 identity.perfis?.includes('Gestor') && scope?.actorActive && scope?.ownerActive &&
 (scope?.directTeam || scope?.substitute || scope?.directorAssignment));
}
function resolveProgress(autorrelato, validacao){
 if(autorrelato===null||autorrelato===undefined)return {valor_utilizado:null,origem:'sem_autorrelato',autorrelato:null,valor_validado:null,avaliacao_qualitativa:null};
 if(!validacao)return {valor_utilizado:autorrelato,origem:'autorrelato',autorrelato,valor_validado:null,avaliacao_qualitativa:null};
 return {valor_utilizado:validacao.valor_validado,origem:'validado',autorrelato,valor_validado:validacao.valor_validado,avaliacao_qualitativa:validacao.avaliacao_qualitativa};
}
module.exports={UUID,validate,canValidate,resolveProgress};
