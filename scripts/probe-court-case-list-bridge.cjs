#!/usr/bin/env node
'use strict';
// One read-only court LIST query to seek a direct display-to-internal case mapping.
// A missing/mismatched row is NOT evidence of withdrawal or sale.
// Nothing is persisted; output is strictly Boolean/field-name diagnostics.
const {assessSearchBridge,assessCrossBridge}=require('./validate-court-case-bridge.cjs');
const CASE=/^court-(B\d{6})\|(20\d{2}타경\d{1,10})\|([1-9]\d{0,3})$/;
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
// One deadline for each official call; no retries or data persistence.
async function timedPost(url,options){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{return await fetch(url,{...options,signal:controller.signal});}
 finally{clearTimeout(timer);}
}
async function main(){
 const match=CASE.exec(process.argv[2]||'');
 if(!match){console.error('BRIDGE_REASON=invalid_input');process.exitCode=2;return;}
 const [,courtCode,caseNo,itemNo]=match;
 let stage='list';
 try{
  const info=Object.fromEntries(KEYS.map(key=>[key,'']));
  Object.assign(info,{mvprpRletDvsCd:'00031R',cortAuctnSrchCondCd:'0004601',
   pgmId:'PGJ151M01',notifyLoc:'Y',cortOfcCd:courtCode,csNo:caseNo});
  const page={pageNo:'1',pageSize:'50',bfPageNo:'',startRowNo:'1',
   totalCnt:'0',totalYn:'Y',groupTotalCount:''};
  const response=await timedPost('https://www.courtauction.go.kr/pgj/pgjsearch/searchControllerMain.on',{
   method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8',
    Accept:'application/json',Referer:'https://www.courtauction.go.kr/pgj/index.on'},
   body:JSON.stringify({dma_pageInfo:page,dma_srchGdsDtlSrchInfo:info})});
  if(!response.ok)throw Error('http_error');
  if(!(response.headers.get('content-type')||'').includes('json'))throw Error('non_json');
  const data=await response.json();
  if(data?.data?.ipcheck===false||data?.ipcheck===false)throw Error('access_rejected');
  if(String(data?.status)!=='200'||!Array.isArray(data?.data?.dlt_srchResult))
    throw Error('invalid_response');
  const rows=data.data.dlt_srchResult;
  const list=assessSearchBridge(rows,{courtCode,caseNo,itemNo});
  if(list.exactDisplayLotRows!==1){
    console.log(JSON.stringify({...list,detailCaseCrossChecked:false,legalStatusVerified:false}));
    return;
  }
  // Second and final official request; no retries, no saved source response.
  stage='detail';
  const detailResponse=await timedPost('https://www.courtauction.go.kr/pgj/pgj15A/selectAuctnCsSrchRslt.on',{
   method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8',
    Accept:'application/json',Referer:'https://www.courtauction.go.kr/pgj/index.on'},
   body:JSON.stringify({dma_srchCsDtlInf:{cortOfcCd:courtCode,csNo:caseNo}})});
  if(!detailResponse.ok)throw Error('detail_http_error');
  if(!(detailResponse.headers.get('content-type')||'').includes('json'))throw Error('detail_non_json');
  const detail=await detailResponse.json();
  if(detail?.data?.ipcheck===false||detail?.ipcheck===false)throw Error('access_rejected');
  if(String(detail?.status)!=='200'||!detail?.data?.dma_csBasInf)throw Error('detail_invalid_response');
  const comparison=assessCrossBridge(rows,detail,{courtCode,caseNo,itemNo});
  console.log(JSON.stringify({...list,...comparison}));
 }catch(error){
  const code=String(error?.cause?.code||'');
  const reason=error?.name==='AbortError'?'timeout':
    ['http_error','non_json','access_rejected','invalid_response','detail_http_error','detail_non_json','detail_invalid_response'].includes(error?.message)?error.message:
    ['ENOTFOUND','EAI_AGAIN'].includes(code)?'dns_failure':
    ['ECONNRESET','ETIMEDOUT','ENETUNREACH','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(code)?'transport_error':'network_error';
  console.error('BRIDGE_REASON='+reason);
  console.error('BRIDGE_STAGE='+stage);
  process.exitCode=1;
 }
}
if(require.main===module)main();
