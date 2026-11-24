const {test}=require('node:test');
const assert=require('node:assert/strict');
const {recurrentHeavy,weeklyProgress,formatWeeks}=require('../src/services/PainelPolicy');
const {PainelService}=require('../src/services/PainelService');
const owner='11111111-1111-4111-8111-111111111111';
const gestor={id:'22222222-2222-4222-8222-222222222222',perfis:['Gestor']};
const rh={id:'33333333-3333-4333-8333-333333333333',perfis:['RH']};
const adm={id:'44444444-4444-4444-8444-444444444444',perfis:['Administracao']};
const weeks=(loads)=>loads.map((c,i)=>({semana_inicio:`2026-11-${String(23-i*7).padStart(2,'0')}`,respondeu:c!==null,carga:c}));
test('recorrencia 3 pesadas nas 8 semanas corridas, sem resposta nao interrompe',()=>{
 const w=[{respondeu:true,carga:'Pesada'},{respondeu:false,carga:null},{respondeu:true,carga:'Normal'},
 {respondeu:true,carga:'Pesada'},{respondeu:false,carga:null},{respondeu:true,carga:'Pesada'},
 {respondeu:true,carga:'Leve'},{respondeu:false,carga:null}];
 assert.equal(recurrentHeavy(w).recorrente,true);
 assert.equal(recurrentHeavy(w).ocorrencias,3);
 assert.equal(recurrentHeavy(w).gera_alerta,false);
});
test('pesada antiga fora das ultimas oito semanas nao conta',()=>{
 const w=Array(8).fill(null).map(()=>({respondeu:false,carga:null}));w.push({respondeu:true,carga:'Pesada'});
 assert.equal(recurrentHeavy(w).ocorrencias,0);
});
test('sem resposta nunca equivale a Leve nem a zero de humor',()=>{
 const view=formatWeeks([{semana_inicio:'2026-11-23',respondeu:false,humor:null,carga:null}]);
 assert.equal(view.semanas[0].estado,'sem_dado');assert.equal(view.semanas[0].carga,null);assert.equal(view.semanas[0].humor,null);
});
test('origem validado prevalece e misto e sinalizado',()=>{
 const result=weeklyProgress([{autorrelato:20,validado:70},{autorrelato:30,validado:null}]);
 assert.equal(result.percentual,50);assert.equal(result.origem,'misto');assert.equal(result.metas_validadas,1);
});
test('somente autorrelato nao cria valor validado ficticio',()=>{
 const v=weeklyProgress([{autorrelato:35},{autorrelato:55}]);assert.equal(v.percentual,45);assert.equal(v.origem,'autorrelato');
});
test('sem metas gera percentual nulo',()=>assert.equal(weeklyProgress([]).percentual,null));
function setup(state={ativo:true,gestor:true,rh:false},scope={ativo:true,equipe:true,substituto:false}){
 const audit=[];
 const repo={actor:async()=>state,scope:async()=>scope,weeks:async()=>[{usuario_id:owner,semana_inicio:'2026-11-23',respondeu:true,carga:'Pesada',humor:2}],
 team:async()=>[owner],currentDepartments:async()=>[]};
 return {service:new PainelService(repo,{record:e=>audit.push(e)}),audit,repo};
}
test('gestor de equipe recebe dados da pessoa',async()=>{
 const {service,audit}=setup();const r=await service.individual(gestor,owner);assert.equal(r.usuario_id,owner);assert.equal(audit[0].resultado,'permitido');
});
test('gestor fora do escopo recebe 404 e negativa auditada',async()=>{
 const {service,audit}=setup(undefined,{ativo:true,equipe:false,substituto:false});
 await assert.rejects(service.individual(gestor,owner),e=>e.status===404);assert.equal(audit[0].resultado,'negado');
});
test('administracao isolada nao ve painel mesmo que o perfil enviado tenha administracao',async()=>{
 const {service}=setup({ativo:true,gestor:false,rh:false});await assert.rejects(service.team(adm),e=>e.status===404);
});
test('RH ve empresa e departamentos nao identificaveis sao suprimidos',async()=>{
 const {service}=setup({ativo:true,gestor:false,rh:true});const r=await service.team(rh);
 assert.equal(r.visao,'empresa');assert.equal(r.departamentos_suprimidos,true);
});
test('substituto ativo pode ler equipe coberta',async()=>{
 const {service}=setup(undefined,{ativo:true,equipe:false,substituto:true});
 const r=await service.individual(gestor,owner);assert.equal(r.usuario_id,owner);
});
test('designacao para meta nao concede painel individual',async()=>{
 const {service}=setup(undefined,{ativo:true,equipe:false,substituto:false,designacao:true});
 await assert.rejects(service.individual(gestor,owner),e=>e.status===404);
});
