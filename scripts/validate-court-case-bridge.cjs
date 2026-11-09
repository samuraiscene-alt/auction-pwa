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

// Cross-compare exact LIST display/court/lot row against DETAIL base/internal lot.
// Never map a docid using suffix/prefix heuristics. All results are redacted.
function assessCrossBridge(rows,detail,identity){
 const list=assessSearchBridge(rows,identity);
 const exact=rows.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&
  String(r.boCd??'')===identity.courtCode&&String(r.srnSaNo??'')===identity.caseNo&&
  String(r.maemulSer??r.mokmulSer??'')===identity.itemNo);
 const data=detail?.data&&typeof detail.data==='object'&&!Array.isArray(detail.data)?detail.data:{};
 const base=data.dma_csBasInf;
 const internal=typeof base?.csNo==='string'&&/^\d{8,20}$/.test(base.csNo)?base.csNo:null;
 const lotRows=Array.isArray(data.dlt_dspslGdsDspslObjctLst)?data.dlt_dspslGdsDspslObjctLst:[];
 const detailConsistent=!!internal&&String(base?.cortOfcCd??'')===identity.courtCode&&lotRows.length>0&&
  lotRows.every(r=>r&&String(r.cortOfcCd??'')===identity.courtCode&&String(r.csNo??'')===internal);
 const matchedLotRows=detailConsistent?lotRows.filter(r=>String(r.dspslGdsSeq??'')===identity.itemNo):[];
 const row=exact.length===1?exact[0]:null;
 const docid=typeof row?.docid==='string'?row.docid.trim():'';
 const docidFormat=!docid?'missing':/^\d+$/.test(docid)?'digits_only':'other';
 const docidExactlyMatches=!!internal&&!!row&&docid===internal;
 const listCsNo=typeof row?.csNo==='string'?row.csNo.trim():'';
 const listCsNoExactlyMatches=!!internal&&!!row&&listCsNo===internal;
 const crossChecked=exact.length===1&&detailConsistent&&matchedLotRows.length===1&&
   (docidExactlyMatches||listCsNoExactlyMatches);
 return {
  schemaVersion:1,exactDisplayLotRows:list.exactDisplayLotRows,
  detailInternalCaseConsistent:detailConsistent,
  detailLotRowUnique:matchedLotRows.length===1,
  docidFormat,docidExactlyMatches,listCsNoExactlyMatches,
  detailCaseCrossChecked:crossChecked,
  legalStatusVerified:false,internalCaseValueSaved:false
 };
}
module.exports={assessSearchBridge,assessCrossBridge};
