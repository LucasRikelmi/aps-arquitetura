const ZONE = 'America/Sao_Paulo';
function localParts(date) {
 if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error('data inválida');
 const fields=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const p=Object.fromEntries(fields.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 return {year:p.year,month:p.month,day:p.day,hour:p.hour,minute:p.minute};
}
function isoWeekOfDate(year,month,day) {
 const d=new Date(Date.UTC(year,month-1,day));
 d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
 const isoYear=d.getUTCFullYear();
 const start=new Date(Date.UTC(isoYear,0,1));
 return {year:isoYear,week:Math.ceil((((d-start)/86400000)+1)/7)};
}
function mondayOfIsoWeek(year,week) {
 if(!Number.isInteger(year)||year<2000||year>2200||!Number.isInteger(week)||week<1||week>53) return null;
 const jan4=new Date(Date.UTC(year,0,4));
 const monday=new Date(jan4.getTime()-((jan4.getUTCDay()+6)%7)*86400000);
 monday.setUTCDate(monday.getUTCDate()+7*(week-1));
 if(isoWeekOfDate(monday.getUTCFullYear(),monday.getUTCMonth()+1,monday.getUTCDate()).year!==year || isoWeekOfDate(monday.getUTCFullYear(),monday.getUTCMonth()+1,monday.getUTCDate()).week!==week) return null;
 return monday.toISOString().slice(0,10);
}
function weekForInstant(now) {
 const p=localParts(now), w=isoWeekOfDate(p.year,p.month,p.day);
 return {...w,monday:mondayOfIsoWeek(w.year,w.week)};
}
function windowIsOpen(now) {
 const p=localParts(now);
 const weekday=(new Date(Date.UTC(p.year,p.month-1,p.day)).getUTCDay()+6)%7;
 const minute=p.hour*60+p.minute;
 return (weekday===0 && minute>=480) || (weekday>0 && weekday<4) || (weekday===4 && minute<1080);
}
module.exports={ZONE,localParts,isoWeekOfDate,mondayOfIsoWeek,weekForInstant,windowIsOpen};
