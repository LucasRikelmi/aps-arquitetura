class PgAuthorizationRepository {
 constructor(pool){this.pool=pool;}
 async scopeFor(managerId,ownerId,{kind,resourceId}={}) {
  const {rows}=await this.pool.query(`
    SELECT
      EXISTS(SELECT 1 FROM vinculo_gestor v
        WHERE v.gestor_id=$1 AND v.colaborador_id=$2
        AND v.inicio_em<=now() AND (v.fim_em IS NULL OR v.fim_em>now())) AS escopo,
      EXISTS(SELECT 1 FROM designacao_recurso d
        WHERE d.gestor_id=$1 AND d.beneficiario_id=$2 AND d.recurso_tipo=$3
        AND d.recurso_id=$4::uuid AND d.inicio_em<=now() AND d.fim_em>now()
        AND EXISTS(SELECT 1 FROM atribuicao_perfil a WHERE a.usuario_id=d.gestor_id
          AND a.perfil='Gestor' AND a.inicio_em<=now()
          AND (a.fim_em IS NULL OR a.fim_em>now()))) AS designacao
  `,[managerId,ownerId,kind==='meta'||kind==='pdi'?kind:'meta',resourceId||'00000000-0000-0000-0000-000000000000']);
  return rows[0] || {escopo:false,designacao:false};
 }
 async userExists(id){ const {rows}=await this.pool.query('SELECT 1 FROM usuario WHERE id=$1 AND ativo=TRUE',[id]);return rows.length>0; }
 async getResource(userId,resourceId,kind){
   const {rows}=await this.pool.query('SELECT id,usuario_id,tipo,titulo FROM recurso_designavel_exemplo WHERE usuario_id=$1 AND id=$2 AND tipo=$3',[userId,resourceId,kind]);return rows[0]||null;
 }
 async getCheckins(userId){const {rows}=await this.pool.query(`SELECT id,semana,humor,carga,progresso FROM checkin_exemplo WHERE usuario_id=$1 ORDER BY semana DESC LIMIT 52`,[userId]);return rows;}
}
module.exports={PgAuthorizationRepository};
