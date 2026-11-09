const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const URL='http://127.0.0.1:8765/index.html';
const key='auction_skeleton_v1';
async function read(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)}
async function visitOfficial(page){await page.locator('[data-page="official"]').first().click()}
async function startEdit(page,id){
 await visitOfficial(page);
 await page.locator('[data-edit-real]').filter({hasText:'등록 내용 수정'}).first().click();
 await page.locator('#officialRecordForm').waitFor();
}
async function createTestCase(page){
 await visitOfficial(page);
 await page.locator('#officialCourt').fill('서울중앙지방법원');
 await page.locator('#officialCase').fill('2026타경999991');
 await page.locator('#officialItemNo').fill('1');
 await page.locator('#officialAddress').fill('서울특별시 테스트구 가상로 1');
 await page.locator('#officialUsageLarge').selectOption({label:'건물'});
 await page.locator('#officialUsageMedium').selectOption({label:'주거용건물'});
 await page.locator('#officialType').selectOption({label:'아파트'});
 await page.locator('#officialAppraisal').fill('500000000');
 await page.locator('#officialMin').fill('400000000');
 await page.locator('#officialSaleDate').fill('2026-11-19');
 await page.locator('#officialRecordForm button[type="submit"]').click();
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'ko-KR',timezoneId:'Asia/Seoul'});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.evaluate(k=>localStorage.removeItem(k),key);
  await page.reload({waitUntil:'domcontentloaded'});
  await createTestCase(page);
  const record0=(await read(page)).realProperties;
  assert.equal(record0.length,1,'create record');
  const old=record0[0];
  assert.equal(old.courtUsage.codes.small,'20104','correct official small code');
  assert.equal(old.type,'아파트');
  await page.locator('#favBtn').click();
  let data=await read(page);
  assert(data.favorites.includes(old.id),'favorite recorded');
  await page.locator('#editRealDetail').click();
  assert.equal(await page.locator('#officialCase').inputValue(),'2026타경999991');
  assert(await page.locator('#officialCase').evaluate(x=>x.readOnly),'case locked');
  assert(await page.locator('#officialItemNo').evaluate(x=>x.readOnly),'item locked');
  await page.locator('#officialMin').fill('350000000');
  await page.locator('#officialSaleDate').fill('2026-11-22');
  await page.locator('#officialRecordForm button[type="submit"]').click();
  data=await read(page);
  assert.equal(data.realProperties.length,1,'edit not duplicated');
  assert.equal(data.realProperties[0].id,old.id,'fixed identity');
  assert.equal(data.realProperties[0].minWon,350000000,'modified price');
  assert.equal(data.realProperties[0].date,'2026.11.22','modified date');
  assert.equal(data.realProperties[0].enteredAt,old.enteredAt,'original created timestamp');
  assert(data.favorites.includes(old.id),'favorite preserved');
  assert(data.realProperties[0].editedAt,'edited timestamp');
  await page.locator('[data-page="schedule"]').first().click();
  // The date selector must show the edited event, not the old event date.
  await page.locator('[data-day="2026-11-22"]').click();
  assert((await page.locator('body').textContent()).includes('2026타경999991'),'edited event visible on updated day');
  await page.locator('[data-day="2026-11-19"]').click();
  assert(!(await page.locator('body').textContent()).includes('2026타경999991'),'edited event absent from previous day');
  console.log('PASS new record -> favorite -> edit price/date -> identity and favorite preserved');
  // Legacy type record without any courtUsage, must be editable without reclassification.
  const legacy={id:'real-서울중앙지방법원|2023타경4869|1',userRegistered:true,
   name:'서울특별시 관악구 봉천동 66-89',court:'서울중앙지방법원',
   case:'2023타경4869',itemNo:'1',type:'토지',valueWon:1994700000,
   minWon:1276608000,date:'2026.11.19',sourceUrl:'https://www.courtauction.go.kr/',enteredAt:1700000000000};
  await page.evaluate(({key,legacy})=>{
    const data=JSON.parse(localStorage.getItem(key));
    data.realProperties.push(legacy);
    data.favorites.push(legacy.id);
    localStorage.setItem(key,JSON.stringify(data));
  },{key,legacy});
  await page.reload({waitUntil:'domcontentloaded'});
  await visitOfficial(page);
  const editButtons=page.locator('[data-edit-real]');
  const count=await editButtons.count();
  assert.equal(count,2);
  const b=page.locator('[data-edit-real]').filter({hasText:'등록 내용 수정'}).first();
  await b.click();
  assert.equal(await page.locator('#officialCase').inputValue(),'2023타경4869');
  assert.equal(await page.locator('#officialUsageLarge').inputValue(),'','legacy unclassified');
  await page.locator('#officialMin').fill('1200000000');
  await page.locator('#officialRecordForm button[type="submit"]').click();
  const updated=await read(page);
  const actual=updated.realProperties.find(x=>x.id===legacy.id);
  assert(actual,'legacy record retained');
  assert.equal(actual.type,'토지','legacy type retained');
  assert.equal(actual.minWon,1200000000,'legacy edited price');
  assert(updated.favorites.includes(legacy.id),'legacy favorite retained');
  assert.equal(actual.enteredAt,1700000000000);
  // Separate static court pilot catalog must never alter user-registered records.
  await page.locator('[data-page="home"]').first().click();
  await page.locator('[data-page="capital"]').first().click();
  await page.waitForFunction(()=>document.getElementById('capitalStatus')?.textContent.includes('마지막 수집'),{timeout:12000});
  assert.equal(await page.locator('.capital-record').count(),40,'initial page shows 40');
  const grouped=page.locator('.capital-case-group').filter({hasText:'2008타경25092'}).first();
  assert.equal(await grouped.count(),1,'2008 case rendered once');
  assert.equal(await grouped.locator('.capital-property').count(),15,'15 individual items preserved');
  await grouped.locator('summary').click();
  assert(await grouped.evaluate(x=>x.open),'same-case details can be expanded');
  // Official small-class filter: only matching item numbers remain, even inside mixed cases.
  const types=await page.locator('#capitalTypeFilter option').allTextContents();
  assert(types.includes('아파트'),'apartment available in court category selector');
  await page.locator('#capitalTypeFilter').selectOption('20104');
  const selected=await page.locator('.capital-property .auction-type').allTextContents();
  assert(selected.length>0&&selected.every(x=>x.trim()==='아파트'),'apartment filter uses legal small-class code');
  assert.equal(await page.locator('#capitalTypeFilter').inputValue(),'20104','type persists');
  await page.locator('#capitalTypeFilter').selectOption('전체');
  assert.equal(await page.locator('.capital-record').count(),40,'all categories restored to initial 40 cases');
  assert((await page.locator('.capital-property').count())>40,'all item numbers within case groups preserved');
  assert((await page.locator('#capitalStatus').textContent()).includes('마지막 수집'),'shows last collection timestamp');
  assert(/안전검증 기록|자동 형식 검사 통과/.test(await page.locator('body').textContent()),'validation status is visible');
  console.log('PASS court-category dropdown filters individual auction items');
  await page.locator('[data-capital-region="서울"]').click();
  assert((await page.locator('body').textContent()).includes('수집된 물건'),'Seoul filter renders');
  await page.locator('[data-capital-region="전체"]').click();
  await page.locator('#capitalMore').click();
  assert.equal(await page.locator('.capital-record').count(),80,'show more 40');
  await page.locator('#capitalSearch').fill('2026타경999991');
  await page.locator('#capitalSearchForm button[type="submit"]').click();
  assert.equal(await page.locator('.capital-record').count(),0,'search excludes local user record');
  const postCatalog=await read(page);
  assert(postCatalog.favorites.includes(legacy.id),'catalog browse did not alter saved favorite');
  console.log('PASS metropolitan public catalog load, filters, paging and local isolation');
  assert.equal(errors.length,0,'no page JS errors: '+errors.join(';'));
  console.log('PASS legacy record -> modify price without category conversion');
  console.log('PASS no browser page errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
