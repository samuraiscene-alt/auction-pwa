'use strict';
// Rights-analysis draft schema, for manual factual notes ONLY.
// It does not infer a legal ranking, tenant priority, transfer, or liability.
const MAX_WON=1_000_000_000_000_000;
const DOC_TYPES=new Set(['registry','sale_statement','occupancy_report','appraisal','lease','other']);
const RIGHT_TYPES=new Set(['mortgage','seizure','provisional_seizure','ownership','leasehold','provisional_registration','injunction','other']);
const OCCUPANCY=new Set(['unknown','yes','no']);
const DEMAND=new Set(['unknown','yes','no']);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const str=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max&&x.trim()===x;
const nullable=(value,fn)=>value===null||fn(value);
const money=x=>Number.isSafeInteger(x)&&x>=0&&x<=MAX_WON;
function dateOK(x){
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(String(x)))return false;
 const [y,m,d]=x.split('-').map(Number);
 return m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate();
}
function propertyOK(x){
 return str(x,190)&&(
 /^court-B\d{6}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(x)||
 /^real-[^|\n]{1,100}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(x));
}
function validateRightsDraft(x){
 const fail=reason=>({valid:false,reason});
 if(!isObject(x)||x.schemaVersion!==1||!propertyOK(x.propertyId))
  return fail('invalid_identity_or_schema');
 if(!Array.isArray(x.documents)||x.documents.length>40||
    !Array.isArray(x.rights)||x.rights.length>100||
    !Array.isArray(x.tenants)||x.tenants.length>100)
  return fail('invalid_collection');
 if(!nullable(x.reviewedOn,dateOK))return fail('invalid_review_date');
 const ids=new Set();
 const unique=items=>items.every(v=>{
  if(!isObject(v)||!str(v.id,36)||!/^[a-zA-Z0-9_-]+$/.test(v.id)||ids.has(v.id))return false;
  ids.add(v.id);return true;
 });
 if(!unique(x.documents)||!unique(x.rights)||!unique(x.tenants))
  return fail('duplicate_or_invalid_id');
 for(const d of x.documents){
  if(!DOC_TYPES.has(d.type)||!['user_upload','user_entry'].includes(d.source)||
     !nullable(d.issuedOn,dateOK)||!nullable(d.checkedOn,dateOK)||
     !nullable(d.reference,v=>str(v,220))||d.officiallyVerified!==false)
   return fail('invalid_document');
 }
 const docIds=new Set(x.documents.map(d=>d.id));
 const validDocId=v=>v===null||docIds.has(v);
 for(const r of x.rights){
  if(!RIGHT_TYPES.has(r.type)||!nullable(r.registeredOn,dateOK)||
     !nullable(r.rank,v=>Number.isSafeInteger(v)&&v>=1&&v<=1000000)||
     !nullable(r.amountWon,money)||!validDocId(r.documentId)||
     !nullable(r.notes,v=>str(v,1000))||r.legalEffectVerified!==false)
   return fail('invalid_right');
 }
 for(const t of x.tenants){
  if(!OCCUPANCY.has(t.occupancy)||!DEMAND.has(t.distributionDemand)||
     !nullable(t.moveInOn,dateOK)||!nullable(t.fixedDateOn,dateOK)||
     !nullable(t.depositWon,money)||!validDocId(t.documentId)||
     !nullable(t.notes,v=>str(v,1000))||t.liabilityVerified!==false)
   return fail('invalid_tenant');
 }
 return {valid:true,reason:'manual_draft_only',legalStatusVerified:false,
  liabilityVerified:false,documentCount:x.documents.length,
  rightsCount:x.rights.length,tenantCount:x.tenants.length};
}
function newRightsDraft(propertyId){
 const result={schemaVersion:1,propertyId,reviewedOn:null,documents:[],rights:[],tenants:[]};
 if(!propertyOK(propertyId))throw Error('invalid_property_id');
 return result;
}
module.exports={newRightsDraft,validateRightsDraft};
