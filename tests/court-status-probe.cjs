'use strict';
const assert=require('node:assert/strict');
const {describeResponse,assessIdentity,classifyProbeFailure}=require('../scripts/probe-court-case-status.cjs');
const a=describeResponse({status:200,data:{csBaseInfo:[{csNo:'2026타경1',csStatCd:'CODE_UNKNOWN',name:'PRIVATE'}],dspslGdsDxdyInfo:[{mulStatcd:'999'}]}});
assert.equal(a.blocked,false);
assert.equal(a.plausibleResponse,true);
assert.equal(describeResponse({status:200,data:{}}).plausibleResponse,false);
assert.equal(describeResponse({status:403,data:{records:[{csStatCd:'X'}]}}).plausibleResponse,false);
assert(a.possibleStatusFields.includes('csBaseInfo.csStatCd'));
assert(a.possibleStatusFields.includes('dspslGdsDxdyInfo.mulStatcd'));
assert(!JSON.stringify(a).includes('CODE_UNKNOWN'),'status values must not be reported without meaning');
assert(!JSON.stringify(a).includes('PRIVATE'),'raw values must not be logged');
assert.equal(describeResponse({data:{ipcheck:false}}).blocked,true);
assert.equal(describeResponse({status:200,data:{records:[]}}).plausibleResponse,false);
assert.equal(describeResponse({status:200,data:{records:[{}]}}).plausibleResponse,false);
const expected={courtCode:'B000210',caseNo:'2026타경12345',itemNo:'2'};
const exact=assessIdentity({data:{lots:[{boCd:'B000210',srnSaNo:'2026타경12345',maemulSer:'2',mulStatcd:'UNKNOWN'}]}},expected);
assert.equal(exact.caseIdentityMatched,true);
assert.equal(exact.lotIdentityMatched,true);
assert.equal(exact.statusDecisionAllowed,false);
assert.equal(exact.caseIdentityMatched&&exact.lotIdentityMatched,true);
assert.equal(otherLotCaseStub(),false);
function otherLotCaseStub(){
 const result=assessIdentity({data:{lots:[{boCd:'B000210',srnSaNo:'2026타경54321',maemulSer:'2'}]}},expected);
 return result.caseIdentityMatched||result.lotIdentityMatched;
}

const otherLot=assessIdentity({data:{lots:[{boCd:'B000210',srnSaNo:'2026타경12345',maemulSer:'1'}]}},expected);
assert.equal(otherLot.caseIdentityMatched,true);
assert.equal(otherLot.lotIdentityMatched,false);
const unrelated=assessIdentity({data:{lots:[{boCd:'B000211',srnSaNo:'2026타경12345',maemulSer:'2'}]}},expected);
assert.equal(unrelated.caseIdentityMatched,false);
assert.equal(unrelated.lotIdentityMatched,false);
assert.equal(assessIdentity({data:{lots:[{boCd:'B000210',srnSaNo:'2026타경12345'}]}},expected).lotIdentityMatched,false);
const realShape=assessIdentity({data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'2008타경25092'},
 dlt_dspslGdsDspslObjctLst:[{cortOfcCd:'B000210',csNo:'2008타경25092',dspslGdsSeq:'1',auctnGdsStatCd:'UNVERIFIED'}]
}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'});
assert.equal(realShape.caseIdentityMatched,true);
assert.equal(realShape.lotIdentityMatched,true);
assert.equal(realShape.responseCaseFormat,'display_case');
assert.equal(realShape.statusDecisionAllowed,false);
assert.equal(assessIdentity({data:{dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092'}}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'}).responseCaseFormat,'digits_only');
assert.equal(assessIdentity({data:{dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092'}}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'}).caseIdentityMatched,false);
const internalCase=assessIdentity({data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092'},
 dlt_dspslGdsDspslObjctLst:[{cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'1'}],
 dlt_rletReltCsLst:[{reltCsCortOfcCd:'B000210',userReltCsNo:'2008타경25092'}]
}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'});
assert.equal(internalCase.caseIdentityMatched,false,'internal ID is not display number proof');
assert.equal(internalCase.lotIdentityMatched,false);
assert.equal(internalCase.baseCourtMatches,true);
assert.equal(internalCase.responseCaseFormat,'digits_only');
assert.equal(internalCase.internalCaseYearMatches,true);
assert.equal(internalCase.internalCaseSerialSuffixMatches,true);
assert.equal(internalCase.internalLotRowFound,true);
assert.equal(internalCase.internalCaseRowsConsistent,true);
assert.equal(internalCase.matchingLotRowUnique,true);
const mixed=assessIdentity({data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092'},
 dlt_dspslGdsDspslObjctLst:[
  {cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'1'},
  {cortOfcCd:'B000210',csNo:'20080130099999',dspslGdsSeq:'2'}
 ]
}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'});
assert.equal(mixed.internalCaseRowsConsistent,false);
assert.equal(mixed.statusDecisionAllowed,false);
const duplicated=assessIdentity({data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092'},
 dlt_dspslGdsDspslObjctLst:[
  {cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'1'},
  {cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'1'}
 ]
}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'});
assert.equal(duplicated.matchingLotRowUnique,false);
assert.equal(duplicated.statusDecisionAllowed,false);
assert.equal(internalCase.relatedDisplayAliasMatched,true);
assert.equal(internalCase.statusDecisionAllowed,false);
const wrongYear=assessIdentity({data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'20070130025092'},
 dlt_dspslGdsDspslObjctLst:[{cortOfcCd:'B000210',csNo:'20070130025092',dspslGdsSeq:'1'}]
}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'});
assert.equal(wrongYear.internalCaseYearMatches,false);
assert.equal(wrongYear.statusDecisionAllowed,false);
assert.equal(classifyProbeFailure({cause:{code:'ENOTFOUND'},message:'fetch failed'}),'dns_failure');
assert.equal(classifyProbeFailure({cause:{code:'ETIMEDOUT'},message:'fetch failed'}),'network_failure');
assert.equal(classifyProbeFailure({name:'AbortError',message:'This operation was aborted'}),'timeout');
assert.equal(classifyProbeFailure({message:'HTTP 403'}),'access_rejected');
assert.equal(classifyProbeFailure({message:'HTTP 429'}),'access_rejected');
assert.equal(classifyProbeFailure({message:'HTTP 500'}),'http_error');
assert.equal(classifyProbeFailure({message:'non-JSON response'}),'non_json');
assert.equal(classifyProbeFailure({message:'court response schema not verified; no status inference'}),'response_schema_invalid');
assert.equal(classifyProbeFailure({message:'case identity not matched; structural field names only reported'}),'identity_mismatch');
assert.equal(classifyProbeFailure({message:'private-secret-error'}),'unexpected_failure');
const expCase=assessIdentity({data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092',expCsNo:'2008타경25092'},
 dlt_dspslGdsDspslObjctLst:[{cortOfcCd:'B000210',csNo:'20080130025092',dspslGdsSeq:'1'}]
}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'});
assert.equal(expCase.baseExpCaseExact,true);
assert.equal(expCase.baseExpCaseFormat,'display_case');
assert.equal(expCase.statusDecisionAllowed,false);
const expWrong=assessIdentity({data:{
 dma_csBasInf:{cortOfcCd:'B000210',csNo:'20080130025092',expCsNo:'2008타경25093'}
}},{courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'});
assert.equal(expWrong.baseExpCaseExact,false);
assert.equal(expWrong.statusDecisionAllowed,false);
console.log('PASS: structural-only status probe; block and redaction');
