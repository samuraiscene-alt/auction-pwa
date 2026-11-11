'use strict';
// Extract only directly written facts; never infer rank, liability or official authentication.
function normalizePdfDate(raw){
 const m=String(raw||'').match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
 if(!m)return null;
 const y=+m[1],mo=+m[2],d=+m[3],t=new Date(Date.UTC(y,mo-1,d));
 return t.getUTCFullYear()===y&&t.getUTCMonth()===mo-1&&t.getUTCDate()===d?
  [y,String(mo).padStart(2,'0'),String(d).padStart(2,'0')].join('-'):null;
}
function parseCourtPdfFacts(pages,type){
 const source=(Array.isArray(pages)?pages:[]).map((text,i)=>({page:i+1,text:String(text||'')}));
 const all=source.map(x=>x.text).join('\n').normalize('NFKC');
 const compact=all.replace(/[\s\u200b-\u200d\u2060\ufeff]/g,'');
 const ids=[...compact.matchAll(/(?:사건(?:번호)?[:：]?)?(20\d{2})타경(\d{1,10})/g)].map(m=>m[1]+'타경'+m[2]);
 const caseNos=[...new Set(ids)];
 const lotCandidates=[...compact.matchAll(/(?:매각)?물건번호[:：]?([1-9]\d{0,3})/g)].map(m=>String(Number(m[1])));
 const itemNos=[...new Set(lotCandidates)];
 const warnings=[];
 const patterns=[
  ['제시 외 건물',/제시\s*외\s*건물|제시외건물/g],
  ['매각 제외 건물',/매각\s*에서\s*제외|매각\s*제외/g],
  ['법정지상권',/법정\s*지상권/g],
  ['유치권 관련 문구',/유치권/g],
  ['대항력·우선변제 관련 문구',/대항력|우선변제권/g]
 ];
 for(const page of source)for(const [label,re] of patterns){
  re.lastIndex=0;const m=re.exec(page.text);
  if(!m||warnings.some(w=>w.label===label&&w.page===page.page))continue;
  const from=Math.max(0,m.index-65),to=Math.min(page.text.length,m.index+125);
  warnings.push({label,page:page.page,excerpt:page.text.slice(from,to).replace(/\s+/g,' ').trim().slice(0,220)});
 }
 const tenants=[];
 if(type==='sale_statement'||type==='occupancy_report'){
  for(const p of source){
   const rows=p.text.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
   for(const row of rows){
    // Only high-confidence table rows: one Korean name, explicit tenant label and a deposit.
    const name=row.match(/^([가-힣]{2,4})\s+/);
    if(!name||!/임차인/.test(row))continue;
    const amount=row.match(/(?:^|\s)(\d{1,3}(?:,\d{3}){1,4})(?:\s|$)/);
    if(!amount)continue;
    const won=Number(amount[1].replace(/,/g,''));
    if(!Number.isSafeInteger(won)||won<=0||won>1e15)continue;
    const after=row.slice(row.indexOf(amount[0])+amount[0].length);
    const dates=[...after.matchAll(/20\d{2}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}/g)]
     .map(m=>normalizePdfDate(m[0])).filter(Boolean);
    // Dates after the deposit may belong to different columns. Never guess their meanings.
    const duplicate=tenants.some(t=>t.name===name[1]&&t.depositWon===won);
    if(!duplicate)tenants.push({name:name[1],depositWon:won,occupancy:'yes',
     moveInOn:null,fixedDateOn:null,distributionDemand:'unknown',
     page:p.page,excerpt:row.slice(0,320),datesForReview:dates.slice(0,6)});
   }
  }
 }
 return {caseNos,itemNos,warnings:warnings.slice(0,25),tenants:tenants.slice(0,40),
  hasReadableText:compact.length>=12,pageCount:source.length};
}
const RightsPdfFacts={parseCourtPdfFacts,normalizePdfDate};
if(typeof window!=='undefined')window.RightsPdfFacts=RightsPdfFacts;
if(typeof module!=='undefined'&&module.exports)module.exports=RightsPdfFacts;
