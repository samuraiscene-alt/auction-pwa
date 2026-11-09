'use strict';
const assert=require('node:assert/strict');
const {describeResponse,assessIdentity}=require('../scripts/probe-court-case-status.cjs');
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
console.log('PASS: structural-only status probe; block and redaction');
