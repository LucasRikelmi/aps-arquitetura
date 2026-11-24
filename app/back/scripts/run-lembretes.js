require('dotenv').config();
const {createPool}=require('../src/config/database');
const {PgAlertaRepository}=require('../src/repositories/PgAlertaRepository');
const {AlertaService}=require('../src/services/AlertaService');
(async()=>{const slot=process.argv[2]||undefined;const pool=createPool();try{
 const svc=new AlertaService(new PgAlertaRepository(pool));console.log(JSON.stringify(await svc.reminders({slot,force:Boolean(slot)})));
}finally{await pool.end();}})().catch(e=>{console.error('Falha da rotina:',e.code||e.message);process.exitCode=1;});
