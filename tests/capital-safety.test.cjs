const assert=require('node:assert/strict');
const fs=require('node:fs');
const {validateSnapshot}=require('../scripts/validate-capital-snapshot.cjs');
const data=JSON.parse(fs.readFileSync('data/capital-court-pilot.json','utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
function rejected(name,mutate){
 const changed=copy(data);mutate(changed);
 const result=validateSnapshot(changed,data);
 assert.equal(result.ok,false,name+' must be rejected');
 console.log('PASS reject:',name,':',result.errors[0]);
}
const result=validateSnapshot(data,null);
assert(result.ok,'Existing published sample baseline must pass structural integrity: '+result.errors.join(','));
assert.equal(result.summary.validatedItems,data.items.length);
console.log('PASS existing baseline '+data.items.length+' items validate without claiming they are current');
rejected('missing regional pages',x=>{x.regions.서울.returned=0});
rejected('incorrect address region',x=>{x.items[0].region='경기'});
rejected('invalid sale date',x=>{x.items[0].saleDate='2026-02-30'});
rejected('negative or invalid price',x=>{x.items[0].minimumWon=-1});
rejected('duplicated id',x=>{x.items.push(copy(x.items[0]))});
rejected('empty collection',x=>{x.items=[]});
const changed=copy(data);
changed.items[0].minimumWon=Math.floor(changed.items[0].minimumWon*0.8);
const compare=validateSnapshot(changed,data);
assert(compare.ok,'A single plausible changed price should not suppress all records');
assert.equal(compare.summary.changed,1);
assert(compare.warnings.some(x=>x.includes('값 변경')));
console.log('PASS detect price changes and warn without calling missing lots sold');
const vanished=copy(data);
vanished.items.splice(0,1);
const compareMissing=validateSnapshot(vanished,data);
assert(compareMissing.ok&&compareMissing.summary.notSeenInNewSample===1);
console.log('PASS missing-from-sample warning is not an auction status claim');

const legacy=copy(data);
legacy.schemaVersion=1;
for(const row of legacy.items){
 const first=row.components?.[0]||row;
 row.address=first.address;row.largeCode=first.largeCode;row.mediumCode=first.mediumCode;row.smallCode=first.smallCode;
 delete row.components;
}
const v2=copy(data);
v2.schemaVersion=2;
for(const row of v2.items)if(!row.components)row.components=[{address:row.address,largeCode:row.largeCode,mediumCode:row.mediumCode,smallCode:row.smallCode}];
const complex=v2.items[0];
complex.components.push({address:complex.address,largeCode:'10000',mediumCode:'10100',smallCode:'10108'});
complex.largeCode=null;complex.mediumCode=null;complex.smallCode=null;
const checkV2=validateSnapshot(v2,legacy);
assert(checkV2.ok,'Schema v2 with multiple land/building components must validate: '+checkV2.errors.join(', '));
assert.equal(checkV2.summary.changed,0,'Legacy classification already included in components is not a source change');
console.log('PASS schema v2 composite land/building validated against old snapshot');
const wrongPart=copy(v2);
wrongPart.items[0].components[1].address='경기도 성남시 가상동 2';
assert(!validateSnapshot(wrongPart,data).ok,'Wrong region in a component must be rejected');
console.log('PASS reject wrong-region components');
