#!/usr/bin/env node
'use strict';
// ONE official read-only sale-result search, zero retries.
// Inputs fixed to a previously cross-checked sample lot.
const {analyzeSaleResultSearch}=require('./validate-court-sale-result-search.cjs');
const id={courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'};
const KEYS=[
'rletDspslSpcCondCd','bidDvsCd','mvprpRletDvsCd','cortAuctnSrchCondCd',
'rprsAdongSdCd','rprsAdongSggCd','rprsAdongEmdCd','rdnmSdCd','rdnmSggCd','rdnmNo',
'mvprpDspslPlcAdongSdCd','mvprpDspslPlcAdongSggCd','mvprpDspslPlcAdongEmdCd',
'rdDspslPlcAdongSdCd','rdDspslPlcAdongSggCd','rdDspslPlcAdongEmdCd',
'cortOfcCd','jdbnCd','execrOfcDvsCd','lclDspslGdsLstUsgCd',
'mclDspslGdsLstUsgCd','sclDspslGdsLstUsgCd','cortAuctnMbrsId','aeeEvlAmtMin',
'aeeEvlAmtMax','rletLwsDspslPrcMin','rletLwsDspslPrcMax','mvprpLwsDspslPrcMin',
'mvprpLwsDspslPrcMax','lwsDspslPrcRateMin','lwsDspslPrcRateMax','flbdNcntMin',
'flbdNcntMax','objctArDtsMin','objctArDtsMax','mvprpArtclKndCd','mvprpArtclNm',
'mvprpAtchmPlcTypCd','notifyLoc','lafjOrderBy','pgmId','csNo','cortStDvs',
'statNum','bidBgngYmd','bidEndYmd'];
async function main(){
 const ctrl=new AbortController();
 const timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const info=Object.fromEntries(KEYS.map(x=>[x,'']));
  Object.assign(info,{mvprpRletDvsCd:'00031R',cortAuctnSrchCondCd:'0004601',
   pgmId:'PGJ158M02',notifyLoc:'Y',cortOfcCd:id.courtCode,csNo:id.caseNo});
  const page={pageNo:'1',pageSize:'50',bfPageNo:'',startRowNo:'1',
   totalCnt:'0',totalYn:'Y',groupTotalCount:''};
  const response=await fetch('https://www.courtauction.go.kr/pgj/pgjsearch/selectDspslSchdRsltSrch.on',{
   method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8',
    Accept:'application/json',Referer:'https://www.courtauction.go.kr/pgj/index.on'},
   body:JSON.stringify({dma_pageInfo:page,dma_srchGdsDtlSrchInfo:info}),signal:ctrl.signal});
  if(!response.ok)throw Error('http_error');
  if(!(response.headers.get('content-type')||'').includes('json'))throw Error('non_json');
  const body=await response.json();
  if(body?.data?.ipcheck===false||body?.ipcheck===false)throw Error('access_rejected');
  const evidence=analyzeSaleResultSearch(body,id);
  console.log(JSON.stringify({schemaVersion:1,...evidence}));
 }catch(e){
  const reason=e?.name==='AbortError'?'timeout':
   ['http_error','non_json','access_rejected'].includes(e?.message)?e.message:
   ['ENOTFOUND','EAI_AGAIN'].includes(e?.cause?.code)?'dns_failure':'network_error';
  console.log(JSON.stringify({schemaVersion:1,observed:false,reason,
   identityMatched:false,legalStatusVerified:false,rawResponseSaved:false}));
  process.exitCode=1;
 }finally{clearTimeout(timer);}
}
if(require.main===module)main();
