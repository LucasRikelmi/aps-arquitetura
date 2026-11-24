#!/usr/bin/env node
// Teste de carga HTTP somente em homologação autorizada; parametrizar limite de taxa
// temporariamente em ambiente isolado para não transformar 429 em falsa medida de latência.
const fs=require('node:fs');
const {performance}=require('node:perf_hooks');
const url=process.env.BENCH_URL;
if(!url || !/^https:\/\//.test(url))throw Error('BENCH_URL HTTPS de homologação é obrigatório');
if(process.env.BENCH_CONFIRM_HOMOLOG!=='SIM')throw Error('Defina BENCH_CONFIRM_HOMOLOG=SIM para confirmar ambiente de homologação');
const origin=new URL(url).origin;
function percentile(a,p){const v=[...a].sort((x,y)=>x-y);return v[Math.max(0,Math.ceil(p*v.length/100)-1)];}
async function main(){
 const report=[];const n=Number(process.env.BENCH_OPS||20);
 if(!Number.isInteger(n)||n<5||n>300)throw Error('BENCH_OPS deve ser 5..300');
 for(const concurrency of [1,2,4,8]){
  let index=0;const measures=[];const statusCounts={};const started=performance.now();
  async function worker(){while(index<n){const current=index++;
    const body={login:`bench-${Date.now()}-${concurrency}-${current}@test.invalid`,senha:'SenhaDeTesteSomenteHomologacao!'};
    const t=performance.now();
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    await response.text();measures.push(performance.now()-t);statusCounts[response.status]=(statusCounts[response.status]||0)+1;
  }}
  await Promise.all(Array.from({length:Math.min(concurrency,n)},worker));
  report.push({concurrency,operations:n,latency_p50_ms:+percentile(measures,50).toFixed(2),latency_p95_ms:+percentile(measures,95).toFixed(2),latency_p99_ms:+percentile(measures,99).toFixed(2),throughput_rps:+(n/((performance.now()-started)/1000)).toFixed(2),statusCounts});
 }
 fs.mkdirSync('reports',{recursive:true});
 fs.writeFileSync('reports/login-http-benchmark.json',JSON.stringify({timestamp:new Date().toISOString(),url_origin:origin,report},null,2));
 console.table(report.map(({statusCounts,...rest})=>({...rest,statusCounts:JSON.stringify(statusCounts)})));
 if(report.some(r=>Object.keys(r.statusCounts).some(x=>x!=='401')))process.stderr.write('ALERTA: respostas diferentes de 401; NÃO usar resultado como meta de latência até investigar.\n');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
