#!/usr/bin/env node
// Mede verificação Argon2id sob concorrência, fora da thread principal.
// Não é um benchmark HTTP end-to-end; registrar separadamente latência do login real.
const fs=require('node:fs');
const os=require('node:os');
const argon2=require('argon2');
const {performance}=require('node:perf_hooks');
function percentile(a,p){const values=[...a].sort((x,y)=>x-y);return values[Math.min(values.length-1,Math.ceil(values.length*p/100)-1)];}
async function main(){
 const hash=await argon2.hash('benchmark-only-random-password',{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
 const perLevel=Number(process.env.BENCH_OPS||30);
 if(!Number.isInteger(perLevel)||perLevel<5||perLevel>500)throw Error('BENCH_OPS deve estar entre 5 e 500');
 const rows=[];
 for(const concurrency of [1,2,4,8]){
  // aquecimento por nível
  await argon2.verify(hash,'benchmark-only-random-password');
  const samples=[];let next=0;const started=performance.now();
  async function worker(){while(next<perLevel){next++;const t=performance.now();await argon2.verify(hash,'benchmark-only-random-password');samples.push(performance.now()-t);}}
  await Promise.all(Array.from({length:Math.min(concurrency,perLevel)},worker));
  rows.push({concurrency,operations:perLevel,p50_ms:+percentile(samples,50).toFixed(2),p95_ms:+percentile(samples,95).toFixed(2),p99_ms:+percentile(samples,99).toFixed(2),throughput_rps:+(perLevel/((performance.now()-started)/1000)).toFixed(2)});
 }
 const report={created_at:new Date().toISOString(),host:{cpu_count:os.cpus().length,platform:process.platform,arch:process.arch,node:process.version,uv_threadpool_size:process.env.UV_THREADPOOL_SIZE||'default'},parameters:{memory_kib:19456,iterations:2,parallelism:1},note:'Latência da operação Argon2id local (não inclui PostgreSQL, Nginx, rede nem limites de taxa). Meta HTTP do item 4.6 requer teste de integração dedicado.',rows};
 fs.mkdirSync('reports',{recursive:true});
 const path='reports/argon2-benchmark.json';fs.writeFileSync(path,JSON.stringify(report,null,2));
 console.table(rows);console.log('Relatório salvo em '+path);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
