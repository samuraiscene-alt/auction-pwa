'use strict';
const assert=require('node:assert/strict');
const {newRightsDraft,validateRightsDraft:check}=require('../scripts/rights-draft-schema.cjs');
const id='court-B000210|2025타경953|1';
const sample=newRightsDraft(id);
assert.equal(check(sample).valid,true);
assert.equal(check(sample).liabilityVerified,false);
sample.documents.push({id:'d1',type:'registry',source:'user_upload',issuedOn:'2026-11-10',
 checkedOn:'2026-11-11',reference:'등기부 PDF 1쪽',officiallyVerified:false});
sample.rights.push({id:'r1',type:'mortgage',registeredOn:'2020-01-20',rank:1,
 amountWon:100000000,documentId:'d1',notes:null,legalEffectVerified:false});
sample.tenants.push({id:'t1',occupancy:'unknown',distributionDemand:'unknown',
 moveInOn:null,fixedDateOn:null,depositWon:null,documentId:'d1',notes:null,liabilityVerified:false});
assert.equal(check(sample).valid,true);
assert.equal(check(sample).tenantCount,1);
assert.equal(check({...sample,tenants:[{...sample.tenants[0],depositWon:0}]}).valid,true);
assert.equal(check({...sample,tenants:[{...sample.tenants[0],depositWon:-1}]}).valid,false);
assert.equal(check({...sample,tenants:[{...sample.tenants[0],depositWon:'1000'}]}).valid,false);
assert.equal(check({...sample,rights:[{...sample.rights[0],documentId:'missing'}]}).valid,false);
assert.equal(check({...sample,tenants:[{...sample.tenants[0],liabilityVerified:true}]}).valid,false);
assert.equal(check({...sample,documents:[{...sample.documents[0],officiallyVerified:true}]}).valid,false);
assert.equal(check({...sample,rights:[{...sample.rights[0],id:'d1'}]}).valid,false);
assert.equal(check({...sample,rights:[{...sample.rights[0],registeredOn:'2026-02-29'}]}).valid,false);
assert.equal(check({...sample,propertyId:'court-B000210|2025타경953|2'}).valid,true);
assert.equal(check({...sample,propertyId:'court-B000210|2025타경953|0'}).valid,false);
assert.equal(check(newRightsDraft('real-서울중앙지방법원|2025타경953|1')).valid,true);
assert.equal(check({...sample,reviewedOn:'2026-11-31'}).valid,false);
console.log('PASS rights draft schema, source links, per-lot identity, unknown amounts and safety flags');
