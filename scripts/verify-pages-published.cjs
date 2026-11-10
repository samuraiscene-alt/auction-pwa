#!/usr/bin/env node
'use strict';
// Verify the actual publicly deployed GitHub Pages files, not only repository
// source files. Never read or send user data or private court case records.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {setTimeout:wait}=require('node:timers/promises');

function pageBase(input){
 const url=new URL(input);
 if(url.protocol!=='https:'||url.hostname!=='samuraiscene-alt.github.io'||
    !/^\/auction-pwa\/?$/.test(url.pathname))
  throw Error('unexpected_pages_origin_or_path');
 return 'https://samuraiscene-alt.github.io/auction-pwa/';
}

async function fetchText(fetcher,base,path,attempt){
 const url=base+path+'?deployment_check='+attempt;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetcher(url,{cache:'no-store',redirect:'error',
   headers:{Accept:'text/plain,*/*'},signal:controller.signal});
  if(!response.ok)throw Error(path+'_http_'+response.status);
  const size=Number(response.headers.get('content-length'));
  if(Number.isFinite(size)&&size>2000000)throw Error(path+'_oversize');
  const data=await response.text();
  if(data.length>2000000)throw Error(path+'_oversize');
  return data;
 }finally{clearTimeout(timer);}
}

async function verifyPublished(base,expected,fetcher=fetch,attempt=1){
 const version=(await fetchText(fetcher,base,'VERSION.txt',attempt)).trim().split(/\s+/)[0];
 assert.equal(version,expected,'deployed_version_not_current');
 const app=await fetchText(fetcher,base,'app.js',attempt);
 assert(app.includes("const APP_VERSION='"+expected+"'"),'deployed_app_version_mismatch');
 assert(app.includes('법적 상태 검증: 미완료'),'deployed_court_safety_warning_missing');
 assert(app.includes('단일 사건 진단'),'deployed_court_scope_warning_missing');
 const sw=await fetchText(fetcher,base,'sw.js',attempt);
 const cache='auction-shell-v'+expected.split('.').join('');
 assert(sw.includes("const CACHE='"+cache+"'"),'deployed_service_worker_cache_mismatch');
 return {verified:true,version:expected,courtLegalStatusAutoVerified:false};
}

async function main(){
 const base=pageBase(process.argv[2]||'');
 const expected=fs.readFileSync('VERSION.txt','utf8').trim().split(/\s+/)[0];
 assert.match(expected,/^\d+\.\d+\.\d+$/);
 let error;
 for(let n=1;n<=5;n++){
  try{
   const result=await verifyPublished(base,expected,fetch,n);
   console.log('PASS published Pages version='+result.version+
    ', app safety warning present, SW cache matched; legal outcome NOT verified');
   return;
  }catch(e){
   error=e;
   console.error('Attempt '+n+'/5: '+String(e?.message||e).slice(0,150));
   if(n<5)await wait(15000);
  }
 }
 throw Error('published_site_verification_failed: '+String(error?.message||error).slice(0,150));
}
if(require.main===module)main().catch(e=>{console.error(String(e?.message||e));process.exitCode=1;});
module.exports={pageBase,verifyPublished};
