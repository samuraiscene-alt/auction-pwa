'use strict';
const assert=require('node:assert/strict');
const {pageBase,verifyPublished}=require('../scripts/verify-pages-published.cjs');
const base='https://samuraiscene-alt.github.io/auction-pwa/';
assert.equal(pageBase(base),base);
for(const input of ['http://samuraiscene-alt.github.io/auction-pwa/',
 'https://example.com/auction-pwa/',
 'https://samuraiscene-alt.github.io/other/',
 'https://samuraiscene-alt.github.io/auction-pwa/sub/']){
 assert.throws(()=>pageBase(input));
}
const version='0.7.6',cache='auction-shell-v076';
const responses={'VERSION.txt':version+'\n','app.js':"const APP_VERSION='0.7.6'; 법적 상태 검증: 미완료 단일 사건 진단",
 'sw.js':"const CACHE='"+cache+"';"};
const fetcher=async url=>{
 const pathname=new URL(url).pathname.split('/').at(-1);
 return {ok:true,headers:{get:()=>null},text:async()=>responses[pathname]};
};
(async()=>{
 const valid=await verifyPublished(base,version,fetcher);
 assert.equal(valid.verified,true);
 assert.equal(valid.courtLegalStatusAutoVerified,false);
 for(const [path,value] of [
  ['VERSION.txt','0.7.5'],['app.js',"const APP_VERSION='0.7.6';"],
  ['sw.js',"const CACHE='auction-shell-v075';"]]){
  const original=responses[path];responses[path]=value;
  await assert.rejects(verifyPublished(base,version,fetcher));
  responses[path]=original;
 }
 const redirect=async()=>({ok:false,status:404,headers:{get:()=>null}});
 await assert.rejects(verifyPublished(base,version,redirect));
 console.log('PASS: published Pages version, app warning and SW cache checks fail closed');
})().catch(e=>{console.error(e);process.exitCode=1;});
