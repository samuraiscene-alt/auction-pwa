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
 // Court dates are YYYYMMDD. Reject impossible dates, including leap-day errors.
 const s=String(value??'').trim();
 if(!/^20\d{6}$/.test(s))return null;
 const year=Number(s.slice(0,4)),month=Number(s.slice(4,6)),day=Number(s.slice(6,8));
 if(month<1||month>12)return null;
 const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
 return day>=1&&day<=daysInMonth?s:null;
};
// Exact, allowlisted court LIST display text only; never strip arbitrary HTML or
// infer a label from an unknown code. No addresses or free-form text can escape.
const DISPLAY_LABELS=new Set(['진행','매각','유찰','취하','변경','연기','정지','취소','종국','미종국','신건']);
const labelOf=value=>typeof value==='string'&&DISPLAY_LABELS.has(value.trim())?value.trim():null;
// Log only narrowly named candidate field KEYS from the verified list row.
const STATUS_FIELD_NAMES=['jinstatCd','mulStatcd','mulJinYn'];
const displayCandidateFieldNames=row=>STATUS_FIELD_NAMES.filter(k=>Object.hasOwn(row,k));
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
 const observed=historyBounded?matched.map(r=>({
  day:safeDay(r.dxdyYmd),resultCode:safeCode(r.auctnDxdyRsltCd),
  kindCode:safeCode(r.auctnDxdyKndCd)
 })).filter(x=>x.day&&x.resultCode):[];
 // Multiple conflicting codes on the same day/kind are ambiguous evidence.
 const bySchedule=new Map();
 let scheduleConflict=false;
 for(const x of observed){
  const key=x.day+'|'+(x.kindCode||'');
  const prior=bySchedule.get(key);
  if(prior!==undefined&&prior!==x.resultCode)scheduleConflict=true;
  bySchedule.set(key,x.resultCode);
 }
 const dates=scheduleConflict?[]:observed
  .sort((a,b)=>b.day.localeCompare(a.day)||String(a.kindCode||'').localeCompare(String(b.kindCode||'')))
  .filter((x,i,arr)=>i===0||x.day!==arr[i-1].day||x.kindCode!==arr[i-1].kindCode||x.resultCode!==arr[i-1].resultCode)
  .slice(0,20);
 const status={
  caseProgressCode:safeCode(base.csProgStatCd),
  caseSuspensionCode:safeCode(base.auctnSuspStatCd),
  lotStatusCode:safeCode(goods[0].auctnGdsStatCd),
  lotProgressFlag:safeCode(goods[0].gdsDspslProgYn),
  listStatusCode:safeCode(listRow[0].mulStatcd),
  listProgressCode:safeCode(listRow[0].jinstatCd),
  listProgressFlag:safeCode(listRow[0].mulJinYn)
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
  scheduleConflictDetected:scheduleConflict,
  scheduleEvidenceTruncated:!scheduleConflict&&observed.length>20,
  legalStatusVerified:false,
  legalStatus:null,
  note:'법원 응답의 원시 상태코드 기록(뜻 미검증). 매각·취하·변경 자동분류 금지.'
 };
}
module.exports={extractStatusEvidence};
