#!/usr/bin/env node
'use strict';
// Read-only scheduling plan. NO official court requests and NO legal-status inference.
const fs=require('node:fs');
const {validateSnapshot}=require('./validate-capital-snapshot.cjs');
const STEPS=[[-1,'precheck'],[0,'sale_day'],[1,'result_check'],[2,'result_recheck'],[3,'result_recheck'],[7,'final_followup']];
const DAY=86400000;
function dayNumber(s){
 if(typeof s!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(s))return null;
 const [y,m,d]=s.split('-').map(Number);
 const t=Date.UTC(y,m-1,d),date=new Date(t);
 return date.getUTCFullYear()===y&&date.getUTCMonth()+1===m&&date.getUTCDate()===d?t/DAY:null;
}
function isoDay(n){return new Date(n*DAY).toISOString().slice(0,10);}
function koreaToday(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function buildPlan(snapshot,today=koreaToday(),horizon=7){
 const current=dayNumber(today);
 if(current===null||!Number.isInteger(horizon)||horizon<0||horizon>14)throw Error('invalid_plan_window');
 if(!snapshot||snapshot.validation?.passed!==true||
  snapshot.validation.validatedItems!==snapshot.items?.length||
  validateSnapshot(snapshot,null,{strict:true}).ok!==true)throw Error('unverified_snapshot');
 const buckets=new Map(),undated=[];
 for(let offset=0;offset<=horizon;offset++)buckets.set(isoDay(current+offset),
  {date:isoDay(current+offset),precheck:[],sale_day:[],result_check:[],result_recheck:[],final_followup:[]});
 const seen=new Set();
 for(const item of snapshot.items){
  if(seen.has(item.id))throw Error('duplicate_lot');seen.add(item.id);
  if(item.saleDate===null){undated.push(item.id);continue;}
  const sale=dayNumber(item.saleDate);
  if(sale===null)throw Error('invalid_sale_date');
  for(const [delta,stage] of STEPS){
   const row=buckets.get(isoDay(sale+delta));
   if(row)row[stage].push(item.id);
  }
 }
 const days=[...buckets.values()].map(row=>({
  ...row,counts:Object.fromEntries(Object.keys(row).filter(x=>Array.isArray(row[x])).map(x=>[x,row[x].length]))
 }));
 return {schemaVersion:1,kind:'schedule_only',sourceSnapshotAt:snapshot.fetchedAt,
  snapshotItems:snapshot.items.length,partialCoverage:true,generatedForDay:today,
  horizonDays:horizon,legalStatusVerified:false,automaticCourtRequests:0,
  advisory:'입찰기일 기준 점검 대상 계획이며 법원 공식 결과·낙찰·유찰·취하 확인이 아님',
  undatedCount:undated.length,undatedIds:undated,days};
}
function main(){
 const src='data/capital-court-pilot.json',dest='data/court-verification-plan.json';
 const snapshot=JSON.parse(fs.readFileSync(src,'utf8'));
 const output=buildPlan(snapshot);
 fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
 console.log('PASS verification schedule',output.generatedForDay,'snapshot',output.snapshotItems,
  'undated',output.undatedCount,'no court queries');
}
if(require.main===module)main();
module.exports={buildPlan,dayNumber,koreaToday};
