'use strict';
const assert=require('node:assert/strict');
const {mergeCourtLots}=require('../scripts/merge-capital-components.cjs');
const base={id:'court-B000210|2023타경106314|1',region:'서울',
 courtCode:'B000210',courtName:'서울중앙지방법원',caseNo:'2023타경106314',itemNo:'1',
 address:'서울특별시 관악구 봉천동 65-30',appraisalWon:813440070,minimumWon:650753000,
 saleDate:'2026-11-19',largeCode:'10000',mediumCode:'10100',smallCode:'10108'};
const house={...base,largeCode:'20000',mediumCode:'20100',smallCode:'20101'};
const annex={...house,address:'서울특별시 관악구 봉천동 65-31'};
const good=mergeCourtLots([base,house,annex,base,house]);
assert.equal(good.items.length,1);
assert.equal(good.items[0].components.length,3);
assert.equal(good.stats.multiComponentLots,1);
assert.equal(good.items[0].smallCode,null,'mixed land/building must not be labelled as land alone');
assert.equal(good.items[0].minimumWon,base.minimumWon);
assert.equal(good.unsafeIds.length,0);
console.log('PASS mixed land/building and addresses preserved under one auction lot');
const bad=mergeCourtLots([base,{...house,minimumWon:200000000}]);
assert.equal(bad.items.length,0);
assert.deepEqual(bad.unsafeIds,[base.id]);
assert.equal(bad.conflictFieldCounts.minimumWon,1);
console.log('PASS conflicting price quarantines the entire auction lot');
const changed=mergeCourtLots([base,{...house,saleDate:'2026-12-01'}]);
assert.equal(changed.items.length,0);
assert.equal(changed.conflictFieldCounts.saleDate,1);
console.log('PASS conflicting sale date quarantines the entire auction lot');
