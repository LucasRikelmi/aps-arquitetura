require('dotenv').config();
const nodemailer=require('nodemailer');
const {createPool}=require('../src/config/database');
const {PgAlertaRepository}=require('../src/repositories/PgAlertaRepository');
(async()=>{
 const {SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASSWORD,SMTP_FROM}=process.env;
 if(!SMTP_HOST||!SMTP_PORT||!SMTP_FROM)throw Error('Configure SMTP_HOST, SMTP_PORT e SMTP_FROM');
 const transport=nodemailer.createTransport({host:SMTP_HOST,port:Number(SMTP_PORT),secure:Number(SMTP_PORT)===465,
  auth:SMTP_USER?{user:SMTP_USER,pass:SMTP_PASSWORD}:undefined});
 const pool=createPool();try{const repo=new PgAlertaRepository(pool);for(const msg of await repo.nextMails()){
  try{await transport.sendMail({from:SMTP_FROM,to:msg.login,subject:msg.assunto,text:msg.corpo});await repo.mailResult(msg.id,true);}
  catch(e){await repo.mailResult(msg.id,false,e.code||e.message);}
 }}finally{await pool.end();}
})().catch(e=>{console.error('Falha envio:',e.code||e.message);process.exitCode=1;});
