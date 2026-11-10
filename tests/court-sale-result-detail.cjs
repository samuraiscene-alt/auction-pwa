'use strict';
const assert=require('node:assert/strict');
const {compareSaleSearchWithDetail:compare}=require('../scripts/compare-court-sale-result-detail.cjs');
const id={courtCode:'B000210',caseNo:'2025타경953',itemNo:'1'};
const result={boCd:id.courtCode,srnSaNo:id.caseNo,maemulSer:id.itemNo,
 saNo:'20250130000953',dxdyYmd:'20261110',auctnDxdyRsltCd:'R1',privateName:'PRIVATE'};
const search={status:200,data:{dlt_srchResult:[result]}};
const lot={cortOfcCd:id.courtCode,csNo:'20250130000953',dspslGdsSeq:'1'};
const row={...lot,dxdyYmd:'20261110',auctnDxdyRsltCd:'R1'};
const detail={status:200,data:{dma_csBasInf:{cortOfcCd:id.courtCode,csNo:'20250130000953'},
 dlt_dspslGdsDspslObjctLst:[lot],dlt_rletCsGdsDtsDxdyInf:[row]}};
const good=compare(search,detail,id);
assert.equal(good.crossChecked,true);
assert.equal(good.legalStatusVerified,false);
assert.equal(good.legalStatus,null);
assert(!JSON.stringify(good).includes('PRIVATE'));
for(const [s,d] of [
 [{...search,data:{dlt_srchResult:[]}},detail],
 [{...search,data:{dlt_srchResult:[result,result]}},detail],
 [{...search,data:{dlt_srchResult:[{...result,saNo:'OTHER'}]}},detail],
 [search,{...detail,data:{...detail.data,dlt_dspslGdsDspslObjctLst:[lot,lot]}}],
 [search,{...detail,data:{...detail.data,dlt_rletCsGdsDtsDxdyInf:[row,{...row,auctnDxdyRsltCd:'R2'}]}}],
 [search,{...detail,data:{...detail.data,dlt_rletCsGdsDtsDxdyInf:[{...row,auctnDxdyRsltCd:'R2'}]}}],
 [{...search,data:{dlt_srchResult:[{...result,dxdyYmd:'20261111'}]}},detail],
 [{...search,data:{dlt_srchResult:[{...result,dxdyYmd:'20261399'}]}},detail],
 [{...search,data:{ipcheck:false,dlt_srchResult:[result]}},detail]
 ]){
 const outcome=compare(s,d,id);
 assert.equal(outcome.crossChecked,false);
 assert.equal(outcome.legalStatusVerified,false);
 assert.equal(outcome.legalStatus,null);
 assert(!JSON.stringify(outcome).includes('PRIVATE'));
}
console.log('PASS: strict sale result to detail identity/lot/date/code cross-check remains nonlegal');
