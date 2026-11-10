#!/usr/bin/env node
'use strict';
// ONE official read-only sale-result search, zero retries.
// Inputs fixed to a previously cross-checked sample lot.
const {analyzeSaleResultSearch}=require('./validate-court-sale-result-search.cjs');
const {resultWindow}=require('./court-result-window.cjs');
// Known existing court snapshot lot; court sale date may change before the auction.
const id={courtCode:'B000210',caseNo:'2025타경953',itemNo:'1'};
const snapshotSaleDate='2026-11-10';
// Exact search fields observed in official PGJ158M02.xml as of 2026-11-10.
// Previous PGJ151M01 47-field payload was not valid evidence of sale results.
const KEYS=[
'aeeEvlAmtMax','aeeEvlAmtMin','auctnGdsStatCd','cortOfcCd',
'cortStDvs','csNo','dspslAmtMax','dspslAmtMin','flbdNcntMax','flbdNcntMin',
'jdbnCd','lafjOrderBy','lclDspslGdsLstUsgCd','mclDspslGdsLstUsgCd',
'pgmId','rdnmNo','rdnmSdCd','rdnmSggCd','rprsAdongEmdCd','rprsAdongSdCd',
'rprsAdongSggCd','sclDspslGdsLstUsgCd','statNum'
];
async function main(){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const window=resultWindow(snapshotSaleDate,today);
 if(!window.eligible){
  console.log(JSON.stringify({schemaVersion:1,observed:false,reason:window.reason,
   daysSinceSale:window.daysSinceSale,windowPolicy:'conservative_diagnostic_1_to_7_days',
   identityMatched:false,legalStatusVerified:false,rawResponseSaved:false}));
  return;
 }
 let stage='connect';
 const ctrl=new AbortController();
 const timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const info=Object.fromEntries(KEYS.map(x=>[x,'']));
  Object.assign(info,{pgmId:'PGJ158M02',cortOfcCd:id.courtCode,csNo:id.caseNo});
  const page={pageNo:'1',pageSize:'50',bfPageNo:'',startRowNo:'1',
   totalCnt:'0',totalYn:'Y',groupTotalCount:''};
  const response=await fetch('https://www.courtauction.go.kr/pgj/pgjsearch/selectDspslSchdRsltSrch.on',{
   method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8',
    Accept:'application/json',Referer:'https://www.courtauction.go.kr/pgj/index.on'},
   body:JSON.stringify({dma_pageInfo:page,dma_srchGdsDtlSrchInfo:info}),signal:ctrl.signal});
  stage='response';
  if(!response.ok)throw Error('http_error');
  if(!(response.headers.get('content-type')||'').includes('json'))throw Error('non_json');
  stage='json';
  const body=await response.json();
  if(body?.data?.ipcheck===false||body?.ipcheck===false)throw Error('access_rejected');
  stage='evaluate';
  const evidence=analyzeSaleResultSearch(body,id);
  console.log(JSON.stringify({schemaVersion:1,...evidence}));
 }catch(e){
  const code=String(e?.cause?.code||'');
  const reason=e?.name==='AbortError'?'timeout':
   ['http_error','non_json','access_rejected'].includes(e?.message)?e.message:
   ['ENOTFOUND','EAI_AGAIN'].includes(code)?'dns_failure':
   ['ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENETUNREACH','UND_ERR_CONNECT_TIMEOUT'].includes(code)?'transport_error':
   e instanceof SyntaxError?'invalid_json':'network_error';
  console.log(JSON.stringify({schemaVersion:1,observed:false,reason,failedStage:stage,
   identityMatched:false,legalStatusVerified:false,rawResponseSaved:false}));
  process.exitCode=1;
 }finally{clearTimeout(timer);}
}
if(require.main===module)main();
