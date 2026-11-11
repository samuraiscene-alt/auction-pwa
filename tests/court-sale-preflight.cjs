'use strict';
const assert=require('node:assert/strict');
const {assessCourtSchedulePreflight:check}=require('../scripts/validate-court-sale-preflight.cjs');
const id={courtCode:'B000210',caseNo:'2025타경953',itemNo:'1'};
const lot={cortOfcCd:'B000210',csNo:'20250130000953',dspslGdsSeq:'1'};
const history={...lot,dxdyYmd:'20261110'};
const detail={status:200,data:{dma_csBasInf:{cortOfcCd:'B000210',csNo:lot.csNo},
 dlt_dspslGdsDspslObjctLst:[lot],dlt_rletCsGdsDtsDxdyInf:[history]}};
const yes=check(detail,id,'2026-11-10');
assert.equal(yes.confirmed,true);
assert.equal(yes.legalStatusVerified,false);
for(const response of [
 {...detail,data:{...detail.data,ipcheck:false}},
 {...detail,data:{...detail.data,dma_csBasInf:{...detail.data.dma_csBasInf,cortOfcCd:'B000214'}}},
 {...detail,data:{...detail.data,dlt_dspslGdsDspslObjctLst:[{...lot,dspslGdsSeq:'2'}]}},
 {...detail,data:{...detail.data,dlt_rletCsGdsDtsDxdyInf:[{...history,dxdyYmd:'20261117'}]}},
 {...detail,data:{...detail.data,dlt_rletCsGdsDtsDxdyInf:[history,{...history}]}},
 {...detail,data:{...detail.data,dlt_rletCsGdsDtsDxdyInf:[{...history,dxdyYmd:'20261399'}]}},
 {...detail,data:{...detail.data,dlt_rletCsGdsDtsDxdyInf:[]}}
]){
 const result=check(response,id,'2026-11-10');
 assert.equal(result.confirmed,false);
 assert.equal(result.legalStatusVerified,false);
}
for(const [lots,diagnostic] of [
 [[], 'lot_list_invalid'],
 [[{...lot,cortOfcCd:'B000214'}], 'lot_identity_mismatch'],
 [[{...lot,dspslGdsSeq:'2'}], 'lot_number_missing'],
 [[lot,{...lot}], 'lot_number_ambiguous']
]){
 const checked=check({...detail,data:{...detail.data,dlt_dspslGdsDspslObjctLst:lots}},id,'2026-11-10');
 assert.equal(checked.reason,'detail_lot_unverified');
 assert.equal(checked.lotDiagnostic,diagnostic);
 if(diagnostic==='lot_number_ambiguous'){
  assert.equal(checked.lotRows,2);
  assert.equal(checked.totalLotRows,2);
  assert.equal(checked.lotRowsIdentical,true);
 }
 assert.equal(checked.legalStatusVerified,false);
}
const differentComponents=check({...detail,data:{...detail.data,
 dlt_dspslGdsDspslObjctLst:[lot,{...lot,componentMarker:'different'}]}},id,'2026-11-10');
assert.equal(differentComponents.lotDiagnostic,'lot_number_ambiguous');
assert.equal(differentComponents.lotRows,2);
assert.equal(differentComponents.lotRowsIdentical,false);
assert.equal(differentComponents.legalStatusVerified,false);
assert.equal(check(detail,id,'2026-02-29').confirmed,false);
assert.equal(check(detail,id,'2026-11-10').reason,'snapshot_schedule_corresponds_to_official_detail');
console.log('PASS: fresh official schedule preflight gate rejects changed/ambiguous/unverified dates');
