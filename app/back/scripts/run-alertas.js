require('dotenv').config();
const {createPool}=require('../src/config/database');
const {PgAlertaRepository}=require('../src/repositories/PgAlertaRepository');
const {AlertaService}=require('../src/services/AlertaService');
(async()=>{const pool=createPool();try{const service=new AlertaService(new PgAlertaRepository(pool));
 const a=await service.daily();const b=await service.dailyDigest();console.log(JSON.stringify({alertas:a,resumo:b}));
 }finally{await pool.end();}})().catch(e=>{console.error('Falha de rotina:',e.code||e.name);process.exitCode=1;});
