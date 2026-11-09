#!/usr/bin/env node
'use strict';
/*
 * Metropolitan court search pilot: up to 3 pages x 50 results per province.
 * Snapshot is explicitly partial; no claim of complete metropolitan coverage.
 * Source: courtauction.go.kr PGJ151M01 searchControllerMain.on
 */
const fs=require('node:fs');
const {validateSnapshot}=require('./validate-capital-snapshot.cjs');
const SCHEMA_KEYS=[
'rletDspslSpcCondCd','bidDvsCd','mvprpRletDvsCd','cortAuctnSrchCondCd',
'rprsAdongSdCd','rprsAdongSggCd','rprsAdongEmdCd',
'rdnmSdCd','rdnmSggCd','rdnmNo',
'mvprpDspslPlcAdongSdCd','mvprpDspslPlcAdongSggCd','mvprpDspslPlcAdongEmdCd',
'rdDspslPlcAdongSdCd','rdDspslPlcAdongSggCd','rdDspslPlcAdongEmdCd',
'cortOfcCd','jdbnCd','execrOfcDvsCd',
'lclDspslGdsLstUsgCd','mclDspslGdsLstUsgCd','sclDspslGdsLstUsgCd',
'cortAuctnMbrsId','aeeEvlAmtMin','aeeEvlAmtMax','rletLwsDspslPrcMin',
'rletLwsDspslPrcMax','mvprpLwsDspslPrcMin','mvprpLwsDspslPrcMax',
'lwsDspslPrcRateMin','lwsDspslPrcRateMax','flbdNcntMin','flbdNcntMax',
'objctArDtsMin','objctArDtsMax','mvprpArtclKndCd','mvprpArtclNm',
'mvprpAtchmPlcTypCd','notifyLoc','lafjOrderBy','pgmId','csNo','cortStDvs',
'statNum','bidBgngYmd','bidEndYmd'
];
const REGIONS=[{label:'서울',code:'11'},{label:'경기',code:'41'},{label:'인천',code:'28'}];
const allowedLabels=new Set(REGIONS.map(r=>r.label));
const price=v=>{if(!/^\d{1,15}$/.test(String(v||'')))return null;const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null;};
const itemFrom=(r,region)=>{
 if(!r||typeof r!=='object')return null;
 const code=String(r.boCd||'').trim(),caseNo=String(r.srnSaNo||'').trim();
 const itemNo=String(r.maemulSer||r.mokmulSer||'1').trim();
 const address=[r.hjguSido,r.hjguSigu,r.hjguDong,r.daepyoLotno].filter(v=>typeof v==='string'&&v.trim()).join(' ').trim();
 if(!/^B\d{6}$/.test(code)||!/^20\d{2}타경\d{1,10}$/.test(caseNo)||
    !/^[1-9]\d{0,3}$/.test(itemNo)||!address||address.length>260||
    !address.startsWith(region.label==='서울'?'서울':region.label==='경기'?'경기':'인천'))return null;
 const sale=String(r.maeGiil||'').trim();
 const date=/^20\d{6}$/.test(sale)?sale.slice(0,4)+'-'+sale.slice(4,6)+'-'+sale.slice(6,8):null;
 const id='court-'+code+'|'+caseNo+'|'+itemNo;
 return {id,region:region.label,courtCode:code,courtName:String(r.jiwonNm||'').slice(0,80),
  caseNo,itemNo,address,saleDate:date,appraisalWon:price(r.gamevalAmt),minimumWon:price(r.minmaePrice),
  largeCode:/^\d{5}$/.test(String(r.lclsUtilCd||''))?String(r.lclsUtilCd):null,
  mediumCode:/^\d{5}$/.test(String(r.mclsUtilCd||''))?String(r.mclsUtilCd):null,
  smallCode:/^\d{5}$/.test(String(r.sclsUtilCd||''))?String(r.sclsUtilCd):null};
};
async function search(region,pageNo){
 const info=Object.fromEntries(SCHEMA_KEYS.map(k=>[k,'']));
 Object.assign(info,{mvprpRletDvsCd:'00031R',cortAuctnSrchCondCd:'0004601',
  pgmId:'PGJ151M01',notifyLoc:'Y',rprsAdongSdCd:region.code});
 const payload={dma_pageInfo:{pageNo:String(pageNo),pageSize:'50',bfPageNo:'',startRowNo:String((pageNo-1)*50+1),
  totalCnt:'0',totalYn:pageNo===1?'Y':'N',groupTotalCount:''},dma_srchGdsDtlSrchInfo:info};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
 try{
 const resp=await fetch('https://www.courtauction.go.kr/pgj/pgjsearch/searchControllerMain.on',{
  method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','Accept':'application/json',
  Referer:'https://www.courtauction.go.kr/pgj/index.on'},body:JSON.stringify(payload),signal:controller.signal});
 if(!resp.ok)throw Error('HTTP '+resp.status);
 const json=await resp.json();
 if(String(json.status)!=='200'||!Array.isArray(json?.data?.dlt_srchResult))throw Error('invalid search response');
 const rows=json.data.dlt_srchResult;
 const page=json.data.dma_pageInfo||{};
 const total=Number(page.totalCnt||page.groupTotalCount||0);
 const items=rows.map(row=>itemFrom(row,region)).filter(Boolean);
 const dropped=rows.length-items.length;
 if(rows.length&&dropped/rows.length>0.03)throw Error('too many invalid records '+dropped+'/'+rows.length);
 console.log(region.label,'page',pageNo,'raw count:',rows.length,'usable:',items.length,'reported total:',total);
 if(rows.length&&!items.length)throw Error(region.label+' response fields did not pass validation');
 return {items,count:rows.length,total:Number.isSafeInteger(total)?total:null,signature:rows.map(x=>String(x.docid||'')+'|'+String(x.maemulSer||'')).join(',')};
 }finally{clearTimeout(timer)}
}
(async()=>{
 const regions={};const items=[];const errors=[];const maxPages=3;
 for(const region of REGIONS){
  let total=null,returned=0,processed=0;const signatures=new Set();
  try{
   for(let pageNo=1;pageNo<=maxPages;pageNo++){
    const result=await search(region,pageNo);
    if(signatures.has(result.signature))throw Error('identical page returned twice');
    signatures.add(result.signature);
    returned+=result.count;processed++;
    items.push(...result.items);
    if(pageNo===1)total=result.total;
    if(result.count<50)break;
    await new Promise(resolve=>setTimeout(resolve,600));
   }
   regions[region.label]={returned,total,processedPages:processed};
  }catch(err){errors.push(region.label+': '+String(err.message||err).slice(0,100));console.error('Region failed:',region.label,err.message);}
  await new Promise(resolve=>setTimeout(resolve,700));
 }
 if(errors.length){console.error('Probe incomplete. No output JSON published:',errors.join(' / '));process.exitCode=1;return;}
 const uniqueMap=new Map(),conflicts=[];
 for(const item of items){
  const previous=uniqueMap.get(item.id);
  if(previous&&['address','appraisalWon','minimumWon','saleDate','smallCode'].some(k=>previous[k]!==item[k]))conflicts.push(item.id);
  if(!previous)uniqueMap.set(item.id,item);
 }
 if(conflicts.length){console.error('Conflicting duplicate case/item records:',conflicts.slice(0,10));process.exitCode=1;return;}
 const unique=[...uniqueMap.values()];
 const snapshot={schemaVersion:1,scope:'서울·경기·인천',collectionMode:'limited-pages-pilot',
  complete:false,source:'courtauction.go.kr',fetchedAt:new Date().toISOString(),
  regions,items:unique};
 const target='data/capital-court-pilot.json';
 let previous=null;
 if(fs.existsSync(target)){
  try{previous=JSON.parse(fs.readFileSync(target,'utf8'));}
  catch(error){console.error('Previous snapshot corrupt; refuse to replace:',error.message);process.exitCode=1;return;}
 }
 const result=validateSnapshot(snapshot,previous,{strict:true});
 if(!result.ok){console.error('Safety validation FAILED. Old published snapshot kept:',result.errors);process.exitCode=1;return;}
 snapshot.validation={passed:true,checkedAt:new Date().toISOString(),...result.summary,
  warnings:result.warnings,changeSamples:result.changeSamples};
 fs.mkdirSync('data',{recursive:true});
 fs.writeFileSync(target,JSON.stringify(snapshot,null,2)+'\n');
 console.log('SAFETY PASS',JSON.stringify(result.summary),'warnings',JSON.stringify(result.warnings));
 console.log('Probe data saved:',unique.length,'records, NOT a complete regional catalogue.');
 console.log('Regional unique counts:',JSON.stringify(Object.fromEntries(REGIONS.map(r=>[r.label,new Set(items.filter(x=>x.region===r.label).map(x=>x.id)).size]))));
 console.log('Duplicate IDs count:',items.length-unique.length);
 console.log('Regional totals:',JSON.stringify(regions));
})().catch(e=>{console.error(e);process.exitCode=1});
