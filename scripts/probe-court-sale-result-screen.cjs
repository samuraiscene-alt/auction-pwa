#!/usr/bin/env node
'use strict';
// One official READ-ONLY WebSquare XML fetch. No case/user data is requested.
// Publish only fixed-pattern API paths, data-map IDs and response diagnostics.
const SCREEN='PGJ158M02';
const URL='https://www.courtauction.go.kr/pgj/ui/pgj100/'+SCREEN+'.xml';
const allowedPath=/^\/pgj\/[A-Za-z0-9]+\/[A-Za-z0-9]+\.on$/;
const safeIds=text=>[...new Set([...text.matchAll(/\b(?:id|name)\s*=\s*["'](dma_[A-Za-z0-9_]{1,60}|dlt_[A-Za-z0-9_]{1,60})["']/g)].map(x=>x[1]))].slice(0,50);
// Only metadata: find identifiers bound to the result-search data map without
// logging XML snippets, labels, court/party data or JavaScript expressions.
function searchFieldNames(raw){
 const blocks=[];
 const re=/<(?:[A-Za-z0-9_]+:)?dataMap\b[^>]*\bid\s*=\s*["']dma_srchGdsDtlSrchInfo["'][^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?dataMap>/g;
 for(const m of raw.matchAll(re))blocks.push(m[1]);
 const collected=new Set();
 for(const block of blocks.slice(0,3)){
  for(const m of block.matchAll(/<(?:[A-Za-z0-9_]+:)?(?:key|column|field)\b[^>]*\b(?:id|name)\s*=\s*["']([A-Za-z][A-Za-z0-9_]{1,50})["']/g)){
   collected.add(m[1]);
   if(collected.size>=80)break;
  }
 }
 // On some WebSquare screens the fields are declared by full expression.
 for(const m of raw.matchAll(/\bdma_srchGdsDtlSrchInfo\.([A-Za-z][A-Za-z0-9_]{1,50})/g)){
  collected.add(m[1]);
  if(collected.size>=80)break;
 }
 return [...collected].sort().slice(0,80);
}
async function main(){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const response=await fetch(URL,{headers:{Accept:'application/xml,text/xml,*/*',Referer:'https://www.courtauction.go.kr/pgj/index.on'},signal:ctrl.signal});
  if(!response.ok)throw Error('http_error');
  const kind=(response.headers.get('content-type')||'').toLowerCase();
  if(!kind.includes('xml')&&!kind.includes('text/plain'))throw Error('not_xml');
  const raw=await response.text();
  if(raw.length>600000)throw Error('oversize');
  if(!raw.includes('<')||!raw.includes(SCREEN))throw Error('unexpected_document');
  const paths=[...new Set([...raw.matchAll(/\/pgj\/[A-Za-z0-9]+\/[A-Za-z0-9]+\.on/g)].map(x=>x[0]).filter(x=>allowedPath.test(x)))].slice(0,20);
  console.log(JSON.stringify({schemaVersion:1,observed:true,screen:SCREEN,
    saleResultSearchEndpointPresent:paths.includes('/pgj/pgjsearch/selectDspslSchdRsltSrch.on'),
    officialApiPaths:paths,dataMapIds:safeIds(raw),
    officialSearchFieldNames:searchFieldNames(raw),
    screenReferences:[...new Set([...raw.matchAll(/PGJ158[A-Z0-9]{2,8}(?:\\.xml)?/g)].map(m=>m[0]))].slice(0,12),
    markers:{
      saleResultEndpointNameSeen:raw.includes('selectDspslSchdRsltSrch'),
      searchControllerSeen:raw.includes('searchControllerMain'),
      submissionTagSeen:raw.includes('submission'),
      scriptTagSeen:raw.includes('<script'),
      nestedFrameSeen:raw.includes('w2:iframe')||raw.includes('w2:frame')
    },
    rawDocumentSaved:false,legalStatusVerified:false}));
 }catch(e){
  const reason=e?.name==='AbortError'?'timeout':
   ['http_error','not_xml','oversize','unexpected_document'].includes(e?.message)?e.message:'network_error';
  console.log(JSON.stringify({schemaVersion:1,observed:false,screen:SCREEN,
   reason,officialApiPaths:[],dataMapIds:[],rawDocumentSaved:false,legalStatusVerified:false}));
  process.exitCode=1;
 }finally{clearTimeout(timer);}
}
if(require.main===module)main();
