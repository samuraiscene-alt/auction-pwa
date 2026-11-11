'use strict';
// Evidence readiness only: it never decides legal priority, possession, liens or assumed liability.
const ROWS=Object.freeze([
 {id:'tenant',label:'임차인',required:['sale_statement','occupancy_report','registry'],extra:['lease']},
 {id:'priority',label:'선순위권리',required:['registry','sale_statement'],extra:[]},
 {id:'occupant',label:'점유자',required:['occupancy_report','sale_statement'],extra:['lease']},
 {id:'lien',label:'유치권',required:['sale_statement','occupancy_report'],extra:['other']},
 {id:'special',label:'특수권리',required:['sale_statement','registry','appraisal'],extra:['other']},
 {id:'liability',label:'인수 가능 금액',required:['sale_statement','registry','occupancy_report'],extra:['lease']}
]);
const DOC_NAMES=Object.freeze({
 registry:'등기사항증명서',sale_statement:'매각물건명세서',
 occupancy_report:'현황조사서',appraisal:'감정평가서',
 lease:'임대차 관련 자료',other:'기타 원본'
});
function evidenceChecklist(draft){
 const documents=Array.isArray(draft?.documents)?draft.documents:[];
 return ROWS.map(row=>{
  const recorded=row.required.filter(type=>documents.some(doc=>doc?.type===type&&
   doc.source==='user_upload'&&typeof doc.fileId==='string'&&doc.fileId.length>0));
  const missing=row.required.filter(type=>!recorded.includes(type));
  // Recording a document, including a PDF upload, is NOT legal or official verification.
  return {...row,recorded,missing,recordedCount:recorded.length,neededCount:row.required.length,
   status:'unverified',verified:false,legalConclusion:null,assumedLiabilityWon:null};
 });
}

function verifyPdfCaseIdentity(expected,observed){
 const caseNo=expected?.caseNo,court=expected?.court,itemNo=String(expected?.itemNo||'');
 const extracted=observed?.fields||{},lots=Array.isArray(observed?.itemNos)?observed.itemNos:[];
 const fail=(reason)=>({ok:false,reason,caseMatched:false,legalVerified:false});
 if(typeof caseNo!=='string'||!/^20\d{2}타경\d{1,10}$/.test(caseNo)||
    typeof court!=='string'||!court||!/^[1-9]\d{0,3}$/.test(itemNo))
  return fail('invalid_expected_identity');
 if(!extracted.caseNum)return fail('case_number_unreadable');
 if(extracted.caseNum!==caseNo)return fail('different_case_number');
 if(extracted.court&&extracted.court!==court)return fail('different_court');
 if(lots.some(x=>typeof x!=='string'||!/^[1-9]\d{0,3}$/.test(x))||
    (lots.length>0&&(lots.length!==1||lots[0]!==itemNo)))
  return fail('different_or_multiple_lots');
 return {ok:true,reason:'case_number_matched_only',caseMatched:true,
  courtTextMatched:extracted.court===court,lotTextMatched:lots.length===1,
  legalVerified:false,officialSourceVerified:false};
}

const RightsSourceChecklist={ROWS,DOC_NAMES,evidenceChecklist,verifyPdfCaseIdentity};
if(typeof module!=='undefined'&&module.exports)module.exports=RightsSourceChecklist;
if(typeof window!=='undefined')window.RightsSourceChecklist=RightsSourceChecklist;
