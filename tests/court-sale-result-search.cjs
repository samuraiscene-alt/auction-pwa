'use strict';
const assert=require('node:assert/strict');
const {analyzeSaleResultSearch}=require('../scripts/validate-court-sale-result-search.cjs');
const id={courtCode:'B000210',caseNo:'2008타경25092',itemNo:'1'};
const row={boCd:id.courtCode,srnSaNo:id.caseNo,maemulSer:'1',mulStatcd:'01',auctnDxdyRsltNm:'유찰',privateName:'PRIVATE_PERSON'};
const good=analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[row]}},id);
assert.equal(good.identityMatched,true);
assert.equal(good.exactDisplayLabels.auctnDxdyRsltNm,'유찰');
assert.equal(good.rawCodes.mulStatcd,'01');
assert.equal(good.legalStatusVerified,false);
assert(!JSON.stringify(good).includes('PRIVATE'));
assert.equal(analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[row,row]}},id).identityMatched,false);
assert.equal(analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[{...row,maemulSer:'2'}]}},id).identityMatched,false);
assert.equal(analyzeSaleResultSearch({status:200,data:{ipcheck:false,dlt_srchResult:[row]}},id).observed,false);
assert.equal(analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[{...row,auctnDxdyRsltNm:'유찰 주소 PRIVATE_PERSON'}]}},id).exactDisplayLabels.auctnDxdyRsltNm,null);
assert.equal(analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[{...row,mulStatcd:'PRIVATE_PERSON_RECORD_LONG'}]}},id).rawCodes.mulStatcd,null);
const empty=analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[]}},id);
assert.equal(empty.reason,'empty_result');
assert.deepEqual(empty.responseIdentityFieldNames,[]);
const mismatched=analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[
 {...row,boCd:'B000214',srnSaNo:'2025타경9999',privateName:'PRIVATE_PERSON',address:'PRIVATE_ADDRESS'}
]}},id);
assert.equal(mismatched.reason,'identity_not_unique_or_not_found');
assert.equal(mismatched.identityMatched,false);
assert.deepEqual(mismatched.responseIdentityFieldNames,['boCd','srnSaNo','maemulSer']);
assert(!JSON.stringify(mismatched).includes('PRIVATE'));
assert.deepEqual(mismatched.exactDisplayLabels,{});
const alternate=analyzeSaleResultSearch({status:200,data:{dlt_srchResult:[
 {cortOfcCd:'B000210',csNo:'2025타경953',dspslGdsSeq:'1',auctnDxdyRsltCd:'002',privateName:'PRIVATE_PERSON'}
]}},id);
assert.equal(alternate.identityMatched,false);
assert.deepEqual(alternate.responseIdentityFieldNames,['cortOfcCd','csNo','dspslGdsSeq']);
assert.deepEqual(alternate.rawCodes,{});
console.log('PASS: sale-result search diagnostic is identity-gated, redacted and never decides legal status');
