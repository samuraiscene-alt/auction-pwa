'use strict';
// Read-only, bounded evidence for ONE identity-cross-checked court lot.
// Never interpret codes as sold/withdrawn/postponed, never expose any parties.
// Unknown or unexpected status code formats are dropped, not guessed.
const safeCode=value=>{
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const text=String(value).trim();
 return /^[A-Za-z0-9_-]{1,24}$/.test(text)?text:null;
};
const safeDay=value=>{
 const s=String(value??'').trim();
 return /^20\d{6}$/.test(s)?s:null;
};
// Exact, allowlisted court LIST display text only; never strip arbitrary HTML or
// infer a label from an unknown code. No addresses or free-form text can escape.
const DISPLAY_LABELS=new Set(['진행','매각','유찰','취하','변경','연기','정지','취소','종국','미종국','신건']);
const labelOf=value=>typeof value==='string'&&DISPLAY_LABELS.has(value.trim())?value.trim():null;
// Log only narrowly named candidate field KEYS from the verified list row.
const displayCandidateFieldNames=row=>Object.keys(row).filter(k=>
 /^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(k)&&
 /(?:stat|rslt|result|jin|stprint|lstprint|progress|label|nm$)/i.test(k)
).slice(0,30);
const displayEvidence=row=>{
 const names=['userStPrint','userLstPrint','mulStatNm','maemulStatNm'];
 return names.map(field=>({
  field,fieldPresent:Object.hasOwn(row,field),exactDisplayLabel:labelOf(row[field])
 }));
};
function extractStatusEvidence(rows,detail,identity,bridge){
 if(bridge?.detailCaseCrossChecked!==true||bridge?.exactDisplayLotRows!==1)
  return {identityVerified:false,statusEvidenceAvailable:false,legalStatusVerified:false};
 const listRow=rows.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&
  String(r.boCd??'')===identity.courtCode&&String(r.srnSaNo??'')===identity.caseNo&&
  String(r.maemulSer??r.mokmulSer??'')===identity.itemNo);
 if(listRow.length!==1)return {identityVerified:false,statusEvidenceAvailable:false,legalStatusVerified:false};
 const data=detail?.data||{};
 const base=data.dma_csBasInf;
 const internal=String(base?.csNo??'');
 if(String(base?.cortOfcCd??'')!==identity.courtCode||!/^\d{8,20}$/.test(internal)||
  String(listRow[0].saNo??'')!==internal)
  return {identityVerified:false,statusEvidenceAvailable:false,legalStatusVerified:false};
 const goods=(Array.isArray(data.dlt_dspslGdsDspslObjctLst)?data.dlt_dspslGdsDspslObjctLst:[])
  .filter(r=>r&&String(r.cortOfcCd??'')===identity.courtCode&&
    String(r.csNo??'')===internal&&String(r.dspslGdsSeq??'')===identity.itemNo);
 if(goods.length!==1)return {identityVerified:false,statusEvidenceAvailable:false,legalStatusVerified:false};
 const history=Array.isArray(data.dlt_rletCsGdsDtsDxdyInf)?data.dlt_rletCsGdsDtsDxdyInf:[];
 const matched=history.filter(r=>r&&String(r.cortOfcCd??'')===identity.courtCode&&
  String(r.csNo??'')===internal&&String(r.dspslGdsSeq??'')===identity.itemNo);
 const historyBounded=matched.length<=100&&history.length<=500;
 const dates=historyBounded?matched.map(r=>({
  day:safeDay(r.dxdyYmd),resultCode:safeCode(r.auctnDxdyRsltCd),
  kindCode:safeCode(r.auctnDxdyKndCd)
 })).filter(x=>x.day&&x.resultCode).slice(0,20):[];
 const status={
  caseProgressCode:safeCode(base.csProgStatCd),
  caseSuspensionCode:safeCode(base.auctnSuspStatCd),
  lotStatusCode:safeCode(goods[0].auctnGdsStatCd),
  lotProgressFlag:safeCode(goods[0].gdsDspslProgYn),
  listStatusCode:safeCode(listRow[0].mulStatcd)
 };
 const any=Object.values(status).some(Boolean)||dates.length>0;
 return {
  identityVerified:true,statusEvidenceAvailable:any,
  evidenceSchemaVersion:1,
  ...status,
  scheduleResultObservations:dates,
  listingDisplayEvidence:displayEvidence(listRow[0]),
  listingDisplayCandidateFieldNames:displayCandidateFieldNames(listRow[0]),
  matchingScheduleRows:historyBounded?matched.length:null,
  historyBounded,
  legalStatusVerified:false,
  legalStatus:null,
  note:'법원 응답의 원시 상태코드 기록(뜻 미검증). 매각·취하·변경 자동분류 금지.'
 };
}
module.exports={extractStatusEvidence};
