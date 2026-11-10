#!/usr/bin/env node
'use strict';
// Observe differences between two VALIDATED limited-page court snapshots.
// This is evidence of collection-value changes, NOT of auction results/failures.
const fs=require('node:fs');
const {validateSnapshot}=require('./validate-capital-snapshot.cjs');
const validPrice=n=>Number.isSafeInteger(n)&&n>0&&n<=999999999999999;
const validTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&/^20\d{2}-\d{2}-\d{2}T/.test(s);
function updateHistory(previous,current,existing={schemaVersion:1,kind:'observed_snapshot_prices',events:[]}){
 const checked=s=>s&&s.source==='courtauction.go.kr'&&s.complete===false&&
  s.validation?.passed===true&&s.validation.validatedItems===s.items?.length&&
  validateSnapshot(s,null,{strict:true}).ok===true&&validTime(s.fetchedAt);
 if(!checked(previous)||!checked(current)||Date.parse(current.fetchedAt)<=Date.parse(previous.fetchedAt))throw Error('invalid_or_nonchronological_snapshots');
 if(!existing||existing.schemaVersion!==1||existing.kind!=='observed_snapshot_prices'||!Array.isArray(existing.events)||existing.events.length>2000)throw Error('invalid_existing_history');
 const oldMap=new Map(previous.items.map(x=>[x.id,x])),entries=[];
 for(const item of current.items){
  const old=oldMap.get(item.id);if(!old)continue;
  if(!validPrice(item.minimumWon)||!validPrice(old.minimumWon))continue;
  if(item.minimumWon!==old.minimumWon){
   entries.push({id:item.id,fromSnapshotAt:previous.fetchedAt,toSnapshotAt:current.fetchedAt,
    previousMinimumWon:old.minimumWon,currentMinimumWon:item.minimumWon});
  }
 }
 const all=[...existing.events],keys=new Set();
 for(const e of all){
  if(!e||typeof e.id!=='string'||!/^court-B\d{6}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(e.id)||
   !validTime(e.fromSnapshotAt)||!validTime(e.toSnapshotAt)||
   !validPrice(e.previousMinimumWon)||!validPrice(e.currentMinimumWon)||
   e.previousMinimumWon===e.currentMinimumWon||Date.parse(e.toSnapshotAt)<=Date.parse(e.fromSnapshotAt))
    throw Error('unsafe_existing_history');
  const k=e.id+'|'+e.toSnapshotAt;
  if(keys.has(k))throw Error('duplicate_history_event');
  keys.add(k);
 }
 for(const e of entries){
  const key=e.id+'|'+e.toSnapshotAt;
  if(!keys.has(key)){all.push(e);keys.add(key);}
 }
 all.sort((a,b)=>Date.parse(b.toSnapshotAt)-Date.parse(a.toSnapshotAt)||a.id.localeCompare(b.id));
 const byLot=new Map(),kept=[];
 for(const e of all){
  const count=byLot.get(e.id)||0;
  if(count>=4)continue;
  byLot.set(e.id,count+1);kept.push(e);
  if(kept.length>=1000)break;
 }
 return {schemaVersion:1,kind:'observed_snapshot_prices',source:'courtauction.go.kr',
  partialCoverage:true,legalStatusVerified:false,note:'부분수집 시각별 최저매각가 값 차이. 유찰·매각·취하나 공식 기일변경을 확인한 기록이 아님',
  events:kept};
}
if(require.main===module){
 const [previousPath,currentPath,historyPath]=process.argv.slice(2);
 if(!previousPath||!currentPath||!historyPath)throw Error('Usage: record-capital-price-history PREV CURRENT HISTORY');
 const previous=JSON.parse(fs.readFileSync(previousPath,'utf8'));
 const current=JSON.parse(fs.readFileSync(currentPath,'utf8'));
 const existing=fs.existsSync(historyPath)?JSON.parse(fs.readFileSync(historyPath,'utf8')):undefined;
 const history=updateHistory(previous,current,existing);
 fs.writeFileSync(historyPath,JSON.stringify(history,null,2)+'\n');
 console.log('PASS snapshot price observation events:',history.events.length,'official outcome NEVER inferred');
}
module.exports={updateHistory};
