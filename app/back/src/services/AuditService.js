const crypto=require('node:crypto');
// Fila em memoria, assincrona e de tamanho limitado: nao atrasa o endpoint.
// Para auditoria critica, evoluir para outbox transacional / fila persistente em producao.
class AuditService {
 constructor(repository,{maxQueue=10000,onFailure=(e)=>console.error('Falha na gravacao do log:',e.code||e.name)}={}){
   this.repository=repository;this.maxQueue=maxQueue;this.onFailure=onFailure;
   this.queue=[];this.running=false;this.idleWaiters=[];this.dropped=0;
 }
 record(event) {
   const safe={atorId:event.atorId||null,perfis:Array.isArray(event.perfis)?event.perfis:[],recurso:String(event.recurso).slice(0,80),acao:event.acao,resultado:event.resultado,alvoId:event.alvoId||null,correlacaoId:event.correlacaoId||crypto.randomUUID()};
   if(this.queue.length>=this.maxQueue){this.dropped++;this.onFailure({name:'AUDIT_QUEUE_FULL'});return false;}
   this.queue.push(safe);if(!this.running){this.running=true;setImmediate(()=>this.drain());}return true;
 }
 async drain(){while(this.queue.length){const e=this.queue.shift();try{await this.repository.insert(e);}catch(err){this.onFailure(err);}}this.running=false;for(const wake of this.idleWaiters.splice(0))wake();}
 async flush(){if(!this.running && !this.queue.length)return;await new Promise(resolve=>this.idleWaiters.push(resolve));}
}
module.exports={AuditService};
