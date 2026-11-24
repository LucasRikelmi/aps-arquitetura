require('dotenv').config();
const {createPool}=require('../src/config/database');
const {PgAcaoRepository}=require('../src/repositories/PgAcaoRepository');
const {AcaoService}=require('../src/services/AcaoService');
const {localParts}=require('../src/services/IsoWeek');
(async()=>{const pool=createPool();try{
 const p=localParts(new Date());const today=`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
 console.log(await new AcaoService(new PgAcaoRepository(pool)).enqueueReviews(today));
 }finally{await pool.end();}})().catch(e=>{console.error({name:e.name,code:e.code});process.exitCode=1;});
