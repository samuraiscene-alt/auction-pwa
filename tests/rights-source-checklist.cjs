'use strict';
const assert=require('node:assert/strict');
const {evidenceChecklist,ROWS,DOC_NAMES}=require('../scripts/rights-source-checklist.cjs');
assert.equal(ROWS.length,6);
assert.deepEqual(ROWS.map(x=>x.label),['임차인','선순위권리','점유자','유치권','특수권리','인수 가능 금액']);
const empty=evidenceChecklist({documents:[]});
assert.equal(empty.length,6);
assert(empty.every(x=>x.verified===false&&x.status==='unverified'&&x.legalConclusion===null&&x.assumedLiabilityWon===null));
assert(empty.every(x=>x.recordedCount===0));
const docs=['registry','sale_statement','occupancy_report','appraisal','lease','other'].map((type,i)=>({
 id:'d'+i,type,source:'user_upload',officiallyVerified:false
}));
const full=evidenceChecklist({documents:docs});
assert(full.every(x=>x.recordedCount===x.neededCount));
assert(full.every(x=>!x.verified&&x.assumedLiabilityWon===null));
assert.equal(DOC_NAMES.registry,'등기사항증명서');
assert.equal(evidenceChecklist({documents:[{type:'registry',source:'bad'}]})[1].recordedCount,0);
console.log('PASS six evidence checklists never infer rights or liabilities from stored documents');
