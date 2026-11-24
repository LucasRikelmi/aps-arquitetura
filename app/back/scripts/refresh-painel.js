require('dotenv').config();
const {createPool}=require('../src/config/database');
const {PgPainelRepository}=require('../src/repositories/PgPainelRepository');
(async()=>{const pool=createPool();try{const result=await new PgPainelRepository(pool).refresh({weeks:Number(process.env.PAINEL_JANELA_SEMANAS||26)});console.log(JSON.stringify(result));}finally{await pool.end();}})().catch(e=>{console.error('Falha na rotina de agregacao:',e.message);process.exitCode=1;});
