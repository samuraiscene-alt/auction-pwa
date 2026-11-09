'use strict';
const assert=require('node:assert/strict');
const {evaluateVerifiedOutcome}=require('../scripts/court-status-meaning-gate.cjs');
const evidence={identityVerified:true,legalStatusVerified:false,
 scheduleResultObservations:[{day:'20261015',resultCode:'002',kindCode:'01'}]};
const proof={sourceType:'official_court_display',sourceSystem:'LJH',
 codeGroup:'AUCTN_DXDY_RSLT_CD',itemIdentityMatched:true,
 scheduleDayMatched:true,verifiedByHuman:true,day:'20261015',
 code:'002',kindCode:'01',label:'유찰'};
const ok=evaluateVerifiedOutcome(evidence,proof);
assert.equal(ok.manualComparisonMatched,true);
assert.equal(ok.verified,false);
assert.equal(ok.label,null);
for(const tampered of [
 {...proof,sourceType:'third_party'},
 {...proof,sourceSystem:'PGJ'},
 {...proof,codeGroup:'AUCTN_GDS_STAT_CD'},
 {...proof,itemIdentityMatched:false},
 {...proof,scheduleDayMatched:false},
 {...proof,verifiedByHuman:false},
 {...proof,day:'20261016'},
 {...proof,code:'003'},
 {...proof,kindCode:'02'},
 {...proof,label:'자동매각완료'}
]){
 const result=evaluateVerifiedOutcome(evidence,tampered);
 assert.equal(result.verified,false);
 assert.equal(result.label,null);
}
assert.equal(evaluateVerifiedOutcome({...evidence,identityVerified:false},proof).manualComparisonMatched,undefined);
assert.equal(evaluateVerifiedOutcome({...evidence,scheduleResultObservations:[
 {day:'20261015',resultCode:'002',kindCode:'01'},{day:'20261015',resultCode:'002',kindCode:'01'}]},proof).manualComparisonMatched,undefined);
for(const flag of [{scheduleConflictDetected:true},{scheduleEvidenceTruncated:true},{historyBounded:false}]){
 const fail=evaluateVerifiedOutcome({...evidence,...flag},proof);
 assert.equal(fail.reason,'schedule_evidence_incomplete_or_conflicting');
 assert.equal(fail.manualComparisonMatched,undefined);
}
console.log('PASS: official-result code proof remains manual only; no automatic legal status label');
