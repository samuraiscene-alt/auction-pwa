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

// Reference-only 2026 ordinary house acquisition-tax estimate.
// Both ordinary-rate eligibility (no surcharge/relief) and area require explicit confirmation.
function estimateOrdinaryHouseAcquisitionTax({bidWon,ordinaryRateConfirmed=false,areaClass='unknown'}={}){
 if(!validWon(bidWon)||bidWon===0)return {ok:false,reason:'bid_missing_or_invalid'};
 if(ordinaryRateConfirmed!==true)return {ok:false,reason:'ordinary_rate_not_confirmed'};
 if(!['at_most_85','over_85'].includes(areaClass))return {ok:false,reason:'area_unconfirmed'};
 const rate=bidWon<=600_000_000?0.01:bidWon>900_000_000?0.03:
  ((bidWon/100_000_000)*(2/3)-3)/100;
 const acquisitionWon=Math.floor(bidWon*rate);
 const educationWon=Math.floor(bidWon*rate*0.1);
 const ruralWon=areaClass==='over_85'?Math.floor(bidWon*0.002):0;
 const estimatedWon=acquisitionWon+educationWon+ruralWon;
 if(!Number.isSafeInteger(estimatedWon)||estimatedWon>LIMIT)return {ok:false,reason:'sum_out_of_range'};
 return {ok:true,estimatedWon,acquisitionWon,educationWon,ruralWon,ratePercent:rate*100,
  confirmedTax:false,legalStatusVerified:false,
  disclaimer:'2026 일반 주택 취득세 참고 추정액. 실제 중과·감면·예외·세액 처리 확인 필요'};
}

const RightsLiability={calculateLiabilityScenario,estimateOrdinaryHouseAcquisitionTax,validWon};
if(typeof module!=='undefined'&&module.exports)module.exports=RightsLiability;
if(typeof window!=='undefined')window.RightsLiability=RightsLiability;
