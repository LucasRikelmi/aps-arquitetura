// RB-02: 3 marcacoes Pesada nas ultimas 8 semanas CORRIDAS.
// Sem resposta nao conta, nao interrompe e nao prolonga a janela.
function recurrentHeavy(weeks, {threshold=3, window=8}={}) {
 if(!Number.isInteger(threshold)||threshold<1||!Number.isInteger(window)||window<1) throw Error('limiar invalido');
 const last=weeks.slice(0,window);
 const count=last.filter(w=>w.respondeu===true && w.carga==='Pesada').length;
 return {recorrente:count>=threshold,ocorrencias:count,limiar:threshold,janela_semanas:window,
  natureza:'indicador',gera_alerta:false};
}
function weeklyProgress(progresses) {
 const valid=progresses.filter(p=>Number.isFinite(p.autorrelato));
 if(!valid.length)return {percentual:null,origem:null,metas_com_progresso:0,metas_validadas:0};
 const nValid=valid.filter(p=>Number.isFinite(p.validado)).length;
 const sum=valid.reduce((s,p)=>s+(Number.isFinite(p.validado)?p.validado:p.autorrelato),0);
 return {percentual:Math.round(sum/valid.length*100)/100,
 origem:nValid===0?'autorrelato':nValid===valid.length?'validado':'misto',
 metas_com_progresso:valid.length,metas_validadas:nValid};
}
function formatWeeks(rows,{threshold=3}={}) {
 const ordered=[...rows].sort((a,b)=>String(b.semana_inicio).localeCompare(String(a.semana_inicio)));
 const recurrence=recurrentHeavy(ordered,{threshold});
 return {semanas:ordered.map(r=>({...r,humor:r.respondeu?r.humor:null,
 carga:r.respondeu?r.carga:null,estado:r.respondeu?'respondida':'sem_dado'})),carga_pesada_recorrente:recurrence};
}
module.exports={recurrentHeavy,weeklyProgress,formatWeeks};
