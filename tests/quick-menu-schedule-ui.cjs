'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8'),css=fs.readFileSync('style.css','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert(app.includes("const QUICK_MENU_KEY='auction_quick_menu_v1'"));
assert(app.includes("const DEFAULT_QUICK_IDS=QUICK_MENU_ITEMS.slice(0,5)"));
assert(app.includes('function readQuickMenu()'));
assert(app.includes('function persistQuickMenu(next)'));
for(const item of ['official','capital','address','case','study','schedule','favorites','advanced','special'])
 assert(app.includes("id:'"+item+"'"),'missing shortcut '+item);
for(const button of ['quickEditToggle','quickReset','data-quick-toggle','data-quick-move'])
 assert(app.includes(button),'missing editing control '+button);
assert(app.includes("showSavedCheck('빠른 메뉴 저장 완료')"));
assert(app.includes('function verificationPlanMarkup(day)'));
assert(app.includes('verificationPlanMarkup(chosen)'));
assert(app.includes('loadVerificationPlan()'));
assert(app.includes("payload.automaticCourtRequests!==0"));
assert(app.includes("payload.legalStatusVerified!==false"));
assert(app.includes('실제 법원 조회·낙찰·유찰·취하 확인 결과가 아닙니다'));
assert(css.includes('.quick-edit-row')&&css.includes('.court-plan-row'));
assert(sw.includes('./data/court-verification-plan.json'));
console.log('PASS: configurable home shortcuts and advisory-only date schedule connected');
