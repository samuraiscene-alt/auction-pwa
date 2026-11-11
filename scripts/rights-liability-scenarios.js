'use strict';
// Financial arithmetic only. NEVER infers legal liability or "safe" auction status.
const LIMIT=1_000_000_000_000_000;
function validWon(n){return Number.isSafeInteger(n)&&n>=0&&n<=LIMIT;}
function calculateLiabilityScenario({bidWon,assumedLiabilityWon,fees={}}={}){
 if(!validWon(bidWon))return {ok:false,reason:'bid_missing_or_invalid',legalStatusVerified:false};
 const feeNames=['acquisitionTaxWon','registrationWon','evictionWon','otherWon'];
 if(!fees||typeof fees!=='object'||Array.isArray(fees)||
    feeNames.some(k=>Object.hasOwn(fees,k)&&fees[k]!==null&&!validWon(fees[k])))
  return {ok:false,reason:'fee_invalid',legalStatusVerified:false};
 if(assumedLiabilityWon!==null&&assumedLiabilityWon!==undefined&&!validWon(assumedLiabilityWon))
  return {ok:false,reason:'assumption_invalid',legalStatusVerified:false};
 const missing=feeNames.filter(k=>!Object.hasOwn(fees,k)||fees[k]===null);
 if(assumedLiabilityWon===undefined||assumedLiabilityWon===null)missing.unshift('assumedLiabilityWon');
 const known=[bidWon,...feeNames.filter(k=>!missing.includes(k)).map(k=>fees[k])];
 const partialWon=known.reduce((a,b)=>a+b,0);
 if(!Number.isSafeInteger(partialWon)||partialWon>LIMIT)
  return {ok:false,reason:'sum_out_of_range',legalStatusVerified:false};
 const assumedPresent=!missing.includes('assumedLiabilityWon');
 const total=partialWon+(assumedPresent?assumedLiabilityWon:0);
 if(!Number.isSafeInteger(total)||total>LIMIT)
  return {ok:false,reason:'sum_out_of_range',legalStatusVerified:false};
 return {ok:true,partialWon,scenarioTotalWon:missing.length?null:total,
  scenarioSubtotalWon:total,missingFields:missing,
  totalConfirmed:false,legalStatusVerified:false,
  disclaimer:'가정 시나리오 · 실제 인수 여부와 배당은 서류 및 법률 검토 필요'};
}
const RightsLiability={calculateLiabilityScenario,validWon};
if(typeof module!=='undefined'&&module.exports)module.exports=RightsLiability;
if(typeof window!=='undefined')window.RightsLiability=RightsLiability;
