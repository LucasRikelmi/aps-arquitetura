const {weekForInstant,mondayOfIsoWeek,windowIsOpen}=require('./IsoWeek');
class DomainError extends Error {constructor(status,message){super(message);this.status=status;}}
function validatePayload(body) {
 if(!body||Array.isArray(body)||typeof body!=='object') throw new DomainError(400,'requisição inválida');
 const allowed=['humor','carga','comentario','obstaculo','progressos'];
 if(Object.keys(body).some(k=>!allowed.includes(k))) throw new DomainError(400,'requisição inválida');
 const {humor,carga,comentario=null,obstaculo=null,progressos=[]}=body;
 if(!Number.isInteger(humor)||humor<1||humor>5||!['Leve','Normal','Pesada'].includes(carga)||
    (comentario!==null&&(typeof comentario!=='string'||comentario.length>2000))||
    (obstaculo!==null&&(typeof obstaculo!=='string'||obstaculo.length>2000))||
    !Array.isArray(progressos)||progressos.length>200) throw new DomainError(400,'requisição inválida');
 const ids=new Set();
 for(const p of progressos){if(!p||Object.keys(p).sort().join(',')!=='meta_id,progresso'||
   typeof p.meta_id!=='string'|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.meta_id)||
   !Number.isInteger(p.progresso)||p.progresso<0||p.progresso>100||ids.has(p.meta_id.toLowerCase()))throw new DomainError(400,'requisição inválida');
   ids.add(p.meta_id.toLowerCase());}
 return {humor,carga,comentario,obstaculo,progressos};
}
class CheckinService {
 constructor(repo,{clock=()=>new Date()}={}){this.repo=repo;this.clock=clock;}
 getCurrentWeek(){return weekForInstant(this.clock());}
 async currentFront(userId){
  const {windowIsOpen,mondayOfIsoWeek}=require('./IsoWeek');
  const w=this.getCurrentWeek();
  const rec=await this.read(userId,w.year,w.week);
  const monday=mondayOfIsoWeek(w.year,w.week);
  const date=new Date(monday+'T12:00:00Z');
  const friday=new Date(date);friday.setUTCDate(friday.getUTCDate()+4);
  const fmt=d=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'2-digit'}).format(d);
  const metas=await this.repo.frontMetas(userId);
  return {semana:w.week,periodo:`${fmt(date)} a ${fmt(friday)}`,limite:'sexta-feira, 18:00 (horário de Brasília)',aberta:windowIsOpen(this.clock()),
    enviado:rec?{humor:rec.humor,carga:rec.carga,obstaculo:rec.obstaculo||'',comentario:rec.comentario||'',metas:Object.fromEntries((rec.progressos||[]).map(x=>[x.meta_id,x.progresso]))}:null,
    metas};
 }
 async history(userId){return this.repo.history(userId);}
 async read(userId,year,week){const monday=mondayOfIsoWeek(year,week);if(!monday)throw new DomainError(400,'semana ISO inválida');return this.repo.get(userId,year,week);}
 async save(userId,year,week,raw){
  const monday=mondayOfIsoWeek(year,week);
  if(!monday)throw new DomainError(400,'semana ISO inválida');
  const data=validatePayload(raw);
  const now=this.clock(),current=weekForInstant(now);
  const normal=current.year===year&&current.week===week&&windowIsOpen(now);
  const saved=await this.repo.save({userId,year,week,monday,data,normal});
  if(!saved)throw new DomainError(409,'janela encerrada; solicite reabertura ao RH');
  return saved;
 }
 async reopen(rhId,perfis,userId,year,week){
  const monday=mondayOfIsoWeek(year,week);
  if(!monday)throw new DomainError(400,'semana ISO inválida');
  if(!perfis.includes('RH'))throw new DomainError(404,'recurso não encontrado');
  const current=weekForInstant(this.clock());
  if(year>current.year||(year===current.year&&week>current.week))throw new DomainError(409,'não é possível reabrir semana futura');
  if(year===current.year&&week===current.week&&windowIsOpen(this.clock()))throw new DomainError(409,'a janela ainda está aberta');
  const created=await this.repo.reopen({rhId,userId,year,week,monday});
  if(!created)throw new DomainError(404,'recurso não encontrado');
  return created;
 }
}
module.exports={CheckinService,DomainError,validatePayload};
