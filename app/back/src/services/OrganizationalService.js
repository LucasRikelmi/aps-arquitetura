const crypto=require('node:crypto');
const {UUID,realDate}=require('./MetaPolicy');
const P=require('./OrganizationalPolicy');
class OrganizationalError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(code,msg)=>{throw new OrganizationalError(code,msg);};
class OrganizationalService {
 constructor(repo,hasher){this.repo=repo;this.hasher=hasher;}
 async createPerson(actor,data){if(!P.isRH(actor))fail(403,'sem permissão');const error=P.validatePessoa(data);if(error)fail(400,error);
   if(data.matricula||data.departamento||data.cargo){
     if(!P.validText(data.matricula,1,40)||!data.admissao||!realDate(data.admissao)||!['CLT','PJ','Estágio','Temporário'].includes(data.contrato)||!data.departamento||!data.cargo)fail(422,'Cadastro organizacional inválido.');
     const names=await this.repo.resolveFrontNames(data);
     if(!names)fail(422,'Cargo, departamento ou gestor não encontrado.');
     data={...data,...names,inicio:data.admissao};
   }
   if(data.departamento_id||data.cargo_id||data.gestor_id){if(!P.validateLotacao({...data,usuario_id:crypto.randomUUID(),inicio:data.inicio||'2026-01-01'}))fail(400,'lotação inválida');if(!realDate(data.inicio))fail(400,'data de início obrigatória');}
   // Conta não recebe senha padrão; primeiro acesso/recuperação é integração futura.
   const blockedHash=await this.hasher.hash(crypto.randomBytes(32).toString('hex'));
   try{return await this.repo.createPerson(actor.id,data,blockedHash);}catch(e){if(e.code==='23505')fail(409,'e-mail já cadastrado');throw e;}
 }
 async editPerson(actor,id,data){if(!P.isRH(actor))fail(403,'sem permissão');if(!UUID.test(id))fail(400,'identificador inválido');
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length===0)fail(400,'alterações obrigatórias');
  const allowed=['nome','email','cpf','nascimento','endereco','telefone'];if(Object.keys(data).some(k=>!allowed.includes(k)))fail(400,'campo inválido');
  if(data.nome!==undefined&&!P.validText(data.nome,2,180))fail(400,'nome inválido');
  if(data.email!==undefined&&(!/^\S+@\S+\.\S+$/.test(data.email)||data.email!==data.email.trim().toLowerCase()||data.email.length>254))fail(400,'e-mail inválido');
  try{const r=await this.repo.editPerson(actor.id,id,data);if(!r)fail(404,'recurso não encontrado');return r;}catch(e){if(e.code==='23505')fail(409,'e-mail já cadastrado');if(e.code==='FOLHA_READONLY')fail(409,'campo gerenciado pela folha');throw e;}
 }
 async changeProfiles(actor,id,data){if(!P.hasRole(actor,'Administracao'))fail(404,'recurso não encontrado');
  if(!UUID.test(id)||!data||!Array.isArray(data.perfis)||data.perfis.some(x=>!['colaborador','gestor','diretoria','rh','administracao'].includes(x)))fail(422,'Perfis inválidos.');
  let result;try{result=await this.repo.changeProfiles(actor.id,id,data.perfis);}catch(e){if(e.status===422)fail(422,e.message);throw e;}if(!result)fail(404,'recurso não encontrado');return result;
 }
 async listPeople(actor){if(!P.isRH(actor)&&!P.hasRole(actor,'Administracao'))fail(404,'recurso não encontrado');return this.repo.listPeople();}
 async own(actor){return this.repo.getPerson(actor.id,true);}
 async person(actor,id){if(!UUID.test(id))fail(400,'identificador inválido');if(actor.id===id)return this.repo.getPerson(id,true);
  if(P.isRH(actor))return this.repo.getPerson(id,true);
  if(P.hasRole(actor,'Gestor')&&await this.repo.hasManagerScope(actor.id,id))return this.repo.getPerson(id,false);
  fail(404,'recurso não encontrado');}
 async team(actor){if(!P.hasRole(actor,'Gestor'))fail(403,'sem permissão');return this.repo.team(actor.id);}
 async dictionary(actor,kind,values){if(!P.isRH(actor))fail(403,'sem permissão');if(!P.validText(values?.nome,2,150))fail(400,'nome inválido');if(kind==='departamento'&&values.superior_id!==undefined&&values.superior_id!==null&&!UUID.test(values.superior_id))fail(400,'superior inválido');return this.repo.dictionary(actor.id,kind,values);}
 async assign(actor,data){if(!P.isRH(actor))fail(403,'sem permissão');if(!P.validateLotacao(data))fail(400,'lotação inválida');if(data.gestor_id&&data.gestor_id===data.usuario_id)fail(400,'gestor não pode ser o próprio colaborador');return this.repo.assign(actor.id,data);}
 async leave(actor,data){if(!P.isRH(actor))fail(403,'sem permissão');
  if(data?.pessoa && !data.usuario_id){
   if(data.substituto)fail(422,'Afastamento com substituto exige integração da cobertura de gestor.');
   const id=await this.repo.idByName(data.pessoa);if(!id)fail(422,'Pessoa não localizada ou nome ambíguo.');
   const tipo=({'Férias':'ferias','Licença':'afastamento','Afastamento':'afastamento'})[data.tipo];
   data={usuario_id:id,tipo,inicio:data.inicio,fim:data.retorno};
  }
  if(!UUID.test(data?.usuario_id||'')||!['ferias','afastamento'].includes(data.tipo)||!P.validatePeriodo(data))fail(400,'afastamento inválido');return this.repo.leave(actor.id,data);}
 async substitute(actor,data){if(!P.isRH(actor))fail(403,'sem permissão');if(!UUID.test(data?.gestor_id||'')||!UUID.test(data?.substituto_id||'')||data.gestor_id===data.substituto_id||!P.validatePeriodo(data))fail(400,'substituição inválida');return this.repo.substitute(actor.id,data);}
 async terminate(actor,id,data){if(!P.isRH(actor))fail(403,'sem permissão');if(!UUID.test(id)||!realDate(data?.data))fail(400,'desligamento inválido');return this.repo.terminate(actor.id,id,data.data);}
 async sync(actor,data){if(!P.isRH(actor))fail(403,'sem permissão');if(!Array.isArray(data?.registros)||data.registros.length>500)fail(400,'registros inválidos');for(const r of data.registros){if(!r||!/^\S+@\S+\.\S+$/.test(r.email||'')||!P.validText(r.nome,2,180)||!['ativo','inativo'].includes(r.situacao)||!UUID.test(r.departamento_id||'')||!UUID.test(r.cargo_id||''))fail(400,'registro da folha inválido');}const registros=[];for(const r of data.registros){registros.push({...r,blocked_hash:await this.hasher.hash(crypto.randomBytes(32).toString('hex'))});}return this.repo.sync(actor.id,registros);}
}
module.exports={OrganizationalService,OrganizationalError};
