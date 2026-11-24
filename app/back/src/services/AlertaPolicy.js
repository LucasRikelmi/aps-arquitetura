// ERS RF07, RB-03..05: somente quatro tipos geram alertas.
const {isoWeekOfDate,mondayOfIsoWeek,localParts}=require('./IsoWeek');
const DAY=86400000;
function dateOnly(value){if(typeof value==='string') return value.slice(0,10); return new Date(value).toISOString().slice(0,10);}
function shiftMonday(monday,n){return new Date(Date.parse(monday+'T00:00:00Z')+n*7*DAY).toISOString().slice(0,10);}
function weekOf(date){const d=new Date(dateOnly(date)+'T00:00:00Z'); const x=isoWeekOfDate(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate()); return {...x,monday:mondayOfIsoWeek(x.year,x.week)};}
function progress(meta){const n=Number(meta.progresso_efetivo ?? meta.progresso ?? 0); return Number.isFinite(n) ? n : 0;}
function late(meta,today){return dateOnly(meta.prazo)<today && progress(meta)<100;}
function atRisk(meta,today){const a=Date.parse(dateOnly(meta.inicio)+'T00:00:00Z'), b=Date.parse(dateOnly(meta.prazo)+'T00:00:00Z'), t=Date.parse(today+'T00:00:00Z');return Number.isFinite(a+b+t)&&b>=a&&t>=a&&t<=b&& (t-a)/(Math.max(b-a,1))>=0.75&&progress(meta)<50;}
// Exige que a meta esteja atrasada NA SEMANA do check-in, nao uma semana qualquer.
function checkinAlert(checkin,metas){if(Number(checkin.humor)>2)return [];return metas.filter(m=>dateOnly(m.prazo)<shiftMonday(checkin.semana_inicio,1)&&progress(m)<100).map(m=>({tipo:'humor_meta_atrasada',objeto_id:m.id,semana_inicio:checkin.semana_inicio}));}
function metaAlerts(metas,today){const out=[];for(const m of metas){if(late(m,today))out.push({tipo:'meta_vencida',objeto_id:m.id,semana_inicio:weekOf(today).monday});else if(atRisk(m,today))out.push({tipo:'meta_em_risco',objeto_id:m.id,semana_inicio:weekOf(today).monday});}return out;}
// Semanas de afastamento nao contam e nao quebram uma sequencia de ausencia; usa ultimas semanas ENCERRADAS.
function absenceAlert(weeks,referenceMonday){let n=0;for(let i=1;i<=12;i++){const monday=shiftMonday(referenceMonday,-i);const w=weeks.find(x=>dateOnly(x.semana_inicio)===monday);if(w?.afastado)continue;if(w?.respondeu)break;n++;if(n===3)return [{tipo:'sem_checkin',objeto_id:null,semana_inicio:referenceMonday}];}return [];}
function recipientRoles({titular=null,substituto=null,rh=[],diretorDesignado=null}){const owner=diretorDesignado||substituto||titular; const ids=new Set();const list=[];if(owner){list.push({usuario_id:owner,papel:'dono'});ids.add(owner);}for(const id of rh){if(!ids.has(id)){list.push({usuario_id:id,papel:'observador'});ids.add(id);}}return list;}
function reminderSlot(now){const p=localParts(now);const dow=(new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay()+6)%7;const minutes=p.hour*60+p.minute;return (dow===3&&minutes===600)?'quinta_10':(dow===4&&minutes===900)?'sexta_15':(dow===0&&minutes===480)?'segunda_08':null;}
module.exports={late,atRisk,checkinAlert,metaAlerts,absenceAlert,recipientRoles,reminderSlot,shiftMonday,weekOf};
