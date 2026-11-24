// Desligamento e revogacao na mesma transacao, independente de sincronizacao externa.
require('dotenv').config(); const {createPool}=require('../src/config/database');
async function main(){
 const login=process.argv[2]?.trim().toLowerCase(); if(!login) throw Error('Uso: npm run user:deactivate -- <login>');
 const pool=createPool(), client=await pool.connect();
 try{
  await client.query('BEGIN');
  const r=await client.query('UPDATE usuario SET ativo=FALSE,auth_version=auth_version+1 WHERE login=$1 RETURNING id',[login]);
  if(!r.rowCount) throw Error('Usuário não encontrado');
  await client.query('UPDATE sessao SET revogada_em=now() WHERE usuario_id=$1 AND revogada_em IS NULL',[r.rows[0].id]);
  await client.query('COMMIT');console.log('Usuário desativado; sessões revogadas.');
 } catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
