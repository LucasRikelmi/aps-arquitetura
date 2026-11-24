// Uso: node scripts/change-profile.js usuario@dominio.com Gestor
// Executar apenas via console administrativo protegido, nunca expor endpoint público.
require('dotenv').config();
const {createPool}=require('../src/config/database');
const VALID=new Set(['Colaborador','Gestor','RH','Diretoria','Administracao']);
async function main(){
 const [login,perfil]=process.argv.slice(2);
 if (!login || !VALID.has(perfil)) throw Error('Uso: npm run profile:change -- <login> <Colaborador|Gestor|RH|Diretoria|Administracao>');
 const pool=createPool(); const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const r=await client.query('SELECT id FROM usuario WHERE login=$1 FOR UPDATE',[login.toLowerCase().trim()]);
  if(!r.rowCount) throw Error('Usuário não encontrado');
  const id=r.rows[0].id;
  await client.query('UPDATE atribuicao_perfil SET fim_em=now() WHERE usuario_id=$1 AND fim_em IS NULL',[id]);
  await client.query('INSERT INTO atribuicao_perfil(usuario_id,perfil) VALUES ($1,$2)',[id,perfil]);
  await client.query('UPDATE usuario SET auth_version=auth_version+1 WHERE id=$1',[id]);
  await client.query('UPDATE sessao SET revogada_em=now() WHERE usuario_id=$1 AND revogada_em IS NULL',[id]);
  await client.query('COMMIT'); console.log('Perfil alterado e sessões revogadas.');
 }catch(e){await client.query('ROLLBACK'); throw e;}finally{client.release();await pool.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
