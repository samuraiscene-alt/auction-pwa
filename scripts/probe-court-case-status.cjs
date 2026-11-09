#!/usr/bin/env node
'use strict';
// Read-only, ONE official court case request per invocation.
// Diagnostic only: never infers status codes, saves raw personal data,
// or writes production listings. No retries and no bypass on denial.
const fs=require('node:fs');
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
  sections:entries,possibleStatusFields,
  note:'응답 구조만 진단. 사건/물건 신원 및 상태코드 의미를 검증하지 않았으며 자동 판정 금지.'};
}
async function main(){
 const id=process.argv[2];
 const match=IDENTIFIER.exec(id||'');
 if(!match){console.error('Usage: node scripts/probe-court-case-status.cjs "court-B000210|2026타경12345|1"');process.exitCode=2;return;}
 const [,courtCode,caseNo]=match;
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
  console.log(JSON.stringify({requestedCase:caseNo,requestedCourt:courtCode,lotIdentityNotVerified:true,...summary},null,2));
 }catch(error){console.error('Probe not verified:',String(error?.message||error).slice(0,180));process.exitCode=1;}
 finally{clearTimeout(timeout);}
}
module.exports={describeResponse};
if(require.main===module)main();
