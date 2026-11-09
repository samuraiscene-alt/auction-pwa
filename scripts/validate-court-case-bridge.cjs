'use strict';
// Validate direct court LIST row binding. The internal case ID is never output.
// A matching display case MUST be on the SAME court + lot row.
function assessSearchBridge(rows,{courtCode,caseNo,itemNo}){
 if(!Array.isArray(rows)||rows.length>50)throw Error('invalid_rows');
 const all=rows.filter(r=>r&&typeof r==='object'&&!Array.isArray(r));
 const exact=all.filter(r=>String(r.boCd??'')===courtCode&&
  String(r.srnSaNo??'')===caseNo&&String(r.maemulSer??r.mokmulSer??'')===itemNo);
 const getInternal=r=>String(r.csNo??'').trim();
 const internal=exact.map(getInternal).filter(x=>/^\d{8,20}$/.test(x));
 const distinct=[...new Set(internal)];
 return {
  schemaVersion:1,
  exactDisplayLotRows:exact.length,
  directInternalCaseMapping:exact.length===1&&distinct.length===1,
  csNoFieldPresent:exact.length===1&&Object.hasOwn(exact[0],'csNo'),
  docidFieldPresent:exact.length===1&&Object.hasOwn(exact[0],'docid'),
  internalCaseFormatObserved:distinct.length===1?'digits_only':'unavailable',
  internalCaseValueSaved:false,
  legalStatusVerified:false,
  note:'목록 한 행에서의 일치 단서만 확인. 상세 응답의 내부 사건번호와 교차 대조하기 전 신원 및 매각상태 미확인.'
 };
}
module.exports={assessSearchBridge};
