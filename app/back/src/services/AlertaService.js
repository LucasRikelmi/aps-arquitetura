const {metaAlerts,checkinAlert,absenceAlert,recipientRoles,reminderSlot,weekOf,shiftMonday}=require('./AlertaPolicy');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class AlertaService {
 constructor(repo,{clock=()=>new Date()}={}){this.repo=repo;this.clock=clock;}
 today(){const p=require('./IsoWeek').localParts(this.clock());return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;}
 async reconcileUser(userId){
  const today=this.today(),week=weekOf(today),ctx=await this.repo.context(userId,today);
  const recipients=recipientRoles({titular:ctx.roles.titular,substituto:ctx.roles.substituto,diretorDesignado:ctx.roles.diretor_designado,rh:ctx.roles.rh});
  // So consideramos metas vencidas de verdade ate hoje; nunca as futuras.
  const candidate=[...metaAlerts(ctx.metas,today)];
  for(const c of ctx.checkins){if(c.semana_inicio===week.monday){
   // Humor baixo e meta atrasada na semana do check-in; novo check-in produz verificacao imediata.
   const lateNow=ctx.metas.filter(m=>m.prazo<today);
   candidate.push(...checkinAlert(c,lateNow));
  }}
  const weeks=ctx.checkins.map(c=>({semana_inicio:c.semana_inicio,respondeu:true}));
  for(const f of ctx.afastamentos){const prior=weeks.find(w=>w.semana_inicio===f.semana_inicio);if(prior)prior.afastado=true;else weeks.push({semana_inicio:f.semana_inicio,afastado:true});}
  if(ctx.roles.acompanhamento_inicio && ctx.roles.acompanhamento_inicio<=shiftMonday(week.monday,-3))candidate.push(...absenceAlert(weeks,week.monday));
  let created=0;
  for(const c of candidate){const result=await this.repo.upsertAlert(userId,c,recipients);created+=Number(result.new);}
  return {candidatos:candidate.length,criados:created};
 }
 async daily(){let scanned=0,created=0;for(const user of await this.repo.users()){
  const r=await this.reconcileUser(user.id);scanned++;created+=r.criados;
 }return {usuarios:scanned,criados:created};}
 async reminders({slot=reminderSlot(this.clock()),force=false}={}){
  if(!['quinta_10','sexta_15','segunda_08'].includes(slot))return {ignorado:'fora do horario previsto'};
  if(force&&process.env.NODE_ENV==='production')throw Error('force bloqueado em produção');
  const monday=weekOf(this.today()).monday;
  if(slot!=='segunda_08'){
   const pending=await this.repo.pendingReminderUsers(monday);let queued=0;
   for(const u of pending){const key=`lembrete:${slot}:${monday}:${u.id}`;
    queued+=Number(await this.repo.enqueue({key,recipient:u.id,type:'lembrete',subject:'Lembrete de check-in semanal',body:'Seu check-in semanal está pendente. Acesse o sistema para responder dentro da janela prevista. Esta mensagem não contém respostas ou dados pessoais de bem-estar.'}));
   }return {slot,pendentes:pending.length,enfileirados:queued};
  }
  // Segunda 08: participação sobre semana encerrada, sem incluir afastamentos no denominador.
  const prev=shiftMonday(monday,-1),rows=await this.repo.participation(prev);
  const eligible=rows.filter(r=>!r.afastado);
  const count=eligible.length,answered=eligible.filter(r=>r.respondeu).length;
  const pct=count?Math.round(answered*10000/count)/100:null;
  const report=count<5?`Participação semanal (${prev}): resultado suprimido por recorte inferior a cinco pessoas.`:`Participação semanal (${prev}): ${answered} de ${count} colaboradores elegíveis (${pct===null?'sem base':pct+'%'}). Afastamentos excluídos. Não há dados individuais de bem-estar nesta mensagem.`;
  const recipients=[...(await this.repo.usersWithRoles('RH')),...(await this.repo.usersWithRoles('Diretoria'))];
  let queued=0;for(const r of new Map(recipients.map(x=>[x.id,x])).values()){
   queued+=Number(await this.repo.enqueue({key:`participacao:${prev}:${r.id}`,recipient:r.id,type:'participacao',subject:'Participação semanal — check-in',body:report}));
  }
  return {slot,semana:prev,elegiveis:count,responderam:answered,enfileirados:queued};
 }
 async dailyDigest(){const today=this.today(),counts=await this.repo.openAlertsCount();let queued=0;
  for(const c of counts){queued+=Number(await this.repo.enqueue({key:`resumo_alertas:${today}:${c.usuario_id}`,recipient:c.usuario_id,type:'resumo_alertas',subject:'Resumo diário de alertas',body:`Você tem ${c.total} alerta(s) aberto(s) em seu escopo autorizado. Consulte o sistema para os detalhes.`}));}
  return {enfileirados:queued};
 }
 async list(identity){return this.repo.listFor(identity);}
 async detail(identity,id){if(!UUID.test(id))return null;return this.repo.detail(id,identity);}
 async treat(identity,id,data){if(!UUID.test(id)||typeof data?.descricao!=='string'||!data.descricao.trim()||data.descricao.length>4000){const e=new Error('Informe o que foi feito.');e.status=422;throw e;}return this.repo.treat(id,identity,data);}
 async close(identity,id,estado){if(!UUID.test(id)||!['tratado','encerrado'].includes(estado))return null;return this.repo.close(id,identity,estado);}
}
module.exports={AlertaService};
