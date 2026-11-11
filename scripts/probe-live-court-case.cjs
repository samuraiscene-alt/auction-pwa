'use strict';
// One-off non-blocking, read-only official route probe. Does not claim legal verification.
const cases=[
 {courtCode:'B000210',caseNo:'2025타경103685',itemNo:'1'},
 {courtCode:'B000210',caseNo:'2025타경104110',itemNo:'1'}
];
(async()=>{
 for(const item of cases){
  const u=new URL('https://joon-auction-court.samuraiscene.workers.dev/item');
  Object.entries(item).forEach(([k,v])=>u.searchParams.set(k,v));
  try{
   const response=await fetch(u,{signal:AbortSignal.timeout(12000),headers:{accept:'application/json'}});
   const raw=await response.text();
   let body;try{body=JSON.parse(raw)}catch{body=null}
   const exact=body?.verified===true&&body?.source==='courtauction.go.kr'&&
    body.courtCode===item.courtCode&&body.caseNo===item.caseNo&&
    String(body.itemNo)===item.itemNo;
   const filtered=body?{
    verified:body.verified,source:body.source,courtCode:body.courtCode,
    caseNo:body.caseNo,itemNo:body.itemNo,appraisalWon:body.appraisalWon,
    minimumWon:body.minimumWon,saleDate:body.saleDate,
    error:body.error||body.message||null
   }:{responseExcerpt:raw.slice(0,300)};
   console.log(JSON.stringify({status:response.status,exact,request:item,result:filtered}));
  }catch(err){console.log(JSON.stringify({request:item,exact:false,error:String(err.message||err)}))}
 }
})().catch(e=>{console.log('probe_error '+String(e));});
