'use strict';
// Independent gate for any future legal-outcome interpretation.
// The official UI references code group LJH/AUCTN_DXDY_RSLT_CD;
// no code->label meanings are bundled or inferred here.
const VALID_OUTCOMES=new Set(['매각','유찰','취하','변경','연기','정지','취소','진행']);
const GROUP='AUCTN_DXDY_RSLT_CD';
function evaluateVerifiedOutcome(evidence,proof){
 if(evidence?.identityVerified!==true||evidence?.legalStatusVerified!==false)
   return {verified:false,label:null,reason:'identity_or_evidence_not_verified'};
 if(!proof||proof.sourceType!=='official_court_display'||proof.codeGroup!==GROUP||
    proof.sourceSystem!=='LJH'||proof.itemIdentityMatched!==true||
    proof.scheduleDayMatched!==true||proof.verifiedByHuman!==true)
   return {verified:false,label:null,reason:'official_display_proof_missing'};
 if(typeof proof.code!=='string'||!(/^[A-Za-z0-9_-]{1,24}$/.test(proof.code))||
   !VALID_OUTCOMES.has(proof.label))
   return {verified:false,label:null,reason:'code_or_label_invalid'};
 const matched=Array.isArray(evidence.scheduleResultObservations)?
  evidence.scheduleResultObservations.filter(x=>x?.day===proof.day&&x?.resultCode===proof.code):[];
 if(matched.length!==1)
   return {verified:false,label:null,reason:'ambiguous_schedule_evidence'};
 // This returns a candidate for manual review, NOT an automatic app outcome.
 return {verified:false,label:null,reason:'human_comparison_recorded_but_not_approved_for_automation',
   candidateCodeGroup:GROUP,manualComparisonMatched:true};
}
module.exports={evaluateVerifiedOutcome};
