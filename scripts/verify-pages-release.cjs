#!/usr/bin/env node
'use strict';
// Fail closed before GitHub Pages deploys a mismatched PWA release.
// Read repository files only; no network, no personal records, no mutation.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const read=path=>fs.readFileSync(path,'utf8');
function verifyRelease(){
 const version=read('VERSION.txt').trim().split(/\s+/)[0];
 assert.match(version,/^\d+\.\d+\.\d+$/,'version file malformed');
 const app=read('app.js'),sw=read('sw.js'),html=read('index.html');
 assert(app.includes("const APP_VERSION='"+version+"'"),'app version mismatch');
 const cache='auction-shell-v'+version.split('.').map(Number).map((v,i)=>i===0?String(v):String(v)).join('');
 assert(sw.includes("const CACHE='"+cache+"'"),'service worker cache version mismatch');
 assert(html.includes('src="app.js"'),'index does not load app.js');
 assert(html.includes('href="style.css"'),'index does not load stylesheet');
 for(const path of ['index.html','app.js','style.css','sw.js','manifest.webmanifest',
  'data/capital-court-pilot.json','data/capital-court-status.json','data/court-sale-result-status.json'])
  assert(fs.existsSync(path),'required deployment asset missing: '+path);
 for(const path of ['app.js','sw.js'])execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
 const snapshot=JSON.parse(read('data/capital-court-pilot.json'));
 assert(snapshot?.complete===false,'partial snapshot incorrectly marked complete');
 assert([1,2].includes(snapshot.schemaVersion),'snapshot schema mismatch');
 assert(Array.isArray(snapshot.items)&&snapshot.items.length>0&&snapshot.items.length<=5000,'invalid pilot lot count');
 assert(snapshot.validation?.passed===true&&snapshot.validation.validatedItems===snapshot.items.length,
   'court snapshot validation not passed or lot count mismatch');
 const unique=new Set(snapshot.items.map(x=>x?.id));
 assert(unique.size===snapshot.items.length,'duplicate court item identity');
 const result=JSON.parse(read('data/court-sale-result-status.json'));
 assert(result.schemaVersion===1,'court status diagnostic schema mismatch');
 assert(result.legalStatusVerified===false,'unknown court legal status must remain unverified');
 assert(app.includes('법적 상태 검증: 미완료')&&app.includes('단일 사건 진단'),
   'court legal-status warning missing or overstated');
 console.log('PASS predeploy release '+version+': source/cache, shell, partial snapshot, redacted court status');
}
if(require.main===module)verifyRelease();
module.exports={verifyRelease};
