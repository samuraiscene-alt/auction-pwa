'use strict';
// Public sale-result SEARCH read-only diagnostic. A returned row is NOT proof
// of a sale or withdrawal. Never persist parties, addresses, raw documents.
const SAFE=/^[A-Za-z0-9_-]{1,24}$/;
const safeCode=x=>(typeof x==='string'||typeof x==='number')&&SAFE.test(String(x).trim())?String(x).trim():null;
const CANDIDATES=['auctnDxdyRsltCd','auctnDxdyRsltNm','dspslGdsStatCd',
 'mulStatcd','jinstatCd','mulJinYn','maemulSer','mokmulSer','dxdyYmd','maeGiil',
 'maegyuljGiil','yuchalCnt','maeGiilRsltNm','dspslRsltNm'];
const STATUS_NAMES=['매각','유찰','취하','변경','연기','정지','취소','진행','불허가'];
function analyzeSaleResultSearch(response,identity){
 const root=response?.data;
 if(String(response?.status)!=='200'||!root||root.ipcheck===false||
  !Array.isArray(root.dlt_srchResult)||root.dlt_srchResult.length>50)
  return {observed:false,reason:'invalid_response',identityMatched:false,legalStatusVerified:false};
 const rows=root.dlt_srchResult;
 const exact=rows.filter(r=>r&&String(r.boCd??'')===identity.courtCode&&
  String(r.srnSaNo??'')===identity.caseNo&&
  String(r.maemulSer??r.mokmulSer??'')===identity.itemNo);
 const row=exact.length===1?exact[0]:null;
 const statusNames=row?CANDIDATES.filter(k=>Object.hasOwn(row,k)):[];
 const rawCodes=row?Object.fromEntries(['auctnDxdyRsltCd','dspslGdsStatCd','mulStatcd','jinstatCd','mulJinYn']
  .map(k=>[k,safeCode(row[k])])):{};
 const exactDisplayLabels=row?Object.fromEntries(['auctnDxdyRsltNm','maeGiilRsltNm','dspslRsltNm']
  .map(k=>[k,typeof row[k]==='string'&&STATUS_NAMES.includes(row[k].trim())?row[k].trim():null])):{};
 return {observed:true,reason:'processed',rowCount:rows.length,exactDisplayLotRows:exact.length,
  identityMatched:exact.length===1,fieldNames:statusNames,rawCodes,exactDisplayLabels,
  legalStatusVerified:false,rawResponseSaved:false};
}
module.exports={analyzeSaleResultSearch};
