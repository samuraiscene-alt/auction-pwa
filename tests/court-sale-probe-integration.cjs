'use strict';
// Full end-to-end diagnostic test with mocked court server. NO external requests.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const modules=new Map([
 ['validate-court-sale-result-search.cjs',require('../scripts/validate-court-sale-result-search.cjs')],
 ['court-result-window.cjs',require('../scripts/court-result-window.cjs')],
 ['compare-court-sale-result-detail.cjs',require('../scripts/compare-court-sale-result-detail.cjs')],
 ['validate-court-sale-preflight.cjs',require('../scripts/validate-court-sale-preflight.cjs')]
]);
const code=fs.readFileSync(path.join(__dirname,'../scripts/probe-court-sale-result-search.cjs'),'utf8');
class Tomorrow extends Date{
 constructor(...args){super(...(args.length?args:['2026-11-11T00:30:00.000Z']));}
}
const internal='20250130000953';
const lot={cortOfcCd:'B000210',csNo:internal,dspslGdsSeq:'1'};
const freshDetail={status:200,data:{dma_csBasInf:{cortOfcCd:lot.cortOfcCd,csNo:internal},
 dlt_dspslGdsDspslObjctLst:[lot],
 dlt_rletCsGdsDtsDxdyInf:[{...lot,dxdyYmd:'20261110',auctnDxdyRsltCd:'R1'}]}};
const result={status:200,data:{dlt_srchResult:[{
 boCd:'B000210',srnSaNo:'2025타경953',maemulSer:'1',saNo:internal,
 dxdyYmd:'20261110',auctnDxdyRsltCd:'R1',privateName:'MUST_NOT_BE_REPORTED'
}]}};
async function simulate({details=freshDetail,search=result,fail=false}={}){
 const messages=[],calls=[];
 const fetch=async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body)});
  if(fail)throw Error('network_error');
  const body=calls.length===1?details:search;
  return {ok:true,headers:{get:()=> 'application/json'},json:async()=>body};
 };
 const sandbox={
  require(name){const mod=modules.get(name.replace('./',''));assert(mod,'unexpected dependency');return mod;},
  module:{exports:{}},process:{exitCode:0},console:{log:x=>messages.push(x)},
  fetch,Date:Tomorrow,Intl,AbortController,setTimeout:()=>1,clearTimeout:()=>{}
 };
 const main=vm.runInNewContext(code+'\nmain',{...sandbox},{filename:'probe-court-sale-result-search.cjs'});
 await main();
 assert.equal(messages.length,1,'exactly one bounded JSON response required');
 const report=JSON.parse(messages[0]);
 assert.equal(report.legalStatusVerified,false);
 assert.equal(report.rawResponseSaved,false);
 assert(!messages[0].includes('MUST_NOT_BE_REPORTED'),'private source response leaked');
 return {report,calls,exitCode:sandbox.process.exitCode};
}
(async()=>{
 const good=await simulate();
 assert.equal(good.calls.length,2);
 assert(good.calls[0].url.includes('selectAuctnCsSrchRslt.on'),'detail must be first');
 assert(good.calls[1].url.includes('selectDspslSchdRsltSrch.on'),'sale search must be second');
 assert.equal(good.report.schedulePreflightConfirmed,true);
 assert.equal(good.report.detailCrossChecked,true);
 assert.equal(good.report.rawResultCodeMatched,true);
 assert.equal(good.report.scheduleDayMatched,true);
 assert.equal(good.exitCode,0);

 // Two distinct components with one lot number must remain intact and
 // still allow exactly one schedule/result cross-check (not a legal verdict).
 const components=structuredClone(freshDetail);
 components.data.dlt_dspslGdsDspslObjctLst=[
  {...lot,component:'land'},{...lot,component:'building'}
 ];
 const multi=await simulate({details:components});
 assert.equal(multi.calls.length,2);
 assert.equal(multi.report.schedulePreflightConfirmed,true);
 assert.equal(multi.report.multiComponentLot,true);
 assert.equal(multi.report.detailCrossChecked,true);
 assert.equal(multi.report.legalStatusVerified,false);

 // A true duplicated row must fail closed before any sale-result request.
 const duplicates=structuredClone(freshDetail);
 duplicates.data.dlt_dspslGdsDspslObjctLst=[{...lot},{...lot}];
 const dup=await simulate({details:duplicates});
 assert.equal(dup.calls.length,1);
 assert.equal(dup.report.reason,'detail_lot_unverified');
 assert.equal(dup.report.lotRowsIdentical,true);
 assert.equal(dup.report.legalStatusVerified,false);

 // Two distinct components do not override an ambiguous sale-date history.
 const doubleSchedule=structuredClone(components);
 doubleSchedule.data.dlt_rletCsGdsDtsDxdyInf.push(
  {...doubleSchedule.data.dlt_rletCsGdsDtsDxdyInf[0]});
 const ambiguous=await simulate({details:doubleSchedule});
 assert.equal(ambiguous.calls.length,1);
 assert.equal(ambiguous.report.reason,'schedule_day_not_unique');
 assert.equal(ambiguous.report.legalStatusVerified,false);

 const shifted=structuredClone(freshDetail);
 shifted.data.dlt_rletCsGdsDtsDxdyInf[0].dxdyYmd='20261117';
 const stale=await simulate({details:shifted});
 assert.equal(stale.calls.length,1,'changed schedule must block sale query');
 assert.equal(stale.report.reason,'snapshot_schedule_changed_or_unconfirmed');
 assert.equal(stale.report.detailCrossChecked,undefined);

 const earlier=structuredClone(result);
 earlier.data.dlt_srchResult[0].dxdyYmd='20261015';
 const prior=await simulate({search:earlier});
 assert.equal(prior.calls.length,2);
 assert.equal(prior.report.detailCrossChecked,false);
 assert.equal(prior.report.detailCrossCheckReason,'result_schedule_not_target_date');

 const failed=await simulate({fail:true});
 assert.equal(failed.calls.length,1,'no network retries');
 assert.equal(failed.exitCode,1);
 assert.equal(failed.report.observed,false);
 assert.equal(failed.report.failedStage,'detail_preflight');
 console.log('PASS official sale diagnostic mocked end-to-end: good, changed date, old session, network failure');
})().catch(error=>{console.error(error);process.exitCode=1;});
