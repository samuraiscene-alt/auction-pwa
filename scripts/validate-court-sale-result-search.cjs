'use strict';
// Public sale-result SEARCH read-only diagnostic. A returned row is NOT proof
// of a sale or withdrawal. Never persist parties, addresses, raw documents.
const SAFE=/^[A-Za-z0-9_-]{1,24}$/;
const safeCode=x=>(typeof x==='string'||typeof x==='number')&&SAFE.test(String(x).trim())?String(x).trim():null;
const CANDIDATES=['auctnDxdyRsltCd','auctnDxdyRsltNm','dspslGdsStatCd',
 'mulStatcd','jinstatCd','mulJinYn','maemulSer','mokmulSer','dxdyYmd','maeGiil',
 'maegyuljGiil','yuchalCnt','maeGiilRsltNm','dspslRsltNm'];
const STATUS_NAMES=['매각','유찰','취하','변경','연기','정지','취소','진행','불허가'];
const IDENTITY_FIELDS=['boCd','cortOfcCd','srnSaNo','csNo','saNo','maemulSer','mokmulSer','dspslGdsSeq'];
// Only names of known fields, never field values from another auction item.
const DIAGNOSTIC_FIELDS=[...IDENTITY_FIELDS,...CANDIDATES];
function responseShape(rows){
 const first=rows.slice(0,3).filter(r=>r&&typeof r==='object'&&!Array.isArray(r));
 return {
  identityFieldNames:IDENTITY_FIELDS.filter(k=>first.some(r=>Object.hasOwn(r,k))),
  candidateFieldNames:DIAGNOSTIC_FIELDS.filter(k=>first.some(r=>Object.hasOwn(r,k)))
 };
}
// If official response carries two identifiers for the same dimension, both
// must agree. Null/empty is not treated as a second identifier.
const sameIfPresent=(row,a,b)=>{
 const x=row[a],y=row[b];
 return (x===null||x===undefined||String(x)===''||
  y===null||y===undefined||String(y)===''||
  String(x)===String(y));
};
const exactIdentity=(r,identity)=>r&&typeof r==='object'&&!Array.isArray(r)&&
 String(r.boCd??'')===identity.courtCode&&
 String(r.srnSaNo??'')===identity.caseNo&&
 String(r.maemulSer??r.mokmulSer??'')===identity.itemNo&&
 sameIfPresent(r,'maemulSer','mokmulSer')&&
 sameIfPresent(r,'boCd','cortOfcCd')&&
 // csNo may be numeric internal or a display number: compare only when it
 // actually carries the display-format case, never accept a contradiction.
 (!/^20\d{2}타경\d{1,10}$/.test(String(r.csNo??''))||
  String(r.csNo)===identity.caseNo);
function analyzeSaleResultSearch(response,identity){
 const root=response?.data;
 if(String(response?.status)!=='200'||!root||root.ipcheck===false||
  !Array.isArray(root.dlt_srchResult)||root.dlt_srchResult.length>50)
  return {observed:false,reason:'invalid_response',identityMatched:false,legalStatusVerified:false};
 const rows=root.dlt_srchResult;
 const shape=responseShape(rows);
 const exact=rows.filter(r=>exactIdentity(r,identity));
 const row=exact.length===1?exact[0]:null;
 const statusNames=row?CANDIDATES.filter(k=>Object.hasOwn(row,k)):[];
 const rawCodes=row?Object.fromEntries(['auctnDxdyRsltCd','dspslGdsStatCd','mulStatcd','jinstatCd','mulJinYn']
  .map(k=>[k,safeCode(row[k])])):{};
 const exactDisplayLabels=row?Object.fromEntries(['auctnDxdyRsltNm','maeGiilRsltNm','dspslRsltNm']
  .map(k=>[k,typeof row[k]==='string'&&STATUS_NAMES.includes(row[k].trim())?row[k].trim():null])):{};
 return {observed:true,reason:rows.length===0?'empty_result':exact.length!==1?'identity_not_unique_or_not_found':'processed',
  rowCount:rows.length,exactDisplayLotRows:exact.length,
  identityMatched:exact.length===1,fieldNames:statusNames,rawCodes,exactDisplayLabels,
  responseIdentityFieldNames:shape.identityFieldNames,
  responseCandidateFieldNames:shape.candidateFieldNames,
  legalStatusVerified:false,rawResponseSaved:false};
}
module.exports={analyzeSaleResultSearch};
