'use strict';
// Court PDF text extraction: facts and excerpts only, never a legal conclusion.
function normalizePdfDate(value){
 const m=String(value||'').match(/(20\d{2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})/);
 if(!m)return null;
 const y=+m[1],mo=+m[2],day=+m[3],d=new Date(Date.UTC(y,mo-1,day));
 return d.getUTCFullYear()===y&&d.getUTCMonth()+1===mo&&d.getUTCDate()===day?
  y+'-'+String(mo).padStart(2,'0')+'-'+String(day).padStart(2,'0'):null;
}
function parseCourtPdfFacts(pages,selectedType){
 const source=(Array.isArray(pages)?pages:[]).map((value,i)=>({page:i+1,text:String(value||'').normalize('NFKC')}));
 const all=source.map(x=>x.text).join('\n'),compact=all.replace(/[\s\u200b-\u200d\u2060\ufeff]/g,'');
 const caseNos=[...new Set([...compact.matchAll(/(20\d{2})타경(\d{1,10})/g)].map(m=>m[1]+'타경'+m[2]))];
 const itemNos=[...new Set([...compact.matchAll(/(?:매각)?물건번호[:：]?([1-9]\d{0,3})/g)].map(m=>String(+m[1])))];
 const opening=compact.slice(0,1400);
 const types=[['sale_statement',/매각물건명세서/],['occupancy_report',/현황조사서/],
  ['registry',/등기사항(?:전부|일부)?증명서|등기부등본/],['appraisal',/감정평가서/]];
 const identified=types.filter(([_,pattern])=>pattern.test(opening));
 const documentType=identified.length===1?identified[0][0]:null;
 const patterns=[
  ['매각 제외 건물',/매각\s*(?:에서\s*)?제외|매각\s*대상\s*아님|매각에서제외/],
  ['제시 외 건물',/제시\s*외\s*건물|제시외건물/],
  ['법정지상권',/법정\s*지상권/],
  ['유치권 관련 문구',/유치권/],
  ['대항력·우선변제 관련 문구',/대항력|우선변제권/]
 ];
 const warnings=[];
 for(const [label,re] of patterns){
  for(const page of source){
   const candidate=page.text.replace(/[ \t]+/g,' ');
   const m=re.exec(candidate);
   if(!m)continue;
   const lineStart=candidate.lastIndexOf('\n',m.index)+1;
   const lineEnd=candidate.indexOf('\n',m.index);
   const context=candidate.slice(Math.max(lineStart,m.index-40),lineEnd<0?Math.min(candidate.length,m.index+150):Math.min(lineEnd,m.index+150));
   warnings.push({label,page:page.page,excerpt:context.trim().slice(0,170)});
   break; // one citation per warning category, no repeated walls of text
  }
 }
 const tenants=[],hasDateHeaders=/전입\s*신고/.test(all)&&/확정\s*일자/.test(all);
 // A tenant is a person listed in the occupancy table, not merely a person
 // whose deposit is known. Court PDF cells can span multiple visual lines.
 if(selectedType==='sale_statement'||documentType==='sale_statement'||selectedType==='occupancy_report'){
  const skip=/^(?:주거|임차인|현황조사|권리신고|점유자|보증금|성명|구분|부분|정보출처|임대차기간|확정일자|차임|요구여부|비고란|전입신고일자|부동산|최선순위|사건번호)$/;
  for(const page of source){
   const table=page.text.match(/점\s*유\s*자|점유자/);
   if(!table)continue;
   const begin=table.index;
   const stop=page.text.slice(begin).search(/(?:^|\n)\s*(?:<비고>|비고란|매각에 따라 설정된)/);
   const section=page.text.slice(begin,stop<0?undefined:begin+stop);
   const rows=section.split(/\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
   const anchors=[];
   for(let i=0;i<rows.length;i++){
    const m=rows[i].match(/^([가-힣]{2,4})(?=\s|$)/);
    if(!m||skip.test(m[1]))continue;
    // Require independent table evidence, including for rows with no deposit.
    const nearby=rows.slice(Math.max(0,i-3),Math.min(rows.length,i+5)).join(' ');
    if(!/(?:주거|임차인|현황조사|권리신고)/.test(nearby))continue;
    if(!/20\d{2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{1,2}|\d{1,3}(?:,\d{3}){1,4}/.test(nearby))continue;
    anchors.push({i,name:m[1]});
   }
   for(let k=0;k<anchors.length;k++){
    const {i,name}=anchors[k];
    if(tenants.some(x=>x.name===name))continue;
    const next=anchors[k+1]?.i??rows.length;
    const before=rows.slice(Math.max(0,i-2),i).join(' ');
    const block=rows.slice(i,next).join(' ');
    const evidence=(before+' '+block).trim();
    const amount=block.match(/(?:^|[^\d])(\d{1,3}(?:,\d{3}){1,4})(?!\d)/);
    const depositWon=amount?Number(amount[1].replace(/,/g,'')):null;
    if(depositWon!==null&&(!Number.isSafeInteger(depositWon)||depositWon<100000||depositWon>1e15))continue;
    const afterAmount=amount?block.slice(block.indexOf(amount[1])+amount[1].length):block;
    const dates=[...afterAmount.matchAll(/20\d{2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{1,2}/g)]
     .map(m=>normalizePdfDate(m[0])).filter(Boolean);
    const allDates=[...block.matchAll(/20\d{2}\s*[.\/-]\s*\d{1,2}\s*[.\/-]\s*\d{1,2}/g)]
     .map(m=>normalizePdfDate(m[0])).filter(Boolean);
    // Never manufacture a deposit or an exact-date classification from an
    // unknown column. One unlabelled date is kept for manual review.
    tenants.push({name,depositWon,occupancy:/주거\s*임차인/.test(evidence)?'yes':'unknown',
     moveInOn:hasDateHeaders&&dates.length>=2?dates[0]:
      (hasDateHeaders&&depositWon===null&&/현황조사/.test(block)&&dates.length===1?dates[0]:null),
     fixedDateOn:hasDateHeaders&&dates.length>=2?dates[1]:null,
     distributionDemand:'unknown',page:page.page,excerpt:evidence.slice(0,260),
     datesForReview:allDates.slice(0,7)});
   }
  }
 }
 return {caseNos,itemNos,documentType,warnings:warnings.slice(0,8),tenants:tenants.slice(0,40),
  hasReadableText:compact.length>=12,pageCount:source.length};
}
const RightsPdfFacts={parseCourtPdfFacts,normalizePdfDate};
if(typeof window!=='undefined')window.RightsPdfFacts=RightsPdfFacts;
if(typeof module!=='undefined'&&module.exports)module.exports=RightsPdfFacts;
