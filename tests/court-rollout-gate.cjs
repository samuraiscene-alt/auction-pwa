'use strict';
const assert=require('node:assert/strict');
const {checkCourtRolloutGate:gate}=require('../scripts/check-court-rollout-gate.cjs');
const now='2026-11-11T02:30:00.000Z';
const success={schemaVersion:1,attemptedAt:'2026-11-11T01:00:00.000Z',
 probeExecutionSucceeded:true,schedulePreflightConfirmed:true,identityMatched:true,
 detailCrossChecked:true,rawResultCodeMatched:true,scheduleDayMatched:true,
 observed:true,exactDisplayLotRows:1,detailCrossCheckReason:'raw_code_cross_checked',
 legalStatusVerified:false,rawResponseSaved:false};
assert.equal(gate(success,now).eligible,true);
assert.equal(gate(success,now).allowedNewRequests,0);
const failing=[
 [{...success,attemptedAt:'2026-11-10T23:59:00.000Z'},'missing_or_stale_post_auction_probe'],
 [{...success,attemptedAt:'2026-11-11T05:00:00.000Z'},'missing_or_stale_post_auction_probe'],
 [{...success,attemptedAt:'2026-11-01T01:00:00.000Z'},'missing_or_stale_post_auction_probe'],
 [{...success,observed:false},'search_result_not_unique'],
 [{...success,exactDisplayLotRows:2},'search_result_not_unique'],
 [{...success,detailCrossCheckReason:'result_code_not_confirmed'},'raw_code_evidence_not_confirmed'],
 [{...success,legalStatusVerified:true},'unsafe_diagnostic'],
 [{...success,rawResponseSaved:true},'unsafe_diagnostic'],
 [{...success,schemaVersion:2},'invalid_diagnostic'],
 [{...success,attemptedAt:'invalid'},'missing_or_stale_post_auction_probe'],
];
for(const field of ['probeExecutionSucceeded','schedulePreflightConfirmed','identityMatched','detailCrossChecked','rawResultCodeMatched','scheduleDayMatched'])
 failing.push([{...success,[field]:false},'required_cross_checks_incomplete']);
for(const [report,expected] of failing){
 const actual=gate(report,now);
 assert.equal(actual.eligible,false);
 assert.equal(actual.reason,expected);
 assert.equal(actual.allowedNewRequests,0);
 assert.equal(actual.legalStatusVerified,false);
}
console.log('PASS rollout review gate: 1 permitted review, '+failing.length+' fail-closed cases; zero new court queries');
