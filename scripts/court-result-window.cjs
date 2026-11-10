'use strict';
// Conservative diagnostic sampling window only; NOT an assertion of official
// publication policy. Never infer sale, withdrawal, or success from no result.
function resultWindow(saleDate,today){
 const parse=s=>{
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  const [y,m,d]=s.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()+1!==m||date.getUTCDate()!==d)return null;
  return date.getTime()/86400000;
 };
 const from=parse(saleDate),now=parse(today);
 if(from===null||now===null)return {eligible:false,reason:'invalid_calendar_date',daysSinceSale:null};
 const days=now-from;
 return {eligible:days>=1&&days<=7,
  reason:days<1?'before_result_publication_window':days>7?'outside_conservative_result_window':'within_conservative_result_window',
  daysSinceSale:days,legalStatusVerified:false};
}
module.exports={resultWindow};
