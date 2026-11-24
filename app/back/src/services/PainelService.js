const crypto=require('node:crypto');
const {formatWeeks}=require('./PainelPolicy');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class PainelError extends Error{constructor(status,message){super(message);this.status=status;}}
class PainelService{
 constructor(repo,audit,{heavyThreshold=3}={}){this.repo=repo;this.audit=audit;this.heavyThreshold=heavyThreshold;}
 record(identity,result,ownerId){
  this.audit?.record({atorId:identity.id,perfis:identity.perfis,recurso:'painel_equipe',acao:result==='permitido'?'consulta':'negativa',resultado:result,alvoId:ownerId||null,correlacaoId:crypto.randomUUID()});
 }
 async checkActor(identity){
  const state=await this.repo.actor(identity);
  if(!state?.ativo||!(state.gestor||state.rh))throw new PainelError(404,'recurso não encontrado');
  return state;
 }
 async individual(identity,ownerId){
  if(!UUID.test(ownerId||'')){this.record(identity,'negado',null);throw new PainelError(404,'recurso não encontrado');}
  let state;
  try{state=await this.checkActor(identity);}catch(e){this.record(identity,'negado',ownerId);throw e;}
  const scope=await this.repo.scope(identity,ownerId);
  if(!scope?.ativo||(!state.rh&&!((state.gestor)&& (scope.equipe||scope.substituto)))){
   this.record(identity,'negado',ownerId);throw new PainelError(404,'recurso não encontrado');
  }
  const rows=await this.repo.weeks([ownerId]);
  const view=formatWeeks(rows,{threshold:this.heavyThreshold});
  this.record(identity,'permitido',ownerId);
  return {usuario_id:ownerId,...view,alertas:[],alertas_status:'pendente_integracao_RF07',
    aviso_atualizacao:'agregados atualizados em rotina; mudanças recentes podem ainda não aparecer'};
 }
 async team(identity){
  let state;
  try{state=await this.checkActor(identity);}catch(e){this.record(identity,'negado');throw e;}
  const ids=await this.repo.team(identity,state.rh);
  const rows=await this.repo.weeks(ids);
  const byUser=new Map(ids.map(id=>[id,[]]));
  for(const row of rows)byUser.get(row.usuario_id)?.push(row);
  const pessoas=ids.map(id=>({usuario_id:id,...formatWeeks(byUser.get(id),{threshold:this.heavyThreshold})}));
  const out={visao:state.rh?'empresa':'equipe',pessoas,quantidade_pessoas:ids.length,
   alertas:[],alertas_status:'pendente_integracao_RF07',
   aviso_atualizacao:'dados derivados: executar rotina de atualização após mudanças'};
  if(state.rh){
   const dept=await this.repo.currentDepartments(ids);
   const byDept=new Map();
   for(const l of dept){if(!byDept.has(l.departamento_id))byDept.set(l.departamento_id,{departamento_id:l.departamento_id,nome:l.nome,ids:new Set()});byDept.get(l.departamento_id).ids.add(l.usuario_id);}
   const counts=[...byDept.values()].map(x=>({...x,quantidade:x.ids.size}));
   // RB-09: evita subtracao de um departamento pequeno a partir do total.
   const safe=counts.filter(x=>x.quantidade>=5);
   const suppressed=counts.some(x=>x.quantidade<5)||ids.length>dept.length;
   out.departamentos=suppressed?[]:safe.map(x=>({departamento_id:x.departamento_id,nome:x.nome,quantidade:x.quantidade}));
   out.departamentos_suprimidos=suppressed;
   // Resposta RH individual autorizada; exportacao de agregados requer politica propria.
  }
  this.record(identity,'permitido');return out;
 }
}
module.exports={PainelService,PainelError};
