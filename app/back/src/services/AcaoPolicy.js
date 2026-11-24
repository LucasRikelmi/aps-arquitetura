const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPOS=new Set(['apoio','redistribuicao','ajuste_prazo','revisao','outro']);
class AcaoError extends Error {constructor(status,message){super(message);this.status=status;}}
function assertId(id){if(typeof id!=='string'||!UUID.test(id))throw new AcaoError(400,'dados inválidos');return id;}
function assertPayload(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new AcaoError(400,'dados inválidos');
 const {colaborador_id,alerta_id=null,tipo,descricao,data_revisao=null}=body;
 assertId(colaborador_id);if(alerta_id!==null)assertId(alerta_id);
 if(!TIPOS.has(tipo)||typeof descricao!=='string'||!descricao.trim()||descricao.length>4000)throw new AcaoError(400,'descrição e tipo são obrigatórios');
 if(data_revisao!==null){
  if(typeof data_revisao!=='string'||!/^(\d{4})-(\d{2})-(\d{2})$/.test(data_revisao)||Number.isNaN(Date.parse(data_revisao+'T00:00:00Z'))||new Date(data_revisao+'T00:00:00Z').toISOString().slice(0,10)!==data_revisao)throw new AcaoError(400,'data de revisão inválida');
 }
 return {colaborador_id,alerta_id,tipo,descricao:descricao.trim(),data_revisao};
}
function canActWithoutAlert(identity,scope){return Boolean(identity?.id&&scope&&identity.perfis?.some(p=>p==='RH'||p==='Gestor'));}
function mayTreatAlert(identity,alert){return Boolean(alert&&alert.papel==='dono'&&alert.colaborador_id!==identity?.id);}
module.exports={UUID,AcaoError,assertId,assertPayload,canActWithoutAlert,mayTreatAlert};
