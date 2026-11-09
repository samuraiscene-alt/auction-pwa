'use strict';
const assert=require('node:assert/strict');
const {extractStatusEvidence}=require('../scripts/extract-court-status-evidence.cjs');
const identity={courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'};
const rows=[{boCd:'B000210',srnSaNo:'2008타경25092',maemulSer:'1',saNo:'20080130025092',mulStatcd:'X1'}];
const detail={data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092',csProgStatCd:'C5',auctnSuspStatCd:''},
 dlt_dspslGdsDspslObjctLst:[
  {cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'1',auctnGdsStatCd:'G2',gdsDspslProgYn:'Y'},
  {cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'2',auctnGdsStatCd:'PRIVATE_OTHER'}
 ],
 dlt_rletCsGdsDtsDxdyInf:[
  {cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'1',dxdyYmd:'20260102',auctnDxdyRsltCd:'R4',auctnDxdyKndCd:'K1'},
  {cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'2',dxdyYmd:'20260102',auctnDxdyRsltCd:'OTHER_LOT'}
 ],
 dlt_rletCsIntrpsLst:[{intrpsNm:'PRIVATE_PERSON'}]
}};
const verified={detailCaseCrossChecked:true,exactDisplayLotRows:1};
const out=extractStatusEvidence(rows,detail,identity,verified);
assert.equal(out.identityVerified,true);
assert.equal(out.statusEvidenceAvailable,true);
assert.equal(out.caseProgressCode,'C5');
assert.equal(out.lotStatusCode,'G2');
assert.equal(out.listStatusCode,'X1');
assert.equal(out.scheduleResultObservations.length,1);
assert.equal(out.scheduleResultObservations[0].resultCode,'R4');
assert.equal(out.legalStatusVerified,false);
assert.equal(out.legalStatus,null);
assert(!JSON.stringify(out).includes('PRIVATE'));
assert.equal(extractStatusEvidence(rows,detail,identity,{detailCaseCrossChecked:false}).identityVerified,false);
assert.equal(extractStatusEvidence(rows,detail,{...identity,itemNo:'2'},verified).identityVerified,false);
assert.equal(extractStatusEvidence([{...rows[0],saNo:'DIFFERENT'}],detail,identity,verified).identityVerified,false);
assert.equal(extractStatusEvidence([rows[0],rows[0]],detail,identity,verified).identityVerified,false);
const poisoned=JSON.parse(JSON.stringify(detail));
poisoned.data.dlt_dspslGdsDspslObjctLst[0].auctnGdsStatCd='PRIVATE_PERSON_NAME_LONG_STRING';
poisoned.data.dlt_rletCsGdsDtsDxdyInf[0].auctnDxdyRsltCd='unescaped content!';
const redacted=extractStatusEvidence(rows,poisoned,identity,verified);
assert.equal(redacted.lotStatusCode,null);
assert.equal(redacted.scheduleResultObservations.length,0);
assert.equal(redacted.legalStatusVerified,false);
console.log('PASS: identity gated, one-lot, bounded, code-only evidence; no inferred legal outcome');
