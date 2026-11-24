// Nega por padrao. Permissoes especificas dependem de escopo vigente no banco.
const INDIVIDUAL_TYPES = new Set(['checkin','meta','pdi','cadastro']);
function hasRole(identity, role) { return Array.isArray(identity?.perfis) && identity.perfis.includes(role); }
function evaluateIndividual(identity, {ownerId,kind,scope=false,designation=false}) {
 if(!identity?.id || !INDIVIDUAL_TYPES.has(kind)) return false;
 // Administracao nunca acessa conteudo de bem-estar nem por acumulo de perfil administrativo isolado.
 // Perfil acumulado (por exemplo Administracao+RH) usa atribuicao RH vigente e escopo especifico.
 if(identity.id === ownerId && hasRole(identity,'Colaborador')) return true;
 if(kind==='cadastro' && identity.id===ownerId) return true;
 if(hasRole(identity,'RH')) return true; // RH pode consultar dados organizacionais e historicos conforme RF09.
 if(hasRole(identity,'Gestor') && scope) return true;
 if((kind==='meta' || kind==='pdi') && hasRole(identity,'Gestor') && designation) return true;
 return false;
}
function canReadAudit(identity) {return hasRole(identity,'Administracao');}
module.exports={evaluateIndividual,canReadAudit,hasRole};
