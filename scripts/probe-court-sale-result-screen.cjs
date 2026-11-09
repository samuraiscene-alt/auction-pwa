#!/usr/bin/env node
'use strict';
// One official READ-ONLY WebSquare XML fetch. No case/user data is requested.
// Publish only fixed-pattern API paths, data-map IDs and response diagnostics.
const URL='https://www.courtauction.go.kr/pgj/ui/pgj100/PGJ158M01.xml';
const allowedPath=/^\/pgj\/[A-Za-z0-9]+\/[A-Za-z0-9]+\.on$/;
const safeIds=text=>[...new Set([...text.matchAll(/\b(?:id|name)\s*=\s*["'](dma_[A-Za-z0-9_]{1,60}|dlt_[A-Za-z0-9_]{1,60})["']/g)].map(x=>x[1]))].slice(0,50);
async function main(){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const response=await fetch(URL,{headers:{Accept:'application/xml,text/xml,*/*',Referer:'https://www.courtauction.go.kr/pgj/index.on'},signal:ctrl.signal});
  if(!response.ok)throw Error('http_error');
  const kind=(response.headers.get('content-type')||'').toLowerCase();
  if(!kind.includes('xml')&&!kind.includes('text/plain'))throw Error('not_xml');
  const raw=await response.text();
  if(raw.length>600000)throw Error('oversize');
  if(!raw.includes('<')||!raw.includes('PGJ158'))throw Error('unexpected_document');
  const paths=[...new Set([...raw.matchAll(/\/pgj\/[A-Za-z0-9]+\/[A-Za-z0-9]+\.on/g)].map(x=>x[0]).filter(x=>allowedPath.test(x)))].slice(0,20);
  console.log(JSON.stringify({schemaVersion:1,observed:true,screen:'PGJ158M01',
    saleResultSearchEndpointPresent:paths.includes('/pgj/pgjsearch/selectDspslSchdRsltSrch.on'),
    officialApiPaths:paths,dataMapIds:safeIds(raw),rawDocumentSaved:false,legalStatusVerified:false}));
 }catch(e){
  const reason=e?.name==='AbortError'?'timeout':
   ['http_error','not_xml','oversize','unexpected_document'].includes(e?.message)?e.message:'network_error';
  console.log(JSON.stringify({schemaVersion:1,observed:false,screen:'PGJ158M01',
   reason,officialApiPaths:[],dataMapIds:[],rawDocumentSaved:false,legalStatusVerified:false}));
  process.exitCode=1;
 }finally{clearTimeout(timer);}
}
if(require.main===module)main();
