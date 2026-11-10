'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const snapshot=JSON.parse(fs.readFileSync('data/capital-court-pilot.json','utf8'));
const start=app.indexOf('const COURT_FAVORITES_LIMIT=200;');
const end=app.indexOf('function sortedFavorites(){',start);
assert(start>=0&&end>start,'court favorite helpers missing');
let writes=0,failWrite=false;
const saved={favorites:['demo1'],notes:[{id:1,title:'test',body:'keep'}]};
const compile=Function('saved','write','validAuctionCalendarDay','escapeHtml','prettyPrice','state',
 app.slice(start,end)+';return {validCourtFavorite,courtFavorites,courtFavoriteFromLot,setCourtFavorite,courtFavoriteCards};');
const state={favoriteType:'전체',favoriteSort:'recent'};
const methods=compile(saved,()=>{writes++;if(failWrite)throw Error('storage failed');},
 date=>/^20\d{2}-\d{2}-\d{2}$/.test(String(date))?{value:date}:null,
 x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
 n=>Number(n).toLocaleString('ko-KR')+'원',state);
const lot=snapshot.items.find(x=>x.saleDate!==null);
assert(lot&&snapshot.validation?.passed,'fixture snapshot must be verified');
assert.equal(methods.courtFavorites().length,0);
methods.setCourtFavorite(lot,true);
assert.equal(writes,1);
assert.equal(methods.courtFavorites().length,1);
assert.equal(methods.courtFavorites()[0].id,lot.id);
assert.equal(methods.courtFavorites()[0].minimumWon,lot.minimumWon);
assert.equal(saved.favorites[0],'demo1','legacy favorites must stay untouched');
assert.equal(saved.notes[0].body,'keep');
assert(methods.courtFavoriteCards().includes('해당 사건 찾기'));
assert(methods.courtFavoriteCards().includes('저장 당시'));
methods.setCourtFavorite(lot,true);
assert.equal(methods.courtFavorites().length,1,'save twice must deduplicate');
assert.equal(methods.validCourtFavorite({...methods.courtFavorites()[0],caseNo:'2025타경1'}),false);
assert.equal(methods.validCourtFavorite({...methods.courtFavorites()[0],minimumWon:-1}),false);
assert.equal(methods.validCourtFavorite({...methods.courtFavorites()[0],saleDate:'not-a-date'}),false);
const prior=saved.courtFavorites;
failWrite=true;
assert.throws(()=>methods.setCourtFavorite(lot,false),/storage failed/);
assert.strictEqual(saved.courtFavorites,prior,'failed storage must roll back');
failWrite=false;
methods.setCourtFavorite(lot,false);
assert.equal(methods.courtFavorites().length,0);
assert.equal(saved.favorites[0],'demo1');
assert(app.includes('payload.data.courtFavorites.some(x=>!validCourtFavorite(x))'),'restore must validate court favorites');
assert(app.includes('new Set(payload.data.courtFavorites.map(x=>x.id)).size'),'restore must reject duplicate IDs');
assert(app.includes('data.favorites.length+(data.courtFavorites?.length||0)'),'backup summary must include court lots');
console.log('PASS: separate court favorites, persistence, dedupe, rollback and backup validation');
