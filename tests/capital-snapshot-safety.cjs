'use strict';
const assert=require('node:assert/strict');
const {validateSnapshot}=require('../scripts/validate-capital-snapshot.cjs');
const regions=['서울','경기','인천'];
const prefix={서울:'서울특별시',경기:'경기도',인천:'인천광역시'};
function fixture(){
 const items=[];
 for(let r=0;r<regions.length;r++)for(let i=1;i<=80;i++){
  const region=regions[r],caseNo='2026타경'+String(r*1000+i);
  items.push({id:'court-B000210|'+caseNo+'|1',region,courtCode:'B000210',caseNo,itemNo:'1',address:prefix[region]+' 시험구 시험동 '+i,appraisalWon:100000000,minimumWon:80000000,saleDate:'2026-12-10',largeCode:'20000',mediumCode:'20100',smallCode:'20104'});
 }
 return {schemaVersion:1,complete:false,scope:'서울·경기·인천',collectionMode:'limited-pages-pilot',source:'courtauction.go.kr',fetchedAt:new Date().toISOString(),items,regions:Object.fromEntries(regions.map(x=>[x,{returned:80,processedPages:2,total:500}]))};
}
const prev=fixture();
assert.equal(validateSnapshot(fixture(),prev).ok,true,'identical valid snapshot should pass');
const abrupt=fixture();abrupt.items=abrupt.items.filter(x=>x.region!=='서울').concat(abrupt.items.filter(x=>x.region==='서울').slice(0,35));abrupt.regions['서울'].returned=80;
assert.equal(validateSnapshot(abrupt,prev).ok,false,'abrupt regional drop at same coverage must fail');
const badPages=fixture();badPages.regions['서울'].returned=101;
assert.equal(validateSnapshot(badPages,prev).ok,false,'page-to-row mismatch must fail');
const future=fixture();future.fetchedAt=new Date(Date.now()+60*60*1000).toISOString();
assert.equal(validateSnapshot(future,prev).ok,false,'future timestamps must fail');
const normal=fixture();normal.items=normal.items.filter(x=>x.region!=='서울').concat(normal.items.filter(x=>x.region==='서울').slice(0,60));normal.regions['서울'].returned=60;
assert.equal(validateSnapshot(normal,prev).ok,true,'moderate sample changes must remain possible');
// A limited-page sample may have fewer total lots while some old IDs leave
// the visible pages and new IDs enter. This is NOT evidence of a legal result.
const turnover=fixture();
const oldSeoul=turnover.items.filter(x=>x.region==='서울');
turnover.items=turnover.items.filter(x=>!oldSeoul.slice(0,10).some(y=>y.id===x.id));
for(let i=1;i<=7;i++){
 const caseNo='2026타경'+String(9000+i);
 turnover.items.push({id:'court-B000210|'+caseNo+'|1',region:'서울',courtCode:'B000210',
  caseNo,itemNo:'1',address:'서울특별시 시험구 시험동 신규'+i,
  appraisalWon:100000000,minimumWon:80000000,saleDate:'2026-12-10',
  largeCode:'20000',mediumCode:'20100',smallCode:'20104'});
}
const comparison=validateSnapshot(turnover,prev);
assert.equal(comparison.ok,true,'normal partial-page turnover must not block a safe collection');
assert.equal(turnover.items.length,prev.items.length-3,'sample count should fall by 3');
assert.equal(comparison.summary.overlap,prev.items.length-10);
assert.equal(comparison.summary.notSeenInNewSample,10,'missing means out of snapshot, not withdrawn');
assert.equal(comparison.summary.changed,0);
assert(comparison.warnings.some(w=>w.includes('보이지 않는 물건 10건')));
assert(comparison.summary.note.includes('현재 매각 상태를 보증하지 않음'));

console.log('PASS: regional drop, page count, timestamp and normal collection safety checks and safe sample turnover');
