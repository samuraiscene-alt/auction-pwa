'use strict';
// A fresh official case detail must confirm the snapshot's scheduled day before
// asking the separate sale-result API. Never infer cancellation from a mismatch.
const calendarDay=value=>{
 const s=String(value??'').trim();
 if(!/^20\d{6}$/.test(s))return null;
 const y=Number(s.slice(0,4)),m=Number(s.slice(4,6)),d=Number(s.slice(6,8));
 return m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate()?s:null;
};
const fail=reason=>({confirmed:false,reason,legalStatusVerified:false});
function assessCourtSchedulePreflight(response,identity,snapshotDate){
 if(String(response?.status)!=='200'||response?.data?.ipcheck===false||response?.ipcheck===false)
  return fail('detail_response_unverified');
 const data=response?.data,base=data?.dma_csBasInf;
 const lots=data?.dlt_dspslGdsDspslObjctLst,history=data?.dlt_rletCsGdsDtsDxdyInf;
 const internal=String(base?.csNo??'');
 if(!/^\d{8,20}$/.test(internal)||String(base?.cortOfcCd??'')!==identity.courtCode)
  return fail('detail_identity_unverified');
 // Distinguish an absent lot from a mismatched or ambiguous lot without
 // reporting any case identity, address, name, or raw court response.
 if(!Array.isArray(lots)||lots.length<1||lots.length>300)
  return {...fail('detail_lot_unverified'),lotDiagnostic:'lot_list_invalid'};
 if(!lots.every(r=>r&&String(r.cortOfcCd??'')===identity.courtCode&&String(r.csNo??'')===internal))
  return {...fail('detail_lot_unverified'),lotDiagnostic:'lot_identity_mismatch'};
 const matchingLots=lots.filter(r=>String(r.dspslGdsSeq??'')===identity.itemNo);
 const exactLotCount=matchingLots.length;
 if(exactLotCount!==1){
  // Only inspect bounded shape/identity; never record row values or raw payloads.
  // Equal JSON representations indicate duplicated records, not legal equivalence.
  // Compare canonical representations so JSON property ordering does not
  // create a false "different component" diagnostic.
  const canonical=x=>JSON.stringify(x,(_key,value)=>
   value&&typeof value==='object'&&!Array.isArray(value)?
    Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
  const sameRecords=exactLotCount>1&&matchingLots.every(r=>canonical(r)===canonical(matchingLots[0]));
  const firstKeys=exactLotCount>1?JSON.stringify(Object.keys(matchingLots[0]).sort()):'';
  const sameFields=exactLotCount>1&&matchingLots.every(r=>JSON.stringify(Object.keys(r).sort())===firstKeys);
  const rowDifference=exactLotCount<2?'not_checked':sameRecords?'identical':sameFields?'values_differ':'fields_differ';
  return {...fail('detail_lot_unverified'),
   lotDiagnostic:exactLotCount===0?'lot_number_missing':'lot_number_ambiguous',
   lotRows:Math.min(exactLotCount,300),totalLotRows:lots.length,
   lotRowsIdentical:exactLotCount>1?sameRecords:null,
   lotRowDifference:rowDifference};
 }
 if(!Array.isArray(history)||history.length>500)
  return fail('detail_schedule_unavailable');
 const expected=calendarDay(snapshotDate.replaceAll('-',''));
 if(!expected)return fail('snapshot_date_invalid');
 const rows=history.filter(r=>r&&String(r.cortOfcCd??'')===identity.courtCode&&
  String(r.csNo??'')===internal&&String(r.dspslGdsSeq??'')===identity.itemNo);
 if(rows.length===0||rows.length>100)return fail('detail_schedule_unavailable');
 const days=rows.map(r=>calendarDay(r.dxdyYmd));
 if(days.some(d=>!d))return fail('detail_schedule_unavailable');
 const latest=days.sort().at(-1);
 if(latest!==expected)return fail('snapshot_schedule_changed_or_unconfirmed');
 // Identical day repeated can mean multiple sale sessions: not yet verified.
 if(days.filter(d=>d===expected).length!==1)return fail('schedule_day_not_unique');
 return {confirmed:true,reason:'snapshot_schedule_corresponds_to_official_detail',
  legalStatusVerified:false};
}
module.exports={assessCourtSchedulePreflight};
