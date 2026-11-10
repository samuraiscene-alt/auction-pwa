'use strict';
// Cross-check a SINGLE result-search row against the official case detail.
// No case numbers, people, addresses or unbounded response content returned.
const safeCode=x=>(typeof x==='string'||typeof x==='number')&&/^[A-Za-z0-9_-]{1,24}$/.test(String(x))?String(x):null;
const safeDay=x=>{
 const s=String(x??'');
 if(!/^20\d{6}$/.test(s))return null;
 const y=Number(s.slice(0,4)),m=Number(s.slice(4,6)),d=Number(s.slice(6,8));
 return m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate()?s:null;
};
const fail=reason=>({crossChecked:false,reason,legalStatusVerified:false,legalStatus:null});
function compareSaleSearchWithDetail(search,detail,id){
 if(String(search?.status)!=='200'||String(detail?.status)!=='200'||
    search?.data?.ipcheck===false||detail?.data?.ipcheck===false)
  return fail('unverified_response');
 const rows=search?.data?.dlt_srchResult;
 const base=detail?.data?.dma_csBasInf;
 const lots=detail?.data?.dlt_dspslGdsDspslObjctLst;
 const history=detail?.data?.dlt_rletCsGdsDtsDxdyInf;
 if(!Array.isArray(rows)||rows.length>50||!Array.isArray(lots)||lots.length>300||
    !Array.isArray(history)||history.length>500||!base)
  return fail('invalid_structure');
 const exact=rows.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&
  String(r.boCd??'')===id.courtCode&&String(r.srnSaNo??'')===id.caseNo&&
  String(r.maemulSer??r.mokmulSer??'')===id.itemNo&&
  (r.maemulSer==null||r.mokmulSer==null||String(r.maemulSer)===String(r.mokmulSer))&&
  (r.cortOfcCd==null||String(r.cortOfcCd)===id.courtCode)&&
  (!/^20\d{2}타경\d{1,10}$/.test(String(r.csNo??''))||String(r.csNo)===id.caseNo));
 if(exact.length!==1)return fail('result_identity_not_unique');
 const result=exact[0];
 const internal=String(base.csNo??'');
 if(!/^\d{8,20}$/.test(internal)||String(base.cortOfcCd??'')!==id.courtCode||
  String(result.saNo??'')!==internal)
  return fail('internal_case_not_linked');
 if(!lots.every(r=>r&&String(r.cortOfcCd??'')===id.courtCode&&String(r.csNo??'')===internal))
  return fail('inconsistent_detail_lots');
 const selected=lots.filter(r=>String(r.dspslGdsSeq??'')===id.itemNo);
 if(selected.length!==1)return fail('detail_lot_not_unique');
 const primary=safeDay(result.dxdyYmd);
 const secondary=safeDay(result.maeGiil);
 if(result.dxdyYmd!=null&&result.maeGiil!=null&&(!primary||!secondary||primary!==secondary))
  return fail('contradictory_result_dates');
 const day=primary??secondary;
 if(!day)return fail('result_schedule_day_missing');
 const schedules=history.filter(r=>r&&String(r.cortOfcCd??'')===id.courtCode&&
  String(r.csNo??'')===internal&&String(r.dspslGdsSeq??'')===id.itemNo&&
  safeDay(r.dxdyYmd)===day);
 if(schedules.length!==1)return fail('schedule_not_unique');
 const resultCode=safeCode(result.auctnDxdyRsltCd);
 const detailCode=safeCode(schedules[0].auctnDxdyRsltCd);
 if(!resultCode||!detailCode||resultCode!==detailCode)return fail('result_code_not_confirmed');
 // Detail and result-search agree on one day's raw result code, not its legal meaning.
 return {crossChecked:true,reason:'raw_code_cross_checked',scheduleDayMatched:true,
  rawResultCodeMatched:true,legalStatusVerified:false,legalStatus:null};
}
module.exports={compareSaleSearchWithDetail};
