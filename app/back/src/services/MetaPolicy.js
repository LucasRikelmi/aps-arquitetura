const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
function realDate(v){if(typeof v!=='string'||!DATE.test(v))return false;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;}
function validateMeta(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return 'corpo inválido';
 const {responsavel_id,titulo,inicio,prazo,indicador,descricao}=body;
 if(!UUID.test(responsavel_id||'')||typeof titulo!=='string'||!titulo.trim()||titulo.trim().length>200||
 typeof indicador!=='string'||!indicador.trim()||indicador.trim().length>300||
 !realDate(inicio)||!realDate(prazo)|| (descricao!==undefined&&(typeof descricao!=='string'||descricao.length>2000))) return 'responsável, título, início, prazo e indicador válidos são obrigatórios';
 if(inicio>prazo)return 'data de início não pode ser posterior ao prazo';
 return null;
}
function hasRole(identity,role){return Boolean(identity?.perfis?.includes(role));}
function canCreate(identity,ownerId,{team=false,directorAssignment=false,soleDirector=false}={}){
 return hasRole(identity,'Gestor') && (team||directorAssignment||(soleDirector&&identity.id===ownerId));
}
function canView(identity,ownerId,scope){
 if(!identity)return false;
 if(identity.id===ownerId)return true;
 if(hasRole(identity,'RH'))return true;
 return hasRole(identity,'Gestor')&&Boolean(scope.team||scope.directorAssignment);
}
module.exports={validateMeta,canCreate,canView,realDate,UUID};
