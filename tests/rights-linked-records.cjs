'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8');
const start=app.indexOf('function linkedRightsIds('),stop=app.indexOf('function saveRightsDraft(',start);
assert(start>=0&&stop>start,'rights link helpers not found');
const helpers=app.slice(start,stop);
const factory=new Function('capitalSnapshot','registeredProperties','realCaseId','rightsDrafts','window',
 helpers+'\nreturn {linkedRightsIds,rightsDraftConflict,currentRightsDraft};');
const court='court-B000210|2008타경25092|1',real='real-서울중앙지방법원|2008타경25092|1';
const lot={id:court,courtCode:'B000210',caseNo:'2008타경25092',courtName:'서울중앙지방법원',itemNo:'1'};
const manual={id:real,court:'서울중앙지방법원',case:'2008타경25092',itemNo:'1'};
function make(lots=[lot],registered=[manual],drafts=[],valid=true){
 return factory({validation:{passed:valid},items:lots},()=>registered,
  (name,caseNo,itemNo)=>'real-'+[name,caseNo,itemNo].join('|'),
  ()=>drafts,{RightsDraftSchema:{newRightsDraft:propertyId=>({propertyId})}});
}
assert.deepEqual(make().linkedRightsIds(court),[court,real]);
assert.deepEqual(make().linkedRightsIds(real),[court,real]);
const preexisting={propertyId:real,documents:[],rights:[],tenants:[]};
assert.equal(make([lot],[manual],[preexisting]).currentRightsDraft(court),preexisting);
assert.deepEqual(make([lot],[manual],[]).currentRightsDraft(real),{propertyId:court});
assert.deepEqual(make([lot],[manual],[],false).linkedRightsIds(real),[real]);
assert.deepEqual(make([lot],[{...manual,court:'서울동부지방법원',id:'real-서울동부지방법원|2008타경25092|1'}]).linkedRightsIds(court),[court]);
assert.deepEqual(make([lot],[{...manual,itemNo:'2',id:'real-서울중앙지방법원|2008타경25092|2'}]).linkedRightsIds(court),[court]);
const duplicate={...lot,id:'court-B000211|2008타경25092|1',courtCode:'B000211'};
assert.deepEqual(make([lot,duplicate]).linkedRightsIds(real),[real]);
const conflict=make([lot],[manual],[{propertyId:court},{propertyId:real}]);
assert.equal(conflict.rightsDraftConflict(court),true);
assert.equal(conflict.currentRightsDraft(court),null);
assert(app.includes('data-capital-rights='));
assert(app.includes("nav('rights',{rightsPropertyId:id})"));
assert(app.includes('state.rightsPropertyId===propertyId'));
assert(app.includes('rightsPropertyId:state.rightsPropertyId'));
console.log('PASS exact court/case/lot rights record sharing, mismatches, ambiguity and non-merging');
