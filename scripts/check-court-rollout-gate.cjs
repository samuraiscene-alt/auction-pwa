#!/usr/bin/env node
'use strict';
// Read-only promotion gate. Does not launch any court queries or change app state.
const fs=require('node:fs');
const REQUIRED=['probeExecutionSucceeded','schedulePreflightConfirmed',
 'identityMatched','detailCrossChecked','rawResultCodeMatched','scheduleDayMatched'];
const MINIMUM_ATTEMPT='2026-11-11T00:30:00.000Z';
const MAX_ELAPSED_DAYS=7;
function checkCourtRolloutGate(report,nowIso=new Date().toISOString()){
 const deny=reason=>({eligible:false,reason,legalStatusVerified:false,allowedNewRequests:0});
 if(!report||typeof report!=='object'||Array.isArray(report)||report.schemaVersion!==1)
  return deny('invalid_diagnostic');
 const when=Date.parse(report.attemptedAt);
 const now=Date.parse(nowIso);
 if(!Number.isFinite(when)||!Number.isFinite(now)||when<Date.parse(MINIMUM_ATTEMPT)||
    when>now||now-when>MAX_ELAPSED_DAYS*86400000)
  return deny('missing_or_stale_post_auction_probe');
 if(report.legalStatusVerified!==false||report.rawResponseSaved!==false)
  return deny('unsafe_diagnostic');
 if(report.observed!==true||report.exactDisplayLotRows!==1)
  return deny('search_result_not_unique');
 if(REQUIRED.some(field=>report[field]!==true))
  return deny('required_cross_checks_incomplete');
 if(report.detailCrossCheckReason!=='raw_code_cross_checked')
  return deny('raw_code_evidence_not_confirmed');
 // This is only authorization to DISCUSS limited diagnostic rollout, not an
 // action trigger, a legal outcome, or evidence that the court set is complete.
 return {eligible:true,reason:'regional_diagnostic_review_only',
  legalStatusVerified:false,allowedNewRequests:0};
}
if(require.main===module){
 const status=JSON.parse(fs.readFileSync('data/court-sale-result-status.json','utf8'));
 const decision=checkCourtRolloutGate(status);
 console.log(JSON.stringify(decision));
 process.exitCode=decision.eligible?0:2;
}
module.exports={checkCourtRolloutGate};
