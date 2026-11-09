#!/usr/bin/env node
'use strict';
// Read-only, ONE official court case request per invocation.
// Diagnostic only: never infers status codes, saves raw personal data,
// or writes production listings. No retries and no bypass on denial.
const ENDPOINT='https://www.courtauction.go.kr/pgj/pgj15A/selectAuctnCsSrchRslt.on';
const IDENTIFIER=/^court-(B\d{6})\|(20\d{2}타경\d{1,10})\|([1-9]\d{0,3})$/;
function describeResponse(json){
 const isObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const data=isObject(json?.data)?json.data:{};
 const entries=Object.entries(data).slice(0,60).map(([key,value])=>({
  key,kind:Array.isArray(value)?'array':value===null?'null':typeof value,
  rows:Array.isArray(value)?value.length:undefined,
  fields:Array.isArray(value)&&isObject(value[0])?Object.keys(value[0]).slice(0,100):isObject(value)?Object.keys(value).slice(0,100):undefined
 }));
 const statusKeys=new Set(['mulStatcd','mulStatCd','maemulStatCd','dspslGdsStCd','csStatCd','csStCd']);
 const possibleStatusFields=entries.flatMap(entry=>(entry.fields||[])
  .filter(key=>statusKeys.has(key)||/stat|stcd|status|상태/i.test(key))
  .map(key=>entry.key+'.'+key)).slice(0,80);
 return {httpPayloadStatus:typeof json?.status==='string'||typeof json?.status==='number'?String(json.status):'not-present',
  blocked:data.ipcheck===false||json?.ipcheck===false,
  plausibleResponse:String(json?.status)==='200'&&Object.values(data).some(x=>Array.isArray(x)?x.some(y=>isObject(y)&&Object.keys(y).length>0):isObject(x)&&Object.keys(x).length>0),
  sections:entries,possibleStatusFields,
  note:'응답 구조만 진단. 사건/물건 신원 및 상태코드 의미를 검증하지 않았으며 자동 판정 금지.'};
}
// Strict identity checks only; never output original response values.
function assessIdentity(json,{courtCode,caseNo,itemNo}){
 const data=json&&typeof json.data==='object'&&!Array.isArray(json.data)?json.data:{};
 const records=Object.values(data).flatMap(value=>Array.isArray(value)?value:[value])
  .filter(value=>value&&typeof value==='object'&&!Array.isArray(value));
 const get=(record,keys)=>keys.map(k=>record[k]).find(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
 const matchesCase=record=>String(get(record,['cortOfcCd','boCd'])??'')===courtCode&&
   String(get(record,['csNo','srnSaNo'])??'')===caseNo;
 const caseMatch=records.some(matchesCase);
 // Different response sections may contain case and lot rows.
 // A lot identifier matches only if its own row also carries the same case identity.
 const lotMatch=records.some(record=>matchesCase(record)&&
   String(get(record,['dspslGdsSeq','maemulSer','mokmulSer'])??'')===itemNo);
 const base=data.dma_csBasInf&&typeof data.dma_csBasInf==='object'&&!Array.isArray(data.dma_csBasInf)?data.dma_csBasInf:null;
 const rawCase=base?.csNo;
 const responseCaseFormat=typeof rawCase==='string'?
   (/^20\d{2}타경\d{1,10}$/.test(rawCase)?'display_case':/^\d{8,20}$/.test(rawCase)?'digits_only':'other'):
   typeof rawCase==='number'?'number':rawCase==null?'missing':'other';
 return {caseIdentityMatched:caseMatch,lotIdentityMatched:lotMatch,responseCaseFormat,
  statusDecisionAllowed:false,note:'신원 일치 여부만 진단. 실제 상태코드 의미 검증 전이므로 판정 금지.'};
}
async function main(){
 const id=process.argv[2];
 const match=IDENTIFIER.exec(id||'');
 if(!match){console.error('Usage: node scripts/probe-court-case-status.cjs "court-B000210|2026타경12345|1"');process.exitCode=2;return;}
 const [,courtCode,caseNo,itemNo]=match;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(ENDPOINT,{
   method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8',Accept:'application/json',
    Referer:'https://www.courtauction.go.kr/pgj/index.on'},
   body:JSON.stringify({dma_srchCsDtlInf:{cortOfcCd:courtCode,csNo:caseNo}}),
   signal:controller.signal
  });
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  if(!type.includes('json'))throw Error('non-JSON response');
  const json=await response.json();
  const summary=describeResponse(json);
  if(summary.blocked)throw Error('court access rejected; no retries');
  if(!summary.plausibleResponse)throw Error('court response schema not verified; no status inference');
  const identity=assessIdentity(json,{courtCode,caseNo,itemNo});
  if(!identity.caseIdentityMatched){
    console.log(JSON.stringify({caseIdentityMatched:false,lotIdentityMatched:false,statusDecisionAllowed:false,structuralSummary:summary},null,2));
    throw Error('case identity not matched; structural field names only reported');
  }
  console.log(JSON.stringify({requestedCase:caseNo,requestedCourt:courtCode,...identity,...summary},null,2));
  if(!identity.lotIdentityMatched)console.error('Lot identity not matched: case-level schema only, no lot status verified.');
 }catch(error){console.error('Probe not verified:',String(error?.message||error).slice(0,180));process.exitCode=1;}
 finally{clearTimeout(timeout);}
}
module.exports={describeResponse,assessIdentity};
if(require.main===module)main();
