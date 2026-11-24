const {UUID,realDate}=require('./MetaPolicy');
const ROLES=['Colaborador','Gestor','RH','Diretoria','Administracao'];
const hasRole=(identity,role)=>Boolean(identity?.perfis?.includes(role));
const isRH=(identity)=>hasRole(identity,'RH');
function validText(v,min=1,max=180){return typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max;}
function validatePessoa(data){
 if(!data||typeof data!=='object'||Array.isArray(data))return 'corpo inválido';
 if(!validText(data.nome,2,180)||typeof data.email!=='string'||data.email!==data.email.trim().toLowerCase()||!/^\S+@\S+\.\S+$/.test(data.email)||data.email.length>254)return 'nome e e-mail corporativo válidos são obrigatórios';
 if(data.cpf!==undefined && data.cpf!==null && !/^\d{11}$/.test(data.cpf))return 'CPF inválido';
 if(data.nascimento!==undefined&&data.nascimento!==null&&!realDate(data.nascimento))return 'data de nascimento inválida';
 if(data.endereco!==undefined&&data.endereco!==null&&!validText(data.endereco,1,500))return 'endereço inválido';
 return null;
}
function validatePeriodo(data){return Boolean(data&&realDate(data.inicio)&&realDate(data.fim)&&data.inicio<=data.fim);}
function validateLotacao(data){return Boolean(data&&UUID.test(data.usuario_id||'')&&UUID.test(data.departamento_id||'')&&UUID.test(data.cargo_id||'')&&(!data.gestor_id||UUID.test(data.gestor_id))&&realDate(data.inicio));}
function sanitizePessoa(row,privileged=false){if(!row)return null;const base={id:row.id,nome:row.nome,email:row.email,ativo:row.ativo,departamento:row.departamento,cargo:row.cargo,gestor_id:row.gestor_id}; if(privileged){base.cpf=row.cpf;base.nascimento=row.nascimento;base.endereco=row.endereco;base.telefone=row.telefone;}return base;}
module.exports={ROLES,hasRole,isRH,validText,validatePessoa,validatePeriodo,validateLotacao,sanitizePessoa};
