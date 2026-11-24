const {AcaoError,assertId,assertPayload,canActWithoutAlert}=require('./AcaoPolicy');
class AcaoService {
 constructor(repository){this.repo=repository;}
 async create(identity,body){
  const data=assertPayload(body);
  if(identity.id===data.colaborador_id)throw new AcaoError(404,'recurso não encontrado');
  // Autorizacao, bloqueio de alerta, insercao de acao e mudanca de estado acontecem no banco em uma transacao.
  const result=await this.repo.create(identity,data);
  if(!result)throw new AcaoError(404,'recurso não encontrado');
  return result;
 }
 async list(identity,collaboratorId){assertId(collaboratorId);if(identity.id===collaboratorId)throw new AcaoError(404,'recurso não encontrado');
  const result=await this.repo.list(identity,collaboratorId);
  if(result===null)throw new AcaoError(404,'recurso não encontrado');return result;
 }
 async listAlert(identity,alertId){assertId(alertId);const result=await this.repo.listAlert(identity,alertId);if(result===null)throw new AcaoError(404,'recurso não encontrado');return result;}
 async enqueueReviews(today){if(typeof today!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(today))throw new AcaoError(400,'data inválida');return this.repo.enqueueReviews(today);}
}
module.exports={AcaoService};
