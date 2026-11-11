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
   (doc.source==='user_upload'||doc.source==='user_entry')));
  const missing=row.required.filter(type=>!recorded.includes(type));
  // Recording a document, including a PDF upload, is NOT legal or official verification.
  return {...row,recorded,missing,recordedCount:recorded.length,neededCount:row.required.length,
   status:'unverified',verified:false,legalConclusion:null,assumedLiabilityWon:null};
 });
}
const RightsSourceChecklist={ROWS,DOC_NAMES,evidenceChecklist};
if(typeof module!=='undefined'&&module.exports)module.exports=RightsSourceChecklist;
if(typeof window!=='undefined')window.RightsSourceChecklist=RightsSourceChecklist;
