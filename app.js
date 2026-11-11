const $=s=>document.querySelector(s);const APP_VERSION='0.7.50';const STORE='auction_skeleton_v1';let state={page:'home',filter:'전체',selected:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0'),viewMonth:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'),calendarFavoritesOnly:false,detail:null,note:null,search:'',region:'전체',minPrice:'',maxPrice:'',priceUnit:'원',detailTab:'overview',favoriteSort:'recent',favoriteType:'전체',capitalRegion:'전체',capitalType:'전체',capitalQuery:'',capitalLimit:40,capitalReviewDate:'',capitalReviewStage:'',capitalFocusId:'',editRealId:null,rightsPropertyId:null,noteQuery:'',noteSort:'recent',studyCategory:'전체',noteTopicDraft:''};let saved;try{saved=JSON.parse(localStorage.getItem(STORE))||{favorites:[],notes:[]}}catch{saved={favorites:[],notes:[]}}const write=()=>{
 const encoded=JSON.stringify(saved);
 localStorage.setItem(STORE,encoded);
 if(localStorage.getItem(STORE)!==encoded)throw Error('기기 저장 확인에 실패했어요.');
};
let activeNoteEditor=null;
const DRAFT_PREFIX='auction_note_draft_v1:';
let draftTimer=null;
let draftSession=null;

let updateState={checking:false,available:false,latest:APP_VERSION,registration:null,network:false};
const STORAGE_STAMP_KEY='auction_pwa_lastbackup_v1';
let editorDirty=false;
function setEditorDirty(value){editorDirty=Boolean(value);updateUpdateStatus();}
function draftKey(noteId){return DRAFT_PREFIX+(noteId==null?'new':String(noteId));}
function clearDraft(noteId){
 clearTimeout(draftTimer);
 try{localStorage.removeItem(draftKey(noteId));}catch(err){toast('임시저장 정리에 실패했어요.');}
}
function captureNoteDraft(){
 if(!activeNoteEditor||state.page!=='note')return null;
 const data=activeNoteEditor.getData(),category=normalizedStudyCategory($('#noteCategory').value);
 return {noteId:state.note==null?null:Number(state.note),title:$('#noteTitle').value,category,topicId:normalizedStudyTopic($('#noteTopic').value,category),body:data.body,annotations:data.annotations,sources:data.sources,updatedAt:Date.now()};
}
function persistNoteDraft(){
 clearTimeout(draftTimer);draftTimer=null;
 if(!editorDirty||!activeNoteEditor||state.page!=='note')return;
 try{
  const draft=captureNoteDraft();
  if(draft){
   localStorage.setItem(draftKey(draft.noteId),JSON.stringify(draft));
   const indicator=$('#noteDraftStatus');
   if(indicator)indicator.textContent='임시저장됨 · 노트 저장을 눌러 최종 저장';
  }
 }catch(err){const indicator=$('#noteDraftStatus');if(indicator)indicator.textContent='임시저장 실패 · 노트 저장 권장';}
}
function scheduleNoteDraft(){
 if(!activeNoteEditor||state.page!=='note')return;
 clearTimeout(draftTimer);
 draftTimer=setTimeout(persistNoteDraft,650);
 const indicator=$('#noteDraftStatus');
 if(indicator)indicator.textContent='작성 중…';
}
function readNoteDraft(noteId){
 try{
  const raw=localStorage.getItem(draftKey(noteId));
  if(!raw)return null;
  const data=JSON.parse(raw);
  if(!data||data.noteId!==(noteId==null?null:Number(noteId))||typeof data.body!=='string'||typeof data.title!=='string')return null;
  return data;
 }catch{return null;}
}
function recoverNoteDraft(){
 const original=saved.notes.find(n=>n.id===state.note);
 const draft=readNoteDraft(state.note);
 if(!draft||Number(draft.updatedAt)<=Number(original?.updatedAt||0))return;
 if(!confirm('저장되지 않은 공부 노트의 임시기록이 있어요.\n복구하시겠어요?\n\n취소를 누르면 기존 저장 노트가 열리며 임시기록은 보관됩니다.'))return;
 const category=normalizedStudyCategory(draft.category);
 $('#noteTitle').value=draft.title;
 $('#noteCategory').value=category;
 const topic=$('#noteTopic');
 topic.innerHTML='<option value="">연결하지 않음</option>'+studyTopicOptions(category).map(t=>'<option value="'+escapeHtml(t.id)+'">'+escapeHtml(t.name)+'</option>').join('');
 topic.value=normalizedStudyTopic(draft.topicId,category);
 activeNoteEditor.setData({body:draft.body,annotations:draft.annotations,sources:draft.sources});
 setEditorDirty(true);
 const indicator=$('#noteDraftStatus');
 if(indicator)indicator.textContent='임시기록 복구됨 · 노트 저장을 눌러주세요';
}
window.addEventListener('pagehide',persistNoteDraft);
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistNoteDraft();});

function statusText(){
 if(updateState.checking)return '서버 최신 버전 확인 중…';
 if(updateState.available)return '새 버전 v'+updateState.latest+' 준비됨 · 현재 v'+APP_VERSION;
 if(!navigator.onLine)return '오프라인 · 설치된 버전 v'+APP_VERSION;
 if(!updateState.network)return '서버 버전 확인 필요 · 설치된 버전 v'+APP_VERSION;
 return '서버 확인 완료 · 현재 v'+APP_VERSION;
}
function updateUpdateStatus(){
 const info=$('#appUpdateState');
 if(info)info.textContent=statusText();
 const button=$('#checkUpdate');
 if(button){button.disabled=updateState.checking;button.textContent=updateState.available?'업데이트 적용':'업데이트 확인';}
 const row=$('#updateAvailableMessage');
 if(row)row.hidden=!updateState.available;
}
function newerAppVersion(remote,installed){
 if(!/^\d+\.\d+\.\d+$/.test(remote)||!/^\d+\.\d+\.\d+$/.test(installed))return false;
 const a=remote.split('.').map(Number),b=installed.split('.').map(Number);
 for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}
 return false;
}
async function inspectAppUpdate(announce=false){
 if(!('serviceWorker'in navigator)||location.protocol==='file:'){
  if(announce)toast('이 환경에서는 자동 업데이트를 사용할 수 없어요.');return;
 }
 if(updateState.checking)return;
 updateState.checking=true;updateUpdateStatus();
 try{
  // SW update may fail independently of the version probe; do not suppress a
  // real newer server version solely because SW registration was unavailable.
  try{
   const reg=await navigator.serviceWorker.getRegistration('./');
   if(reg){updateState.registration=reg;await reg.update();}
  }catch(error){console.warn('Service worker refresh failed:',error);}
  const response=await fetch('./VERSION.txt?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('버전 확인 응답 오류');
  const remote=(await response.text()).trim().split(/\s+/)[0];
  if(!/^\d+\.\d+\.\d+$/.test(remote))throw Error('버전 정보 오류');
  updateState.latest=remote;
  updateState.available=newerAppVersion(remote,APP_VERSION);
  updateState.network=true;
  if(announce)toast(updateState.available?'새 버전 v'+remote+'이 준비됐어요.':'서버 버전 v'+remote+' 확인 완료');
 }catch(err){
  updateState.network=false;
  if(announce)toast(navigator.onLine?'서버 버전 확인 실패 · 배포 상태를 확인해 주세요.':'인터넷에 연결한 뒤 확인해 주세요.');
 }finally{updateState.checking=false;updateUpdateStatus();}
}
function applyAppUpdate(){
 if(editorDirty){
  toast('작성 중인 노트를 먼저 저장해 주세요.');
  return;
 }
 if(!updateState.available){void inspectAppUpdate(true);return;}
 // A fresh navigation URL avoids reusing an old HTML navigation cache.
 // Keep a one-shot confirmation marker without touching saved auctions or notes.
 const confirmation=JSON.stringify({version:updateState.latest,createdAt:Date.now()});
 try{sessionStorage.setItem('auction_update_confirmation_v1',confirmation);}catch{}
 // iOS standalone PWA may start a new session after navigation.
 try{localStorage.setItem('auction_update_confirmation_v2',confirmation);}catch{}
 const url=new URL(location.href);
 url.searchParams.set('app_update',updateState.latest);
 location.replace(url.pathname+url.search+url.hash);
}
async function confirmAppliedUpdate(){
 // Compare the running app, server version and previous installed version.
 // Durable storage survives iOS home-screen navigation; URL fallback handles a new web-app session.
 const sessionKey='auction_update_confirmation_v1';
 const durableKey='auction_update_confirmation_v2';
 const lastKey='auction_last_running_version_v1';
 const valid=v=>/^\d+\.\d+\.\d+$/.test(v);
 let previous='',pending='',urlTarget='';
 try{
  previous=localStorage.getItem(lastKey)||'';
  pending=localStorage.getItem(durableKey)||sessionStorage.getItem(sessionKey)||'';
 }catch{
  try{pending=sessionStorage.getItem(sessionKey)||'';}catch{}
 }
 try{urlTarget=new URL(location.href).searchParams.get('app_update')||'';}catch{}
 let target='';
 try{target=String(JSON.parse(pending).version||'');}catch{target=pending;}
 // Record the currently running version without modifying auction, note or attachment data.
 try{localStorage.setItem(lastKey,APP_VERSION);}catch{}
 const versionChanged=valid(previous)&&newerAppVersion(APP_VERSION,previous);
 const requested=(valid(target)&&target===APP_VERSION)||(valid(urlTarget)&&urlTarget===APP_VERSION);
 if(!versionChanged&&!requested)return;
 try{
  const response=await fetch('./VERSION.txt?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)return;
  const actual=(await response.text()).trim().split(/\s+/)[0];
  if(actual!==APP_VERSION)return;
  try{localStorage.removeItem(durableKey);}catch{}
  try{sessionStorage.removeItem(sessionKey);}catch{}
  // Remove the navigation token to prevent a repeated success message on normal launches.
  if(urlTarget===APP_VERSION){
   try{
    const clean=new URL(location.href);
    clean.searchParams.delete('app_update');
    history.replaceState(history.state,'',clean.pathname+clean.search+clean.hash);
   }catch{}
  }
  // Home-screen PWA may be suspended while the replacement document is starting.
  if(document.visibilityState==='hidden'){
   document.addEventListener('visibilitychange',function onVisible(){
    if(document.visibilityState!=='visible')return;
    document.removeEventListener('visibilitychange',onVisible);
    showSavedCheck('업데이트 완료');
   });
  }else{
   showSavedCheck('업데이트 완료');
  }
 }catch(error){console.warn('Update confirmation deferred:',error);}
}
function initUpdateMonitoring(){
 window.addEventListener('online',()=>inspectAppUpdate(false));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)inspectAppUpdate(false);});
 window.addEventListener('pageshow',event=>{if(event.persisted)inspectAppUpdate(false);});
 if('serviceWorker'in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(updateState.available)updateUpdateStatus();
  });
 }
 inspectAppUpdate(false);
}

const ATTACH_DB='auction-note-files-v1',ATTACH_STORE='files',MAX_NOTE_ATTACH=8,MAX_FILE_BYTES=8*1024*1024;
let attachDbPromise=null;
function attachmentDb(){
 if(!('indexedDB'in window))return Promise.reject(Error('이 기기에서는 파일 저장을 지원하지 않아요.'));
 if(!attachDbPromise)attachDbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open(ATTACH_DB,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(ATTACH_STORE)){const store=db.createObjectStore(ATTACH_STORE,{keyPath:'id'});store.createIndex('noteId','noteId');}};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('파일 저장소를 열 수 없어요.'));
 }).catch(err=>{attachDbPromise=null;throw err;});
 return attachDbPromise;
}
async function attachmentList(noteId){
 const db=await attachmentDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ATTACH_STORE,'readonly');
  const req=tx.objectStore(ATTACH_STORE).index('noteId').getAll(Number(noteId));
  req.onsuccess=()=>resolve(req.result||[]);
  req.onerror=()=>reject(req.error||Error('첨부파일 목록을 읽지 못했어요.'));
 });
}
async function allAttachments(){
 const db=await attachmentDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ATTACH_STORE,'readonly'),req=tx.objectStore(ATTACH_STORE).getAll();
  req.onsuccess=()=>resolve(req.result||[]);
  req.onerror=()=>reject(req.error||Error('첨부파일을 읽지 못했어요.'));
 });
}
async function attachmentReplaceForNote(noteId,files){
 const db=await attachmentDb();
 const previous=await attachmentList(noteId);
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ATTACH_STORE,'readwrite'),store=tx.objectStore(ATTACH_STORE);
  previous.forEach(item=>store.delete(item.id));
  files.forEach(item=>store.put({...item,noteId:Number(noteId)}));
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('첨부파일 저장에 실패했어요.'));
  tx.onabort=()=>reject(tx.error||Error('첨부파일 저장이 취소됐어요.'));
 });
}
async function attachmentDeleteNote(noteId){return attachmentReplaceForNote(noteId,[]);}
async function attachmentRestoreAll(files){
 const db=await attachmentDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ATTACH_STORE,'readwrite'),store=tx.objectStore(ATTACH_STORE);
  store.clear();
  files.forEach(item=>store.put(item));
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('첨부파일 복원 실패'));
  tx.onabort=()=>reject(tx.error||Error('첨부파일 복원 취소'));
 });
}

const MAX_RIGHTS_PDF_BYTES=8*1024*1024;
// Rights PDFs share the existing IndexedDB and whole-backup attachment stream.
// -1 cannot collide with normal positive note IDs. The explicit property/doc IDs
// avoid linking a saved file to a different court lot.
function verifyRightsPdfAttachment(file){
 return file&&file.noteId===-1&&typeof file.rightsPropertyId==='string'&&
  /^(court-B\d{6}|real-[^|\n]{1,100})\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(file.rightsPropertyId)&&
  typeof file.rightsDocId==='string'&&/^[A-Za-z0-9_-]{1,36}$/.test(file.rightsDocId)&&
  file.type==='application/pdf'&&typeof file.name==='string'&&file.name.length<=180&&
  Number.isSafeInteger(file.size)&&file.size>0&&file.size<=MAX_RIGHTS_PDF_BYTES&&
  typeof file.data==='string'&&file.data.startsWith('data:application/pdf;base64,');
}
async function rightsPdfPut(file){
 if(!verifyRightsPdfAttachment(file))throw Error('권리 원본 PDF 형식 오류');
 const db=await attachmentDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ATTACH_STORE,'readwrite');
  tx.objectStore(ATTACH_STORE).put(file);
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(tx.error||Error('PDF 저장 실패'));
  tx.onabort=()=>reject(tx.error||Error('PDF 저장 취소'));
 });
}
async function rightsPdfGet(id){
 const db=await attachmentDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ATTACH_STORE,'readonly');
  const req=tx.objectStore(ATTACH_STORE).get(id);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error||Error('PDF 읽기 실패'));
 });
}
async function rightsPdfDelete(id){
 const db=await attachmentDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(ATTACH_STORE,'readwrite');
  tx.objectStore(ATTACH_STORE).delete(id);
  tx.oncomplete=resolve;
  tx.onerror=()=>reject(tx.error||Error('PDF 제거 실패'));
 });
}
function openRightsPdfViewer(file){
 if(!verifyRightsPdfAttachment(file))throw Error('보관된 원본 PDF 확인 실패');
 const base64=file.data.slice('data:application/pdf;base64,'.length);
 const binary=atob(base64);
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const layer=document.createElement('div');
 layer.className='rights-pdf-overlay';
 layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
 const head=document.createElement('div');head.className='rights-pdf-head';
 const title=document.createElement('strong');title.textContent=file.name;
 const close=document.createElement('button');close.type='button';close.textContent='닫기';close.className='secondary';
 const frame=document.createElement('iframe');frame.title='권리분석 PDF 원본: '+file.name;frame.src=url;
 head.append(title,close);layer.append(head,frame);
 let closed=false;
 const dismiss=()=>{if(closed)return;closed=true;layer.remove();URL.revokeObjectURL(url);};
 close.onclick=dismiss;
 layer.addEventListener('keydown',event=>{if(event.key==='Escape')dismiss();});
 document.body.append(layer);close.focus();
}

function attachmentId(){return 'file-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function readFileAsDataUrl(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(Error('파일을 읽지 못했어요.'));
  reader.readAsDataURL(file);
 });
}
function verifyAttachment(item){
 return item&&typeof item.id==='string'&&typeof item.noteId==='number'&&typeof item.name==='string'&&typeof item.data==='string'
  &&item.data.startsWith('data:')&&(item.type==='application/pdf'||item.type.startsWith('image/'))&&
  (item.noteId!==-1||verifyRightsPdfAttachment(item));
}
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PRICE_FACTORS={'원':1,'만원':10000,'억원':100000000};
function priceFromInput(value,unit){
  const text=String(value??'').replace(/,/g,'').trim();
  if(text==='')return null;
  if(!/^(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(text))return NaN;
  const n=Number(text)*PRICE_FACTORS[unit];
  return Number.isSafeInteger(Math.round(n))&&n>=0?Math.round(n):NaN;
}
function numberInUnit(won,unit){
  if(won===null||won===undefined||won==='')return '';
  const n=Number(won)/PRICE_FACTORS[unit];
  return String(Number(n.toFixed(unit==='억원'?4:unit==='만원'?2:0)));
}
function prettyPrice(won){
  if(won===null||won===undefined||won===''||!Number.isFinite(Number(won)))return '';
  let value=Math.round(Number(won));
  if(value===0)return '0원';
  const jo=Math.floor(value/1000000000000);value%=1000000000000;
  const eok=Math.floor(value/100000000);value%=100000000;
  const man=Math.floor(value/10000);value%=10000;
  return [jo?jo.toLocaleString('ko-KR')+'조':'',eok?eok.toLocaleString('ko-KR')+'억':'',man?man.toLocaleString('ko-KR')+'만':'',value?value.toLocaleString('ko-KR'):''].filter(Boolean).join(' ')+'원';
}
const DEMO_PRICES={demo1:875000000,demo2:336000000,demo3:413000000};
const properties=[{id:'demo1',type:'아파트',name:'서울 강남구 아파트',court:'서울중앙지방법원',case:'2026타경12345',value:'12억 5,000만원',min:'8억 7,500만원',date:'2026.11.17',flag:'2회 유찰'},{id:'demo2',type:'빌라',name:'경기 성남시 다세대주택',court:'수원지방법원',case:'2026타경23456',value:'4억 8,000만원',min:'3억 3,600만원',date:'2026.11.18',flag:'추가 확인'},{id:'demo3',type:'단독주택',name:'서울 성북구 단독주택',court:'서울북부지방법원',case:'2026타경34567',value:'5억 9,000만원',min:'4억 1,300만원',date:'2026.11.20',flag:'1회 유찰'}];
const OFFICIAL_AUCTION_URL='https://www.courtauction.go.kr/';
const OFFICIAL_CASE_SEARCH_URL='https://www.courtauction.go.kr/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ159M00.xml&pgjId=159M00';
const COURT_VERIFY_URL='https://joon-auction-court.samuraiscene.workers.dev/case';
const COURT_ITEM_URL='https://joon-auction-court.samuraiscene.workers.dev/item';
function registeredProperties(){return Array.isArray(saved.realProperties)?saved.realProperties:[]}
function allProperties(){return [...registeredProperties(),...properties]}
function propertyPrice(p){return p&&p.userRegistered?(Number.isSafeInteger(p.minWon)&&p.minWon>0?p.minWon:null):DEMO_PRICES[p.id]}
function compactAuctionPrice(text){return String(text).replace(/(\d{1,3}),000원$/,(_,n)=>n+'천원')}
function knownAuctionPrice(p,value){return p.userRegistered?(Number.isSafeInteger(value)&&value>0?prettyPrice(value):'미확인'):prettyPrice(value)}

function propertyDate(p){return String(p.date||'').replaceAll('.','-')}
function nextRegisteredAuction(){const today=new Date(),key=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');return registeredProperties().filter(p=>propertyDate(p)>=key).sort((a,b)=>propertyDate(a).localeCompare(propertyDate(b)))[0]||null;}
function realCaseId(court,caseNumber,itemNo){return 'real-'+[court,caseNumber,itemNo].join('|')}
function isSafeAuctionUrl(url){try{const u=new URL(url);return u.protocol==='https:'&&(/(^|\.)courtauction\.go\.kr$/i).test(u.hostname)}catch{return false}}
// Official court searches use large / medium / small usage classification.
// Only the four confirmed major codes are embedded. Missing detailed codes stay null.
const COURT_USAGE_CATALOG=[{"level":"large","code":"10000","name":"토지"},{"level":"medium","parentCode":"10000","code":"10100","name":"지목"},{"level":"small","parentCode":"10100","code":"10101","name":"전"},{"level":"small","parentCode":"10100","code":"10102","name":"답"},{"level":"small","parentCode":"10100","code":"10103","name":"과수원"},{"level":"small","parentCode":"10100","code":"10104","name":"목장용지"},{"level":"small","parentCode":"10100","code":"10105","name":"임야"},{"level":"small","parentCode":"10100","code":"10106","name":"광천지"},{"level":"small","parentCode":"10100","code":"10107","name":"염전"},{"level":"small","parentCode":"10100","code":"10108","name":"대지"},{"level":"small","parentCode":"10100","code":"10109","name":"공장용지"},{"level":"small","parentCode":"10100","code":"10110","name":"학교용지"},{"level":"small","parentCode":"10100","code":"10111","name":"주차장"},{"level":"small","parentCode":"10100","code":"10112","name":"주유소용지"},{"level":"small","parentCode":"10100","code":"10113","name":"창고용지"},{"level":"small","parentCode":"10100","code":"10114","name":"도로"},{"level":"small","parentCode":"10100","code":"10115","name":"철도용지"},{"level":"small","parentCode":"10100","code":"10116","name":"제방"},{"level":"small","parentCode":"10100","code":"10117","name":"하천"},{"level":"small","parentCode":"10100","code":"10118","name":"구거"},{"level":"small","parentCode":"10100","code":"10119","name":"유지"},{"level":"small","parentCode":"10100","code":"10120","name":"양어장"},{"level":"small","parentCode":"10100","code":"10121","name":"수도용지"},{"level":"small","parentCode":"10100","code":"10122","name":"공원"},{"level":"small","parentCode":"10100","code":"10123","name":"체육용지"},{"level":"small","parentCode":"10100","code":"10124","name":"유원지"},{"level":"small","parentCode":"10100","code":"10125","name":"종교용지"},{"level":"small","parentCode":"10100","code":"10126","name":"사적지"},{"level":"small","parentCode":"10100","code":"10127","name":"묘지"},{"level":"small","parentCode":"10100","code":"10128","name":"잡종지"},{"level":"large","code":"20000","name":"건물"},{"level":"medium","parentCode":"20000","code":"20100","name":"주거용건물"},{"level":"small","parentCode":"20100","code":"20101","name":"단독주택"},{"level":"small","parentCode":"20100","code":"20102","name":"다가구주택"},{"level":"small","parentCode":"20100","code":"20103","name":"다중주택"},{"level":"small","parentCode":"20100","code":"20104","name":"아파트"},{"level":"small","parentCode":"20100","code":"20105","name":"연립주택"},{"level":"small","parentCode":"20100","code":"20106","name":"다세대주택"},{"level":"small","parentCode":"20100","code":"20107","name":"기숙사"},{"level":"small","parentCode":"20100","code":"20108","name":"빌라"},{"level":"small","parentCode":"20100","code":"20109","name":"상가주택"},{"level":"small","parentCode":"20100","code":"20110","name":"오피스텔"},{"level":"small","parentCode":"20100","code":"20111","name":"주상복합"},{"level":"medium","parentCode":"20000","code":"21100","name":"상업용및업무용"},{"level":"small","parentCode":"21100","code":"21101","name":"근린생활시설"},{"level":"small","parentCode":"21100","code":"21102","name":"문화및집회시설"},{"level":"small","parentCode":"21100","code":"21103","name":"종교시설"},{"level":"small","parentCode":"21100","code":"21104","name":"판매시설"},{"level":"small","parentCode":"21100","code":"21105","name":"운수시설"},{"level":"small","parentCode":"21100","code":"21106","name":"의료시설"},{"level":"small","parentCode":"21100","code":"21107","name":"교육연구시설"},{"level":"small","parentCode":"21100","code":"21108","name":"노유자시설"},{"level":"small","parentCode":"21100","code":"21109","name":"수련시설"},{"level":"small","parentCode":"21100","code":"21110","name":"운동시설"},{"level":"small","parentCode":"21100","code":"21111","name":"업무시설"},{"level":"small","parentCode":"21100","code":"21112","name":"숙박시설"},{"level":"small","parentCode":"21100","code":"21113","name":"위락시설"},{"level":"small","parentCode":"21100","code":"21114","name":"교정및군사시설"},{"level":"small","parentCode":"21100","code":"21115","name":"방송통신시설"},{"level":"small","parentCode":"21100","code":"21116","name":"발전시설"},{"level":"small","parentCode":"21100","code":"21117","name":"묘지관련시설"},{"level":"small","parentCode":"21100","code":"21118","name":"관광휴게시설"},{"level":"medium","parentCode":"20000","code":"22100","name":"산업용및기타특수용"},{"level":"small","parentCode":"22100","code":"22101","name":"공장"},{"level":"small","parentCode":"22100","code":"22102","name":"창고시설"},{"level":"small","parentCode":"22100","code":"22103","name":"위험물저장및처리시설"},{"level":"small","parentCode":"22100","code":"22104","name":"자동차관련시설"},{"level":"small","parentCode":"22100","code":"22105","name":"동물및식물관련시설"},{"level":"small","parentCode":"22100","code":"22106","name":"분뇨및쓰레기처리시설"},{"level":"medium","parentCode":"20000","code":"23100","name":"용도복합용"},{"level":"small","parentCode":"23100","code":"23101","name":"주/상용건물"},{"level":"small","parentCode":"23100","code":"23102","name":"주/산용건물"},{"level":"small","parentCode":"23100","code":"23103","name":"기타복합용건물"},{"level":"large","code":"30000","name":"차량및운송장비"},{"level":"medium","parentCode":"30000","code":"30100","name":"차량"},{"level":"small","parentCode":"30100","code":"30101","name":"승용차"},{"level":"small","parentCode":"30100","code":"30102","name":"승합차"},{"level":"small","parentCode":"30100","code":"30103","name":"버스"},{"level":"small","parentCode":"30100","code":"30104","name":"화물차"},{"level":"small","parentCode":"30100","code":"30105","name":"기타차량"},{"level":"medium","parentCode":"30000","code":"31100","name":"중기"},{"level":"small","parentCode":"31100","code":"31101","name":"덤프트럭"},{"level":"small","parentCode":"31100","code":"31102","name":"굴삭기"},{"level":"small","parentCode":"31100","code":"31103","name":"지게차"},{"level":"small","parentCode":"31100","code":"31104","name":"기타중기"},{"level":"medium","parentCode":"30000","code":"32100","name":"선박"},{"level":"small","parentCode":"32100","code":"32101","name":"선박"},{"level":"medium","parentCode":"30000","code":"33100","name":"항공기"},{"level":"small","parentCode":"33100","code":"33101","name":"항공기"},{"level":"medium","parentCode":"30000","code":"34100","name":"이륜차"},{"level":"small","parentCode":"34100","code":"34101","name":"이륜차"},{"level":"large","code":"40000","name":"기타"},{"level":"medium","parentCode":"40000","code":"40100","name":"권리"},{"level":"small","parentCode":"40100","code":"40101","name":"어업권"},{"level":"small","parentCode":"40100","code":"40102","name":"광업권"},{"level":"small","parentCode":"40100","code":"40103","name":"농업권"},{"level":"medium","parentCode":"40000","code":"40200","name":"기타"},{"level":"small","parentCode":"40200","code":"40201","name":"기타"}];
// 98 live-confirmed classifications, 2026-11-09. Snapshot of court taxonomy, not future-proof.
// Source: courtauction.go.kr /pgj/pgj002/selectLclLst.on /selectMclLst.on /selectSclLst.on.
const COURT_USAGE_LARGE=COURT_USAGE_CATALOG.filter(x=>x.level==='large');
function usageChildren(level,parentCode){
 return COURT_USAGE_CATALOG.filter(x=>x.level===level&&x.parentCode===parentCode);
}
function usageExact(level,name,parentCode){
 const entries=COURT_USAGE_CATALOG.filter(x=>x.level===level&&x.name===name&&
  (level==='large'||x.parentCode===parentCode));
 return entries.length===1?entries[0]:null;
}
function usageCodesForNames(large,medium,small){
 const l=usageExact('large',large),m=usageExact('medium',medium,l?.code),
  x=usageExact('small',small,m?.code);
 return {large:l?.code||null,medium:m?.code||null,small:x?.code||null};
}

function availablePropertyTypes(){
 const set=new Set(['아파트','빌라','단독주택','상가','토지','기타']);
 for(const p of allProperties())if(typeof p.type==='string'&&p.type.trim())set.add(p.type);
 return ['전체',...set];
}
function validCourtUsage(v){
 if(v==null)return true;
 const validName=x=>x==null||(typeof x==='string'&&x.length<=80);
 const validCode=x=>x==null||(typeof x==='string'&&/^\d{4,15}$/.test(x));
 return v&&typeof v==='object'&&!Array.isArray(v)&&
  ['large','medium','small'].every(k=>validName(v.names?.[k])&&validCode(v.codes?.[k]));
}
function validateRealProperty(p){
 return p&&p.userRegistered===true&&typeof p.id==='string'&&p.id.startsWith('real-')&&
 typeof p.type==='string'&&p.type.trim().length>0&&p.type.length<=80&&validCourtUsage(p.courtUsage)&&
 typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=300&&
 typeof p.court==='string'&&p.court.trim().length>0&&p.court.length<=100&&
 typeof p.case==='string'&&/^\d{4}타경\d{1,10}$/.test(p.case)&&
 (p.minWon===null||(Number.isSafeInteger(p.minWon)&&p.minWon>=0))&&
 (p.valueWon===null||(Number.isSafeInteger(p.valueWon)&&p.valueWon>=0))&&
 (!p.date||/^\d{4}[.-]\d{2}[.-]\d{2}$/.test(p.date))&&
 (!p.sourceUrl||isSafeAuctionUrl(p.sourceUrl));
}
const titles={home:'부동산 경매',search:'통합검색',schedule:'경매일정',favorites:'관심물건',study:'경매 공부방',advanced:'상세검색',special:'특수물건 검색',detail:'물건 상세',rights:'권리분석',note:'공부 노트',settings:'설정',official:'법원경매 연결',capital:'수도권 자동목록',demo:'테스트용 예시 물건'};function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(window.tt);window.tt=setTimeout(()=>$('#toast').classList.remove('show'),2200)}
let saveCheckTimer=0;
function showSavedCheck(message='저장 완료'){
 let overlay=document.getElementById('saveCheckOverlay');
 if(!overlay){
  overlay=document.createElement('div');
  overlay.id='saveCheckOverlay';
  overlay.className='save-check-overlay';
  overlay.setAttribute('role','status');
  overlay.setAttribute('aria-live','polite');
  overlay.innerHTML='<div class="save-check-circle"><svg viewBox="0 0 96 96" aria-hidden="true"><path d="M23 49 41 66 75 31"/></svg></div><strong id="saveCheckLabel"></strong>';
  document.body.appendChild(overlay);
 }
 overlay.querySelector('#saveCheckLabel').textContent=message;
 clearTimeout(saveCheckTimer);
 overlay.classList.remove('visible');
 void overlay.offsetWidth;
 overlay.classList.add('visible');
 saveCheckTimer=setTimeout(()=>overlay.classList.remove('visible'),1450);
}
function backupSummary(data,attachments){
 return '관심물건 '+(data.favorites.length+(data.courtFavorites?.length||0))+'개 · 노트 '+data.notes.length+'개 · 직접 등록 사건 '+(data.realProperties?.length||0)+'개 · 첨부파일 '+attachments.length+'개 · 권리분석 '+(data.rightsDrafts?.length||0)+'건';
}
const MAIN_TABS=['home','search','schedule','favorites','study'];
let capitalPriceHistory=null,capitalSnapshot=null,capitalAttemptStatus=null,capitalLegalDiagnostic=null,capitalLoadStatus='unloaded',capitalLoadError='';
let appDepth=0;
const viewHistory=new Map();
function snapshot(){return {page:state.page,filter:state.filter,selected:state.selected,viewMonth:state.viewMonth,calendarFavoritesOnly:state.calendarFavoritesOnly,detail:state.detail,note:state.note,search:state.search,region:state.region,minPrice:state.minPrice,maxPrice:state.maxPrice,priceUnit:state.priceUnit,detailTab:state.detailTab,favoriteSort:state.favoriteSort,favoriteType:state.favoriteType,capitalRegion:state.capitalRegion,capitalType:state.capitalType,capitalQuery:state.capitalQuery,capitalLimit:state.capitalLimit,capitalReviewDate:state.capitalReviewDate,capitalReviewStage:state.capitalReviewStage,capitalFocusId:state.capitalFocusId,editRealId:state.editRealId,rightsPropertyId:state.rightsPropertyId,noteQuery:state.noteQuery,noteSort:state.noteSort,studyCategory:state.studyCategory,noteTopicDraft:state.noteTopicDraft}}
viewHistory.set(0,snapshot());
history.replaceState({auctionApp:true,depth:0,view:snapshot()},'',location.pathname+location.search);
function nav(page,extra={}){
  if(!titles[page])return;
  if(state.page==='note'&&page!=='note')persistNoteDraft();
  if(page===state.page&&Object.keys(extra).length===0)return;
  state={...state,...extra,page,...(page==='official'&&!Object.prototype.hasOwnProperty.call(extra,'editRealId')?{editRealId:null}:{})};
  appDepth++;
  viewHistory.set(appDepth,snapshot());
  history.pushState({auctionApp:true,depth:appDepth,view:snapshot()},'','#'+page);
  render();
  window.scrollTo(0,0);
}
function goBack(){
  if(state.page==='note')persistNoteDraft();
  if(document.activeElement&&document.activeElement.matches('input,textarea,select'))document.activeElement.blur();
  if(appDepth>0){history.back();return;}
  if(state.page!=='home')nav('home');
}
window.addEventListener('popstate',event=>{
  if(state.page==='note')persistNoteDraft();
  if(event.state&&event.state.auctionApp){
    appDepth=event.state.depth||0;
    state={...state,...event.state.view};
    viewHistory.set(appDepth,snapshot());
  }else{appDepth=0;state={...state,page:'home'};}
  render();window.scrollTo(0,0);
});
function initGestureNavigation(){
  const app=document.getElementById('app');
  const content=document.getElementById('content');
  const tabOrder=MAIN_TABS;
  let touch=null,preview=null,animating=false,finishTimer=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function destination(dx,initialX){
    if(tabOrder.includes(state.page)){
      if(initialX<28)return null; // iOS native edge navigation
      const i=tabOrder.indexOf(state.page)+(dx<0?1:-1);
      return i>=0&&i<tabOrder.length?tabOrder[i]:null;
    }
    if(dx>0&&initialX<68&&appDepth>0)return '__back__';
    return null;
  }
  function nextMarkup(page){
    const previous=state.page;
    state.page=page;
    try{return ({home,search,schedule,favorites,study,advanced,special,detail,rights,note,settings,official,demo})[page]();}
    finally{state.page=previous}
  }
  function previousPage(){
    const record=viewHistory.get(appDepth-1);
    if(record&&titles[record.page])return record.page;
    return ({rights:'detail',detail:'search',note:'study',settings:'home',official:'search',advanced:'search',special:'search'})[state.page]||'home';
  }
  function reset(){
    content.style.transform='';
    content.style.willChange='';
    content.style.transition='';
    if(preview){preview.remove();preview=null}
    if(finishTimer){clearTimeout(finishTimer);finishTimer=null}
    animating=false;
    touch=null;
  }
  function createPreview(target){
    const main=content.getBoundingClientRect();
    const destinationPage=target==='__back__'?previousPage():target;
    if(!titles[destinationPage])return false;
    preview=document.createElement('main');
    preview.className='swipe-preview';
    preview.setAttribute('aria-hidden','true');
    preview.style.cssText='position:absolute;z-index:2;pointer-events:none;will-change:transform;box-sizing:border-box;left:'+ (main.left+window.scrollX)+'px;top:'+(main.top+window.scrollY)+'px;width:'+main.width+'px;min-height:'+main.height+'px;';
    preview.innerHTML=nextMarkup(destinationPage);
    document.body.appendChild(preview);
    content.style.willChange='transform';
    content.style.transition='none';
    return true;
  }
  function position(dx){
    if(!preview||!touch)return;
    const width=touch.width;
    const x=Math.max(-width,Math.min(width,dx));
    content.style.transform='translate3d('+x+'px,0,0)';
    preview.style.transform='translate3d('+(x+(touch.direction<0?width:-width))+'px,0,0)';
  }
  function finish(commit,dx,velocity){
    if(!touch||animating)return;
    const active=touch;
    if(!active.locked){touch=null;return}
    if(!preview){reset();return}
    animating=true;
    const width=active.width;
    const duration=reduced?0:Math.max(160,Math.min(290,265-Math.abs(velocity)*45));
    const finalX=commit?(active.direction<0?-width:width):0;
    const ease='cubic-bezier(.22,.72,.18,1)';
    content.style.transition='transform '+duration+'ms '+ease;
    preview.style.transition='transform '+duration+'ms '+ease;
    requestAnimationFrame(()=>position(finalX));
    finishTimer=setTimeout(()=>{
      const target=active.target;
      reset();
      if(commit){
        if(target==='__back__')goBack();
        else nav(target);
      }
    },duration+28);
  }
  app.addEventListener('touchstart',event=>{
    if(animating||event.touches.length!==1){touch=null;return}
    const target=event.target;
    if(target.closest('input,textarea,select,[contenteditable="true"],.filters,.calendar,#tabs,.swipe-preview')||target.closest('[data-disable-swipe]')){touch=null;return}
    const t=event.touches[0];
    touch={x:t.clientX,y:t.clientY,time:performance.now(),lastTime:performance.now(),lastX:t.clientX,locked:false,cancelled:false,width:Math.max(content.getBoundingClientRect().width,1),direction:0,target:null};
  },{passive:true});
  app.addEventListener('touchmove',event=>{
    if(!touch||animating)return;
    if(event.touches.length!==1){reset();return}
    const t=event.touches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;
    if(!touch.locked){
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)*1.1){touch.cancelled=true;return}
      if(touch.cancelled||Math.abs(dx)<12||Math.abs(dx)<Math.abs(dy)*1.25)return;
      const target=destination(dx,touch.x);
      if(!target){touch.cancelled=true;return}
      touch.direction=dx<0?-1:1;
      touch.target=target;
      if(!createPreview(target)){touch.cancelled=true;return}
      touch.locked=true;
    }
    if(touch.locked){
      event.preventDefault();
      // Resist direction reversal rather than showing the opposite page
      const distance=Math.sign(dx)===touch.direction?dx:dx*.15;
      position(distance);
      touch.lastX=t.clientX;
      touch.lastTime=performance.now();
    }
  },{passive:false});
  app.addEventListener('touchend',event=>{
    if(!touch||event.changedTouches.length!==1)return;
    if(!touch.locked){touch=null;return}
    const t=event.changedTouches[0],dx=t.clientX-touch.x;
    const elapsed=Math.max(1,performance.now()-touch.time);
    const velocity=dx/elapsed;
    const valid=Math.sign(dx)===touch.direction;
    const commit=valid&&(Math.abs(dx)>touch.width*.28||(Math.abs(dx)>52&&Math.abs(velocity)>.52));
    finish(commit,dx,velocity);
  },{passive:true});
  app.addEventListener('touchcancel',()=>{if(touch&&touch.locked)finish(false,0,0);else touch=null},{passive:true});
  window.addEventListener('pagehide',reset);
}
function setTab(page){nav(page)}function tabs(){return ['home','search','schedule','favorites','study'].map((p,i)=>`<button type="button" class="${state.page===p?'active':''}" data-page="${p}" aria-label="${['홈','검색','일정','관심','공부방'][i]}" ${state.page===p?'aria-current="page"':''}><span class="nav-icon nav-${p}" aria-hidden="true"></span><span class="nav-label">${['홈','검색','일정','관심','공부방'][i]}</span></button>`).join('')}
function validAuctionCalendarDay(value){
 const date=String(value??'').replaceAll('.','-');
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))return null;
 const [y,m,d]=date.split('-').map(Number),utc=Date.UTC(y,m-1,d),check=new Date(utc);
 return check.getUTCFullYear()===y&&check.getUTCMonth()+1===m&&check.getUTCDate()===d?{value:date,day:utc/86400000}:null;
}
function auctionTodayKst(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function auctionDday(value,today=auctionTodayKst()){
 const sale=validAuctionCalendarDay(value),current=validAuctionCalendarDay(today);
 if(!sale||!current)return '기일 미확인';
 const days=sale.day-current.day;
 return days>0?'D-'+days:days===0?'D-day':'기일 '+Math.abs(days)+'일 경과';
}
function usablePropertyAddress(value){
 const address=String(value??'').trim();
 return address.length>5&&address.length<=260&&/^(?:서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/.test(address)&&/\d/.test(address)?address:null;
}
function auctionMapSearchLink(value){
 const address=usablePropertyAddress(value);
 return address?'https://map.kakao.com/link/search/'+encodeURIComponent(address):null;
}
function auctionMapControls(value,sourceLabel){
 const link=auctionMapSearchLink(value);
 if(!link)return '<p class="helper">정확한 소재지 주소를 확인해야 지도·로드뷰 검색을 연결할 수 있습니다.</p>';
 return '<div class="auction-map-controls"><a class="secondary" href="'+escapeHtml(link)+'" target="_blank" rel="noopener noreferrer">지도에서 주소 확인 ↗</a>'+
  '<p class="helper">카카오맵에서 위치를 확인한 뒤 로드뷰를 선택하세요. 주소 검색 결과와 실제 경매물건 위치·촬영 시점은 다를 수 있습니다. '+escapeHtml(sourceLabel)+'</p></div>';
}

function card(p){
  return `<div class="listItem auction-card" data-detail="${escapeHtml(p.id)}"><div class="thumb">⌂</div><div class="itemContent"><div class="auction-card-top"><span class="auction-type">${escapeHtml(p.type)}</span><span class="auction-demo ${p.userRegistered?'user-record':''}">${p.userRegistered?'직접 등록':'예시'}</span></div><strong>${escapeHtml(p.name)}</strong><p>${escapeHtml(p.court)} · ${escapeHtml(p.case)}</p><div class="auction-price-label">최저입찰가</div><span class="price">${knownAuctionPrice(p,propertyPrice(p))}</span><span class="auction-dday">${p.userRegistered?escapeHtml(auctionDday(p.date)):'예시 · '+escapeHtml(auctionDday(p.date))}</span><p>${p.userRegistered?'감정가 '+knownAuctionPrice(p,p.valueWon)+' · '+(p.date?'입찰 '+escapeHtml(p.date):'기일 미입력'):'감정가 '+escapeHtml(p.value)+' · '+escapeHtml(p.flag)}</p></div><span class="arrow">›</span></div>`;
}

const QUICK_MENU_KEY='auction_quick_menu_v1';
const QUICK_MENU_ITEMS=[
 {id:'official',name:'법원검색',page:'official',icon:'court'},
 {id:'capital',name:'수도권 자동등록',page:'capital',icon:'capital'},
 {id:'address',name:'주소검색',page:'search',mode:'address',icon:'address'},
 {id:'case',name:'사건번호',page:'search',mode:'case',icon:'case'},
 {id:'study',name:'공부방',page:'study',icon:'study'},
 {id:'schedule',name:'경매일정',page:'schedule',glyph:'▦'},
 {id:'favorites',name:'관심물건',page:'favorites',glyph:'♡'},
 {id:'advanced',name:'상세검색',page:'advanced',glyph:'⌕'},
 {id:'special',name:'특수물건',page:'special',glyph:'◇'}
];
const DEFAULT_QUICK_IDS=QUICK_MENU_ITEMS.slice(0,5).map(x=>x.id);
function readQuickMenu(){
 try{
  const stored=JSON.parse(localStorage.getItem(QUICK_MENU_KEY));
  if(!Array.isArray(stored)||new Set(stored).size!==stored.length||
    stored.some(id=>!QUICK_MENU_ITEMS.some(item=>item.id===id)))return DEFAULT_QUICK_IDS.slice();
  return stored.slice();
 }catch{return DEFAULT_QUICK_IDS.slice();}
}
let quickMenuIds=readQuickMenu(),quickMenuEditing=false;
function persistQuickMenu(next){
 const encoded=JSON.stringify(next);
 localStorage.setItem(QUICK_MENU_KEY,encoded);
 if(localStorage.getItem(QUICK_MENU_KEY)!==encoded)throw Error('빠른 메뉴 저장 확인 실패');
 quickMenuIds=next;
}
function quickMenuMarkup(){
 const active=QUICK_MENU_ITEMS.filter(x=>quickMenuIds.includes(x.id))
  .sort((a,b)=>quickMenuIds.indexOf(a.id)-quickMenuIds.indexOf(b.id));
 const button=x=>'<button class="quick" type="button" data-page="'+x.page+'"'+
  (x.mode?' data-search-mode="'+x.mode+'"':'')+'>'+
  (x.icon?'<span class="quick-icon quick-'+x.icon+'" aria-hidden="true"></span>':
   '<span class="quick-extra-icon" aria-hidden="true">'+x.glyph+'</span>')+
  '<span class="quick-label">'+escapeHtml(x.name)+'</span></button>';
 const editorItems=[...QUICK_MENU_ITEMS.filter(x=>quickMenuIds.includes(x.id)).sort((a,b)=>quickMenuIds.indexOf(a.id)-quickMenuIds.indexOf(b.id)),...QUICK_MENU_ITEMS.filter(x=>!quickMenuIds.includes(x.id))];
 const editor=editorItems.map(x=>{
  const enabled=quickMenuIds.includes(x.id),at=quickMenuIds.indexOf(x.id);
  return '<div class="quick-edit-row" data-quick-row="'+x.id+'">'+
   (enabled?'<button type="button" class="quick-drag-handle" data-quick-drag="'+x.id+'" aria-label="'+escapeHtml(x.name)+' 길게 눌러 순서 이동">↕</button>':'')+
   '<strong>'+escapeHtml(x.name)+'</strong>'+
   '<button type="button" data-quick-toggle="'+x.id+'">'+(enabled?'숨기기':'추가')+'</button>'+
   (enabled?'<button type="button" data-quick-move="'+x.id+'" data-step="-1" '+(at===0?'disabled':'')+' aria-label="'+escapeHtml(x.name)+' 위로 이동">↑</button>'+
   '<button type="button" data-quick-move="'+x.id+'" data-step="1" '+(at===quickMenuIds.length-1?'disabled':'')+' aria-label="'+escapeHtml(x.name)+' 아래로 이동">↓</button>':'')+
   '</div>';
 }).join('');
 return '<div class="section quick-section"><h2>빠른 메뉴</h2><button type="button" class="quick-edit-trigger" id="quickEditToggle">'+
  (quickMenuEditing?'완료':'편집')+'</button></div>'+
  (active.length?'<div class="grid quick-grid">'+active.map(button).join('')+'</div>':
   '<div class="card"><p class="helper">빠른 메뉴가 비어 있어요. 편집에서 메뉴를 추가할 수 있습니다.</p></div>')+
  (quickMenuEditing?'<div class="card quick-editor"><strong>메뉴 추가·숨김·순서 변경</strong><p class="helper">숨겨도 실제 기능은 삭제되지 않습니다.</p>'+
   editor+'<button type="button" class="secondary full-secondary" id="quickReset">기본 메뉴로 복원</button></div>':'');
}
let verificationPlan=null,verificationPlanStatus='unloaded';
async function loadVerificationPlan(){
 if(verificationPlanStatus!=='unloaded')return;
 verificationPlanStatus='loading';
 try{
  const response=await fetch('./data/court-verification-plan.json',{cache:'no-store'});
  if(!response.ok)throw Error('검증 일정표 파일을 읽지 못했습니다.');
  const payload=await response.json();
  if(payload?.schemaVersion!==1||payload.kind!=='schedule_only'||
   payload.partialCoverage!==true||payload.legalStatusVerified!==false||
   payload.automaticCourtRequests!==0||!Array.isArray(payload.days)||
   payload.days.length>15||!Number.isSafeInteger(payload.snapshotItems)||
   !Number.isFinite(Date.parse(payload.sourceSnapshotAt))||
   payload.days.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||
    ['precheck','sale_day','result_check','result_recheck','final_followup'].some(k=>
      !Array.isArray(d[k])||d[k].length>payload.snapshotItems||d[k].some(id=>typeof id!=='string'||!/^court-B\d{6}\|20\d{2}타경\d+\|[1-9]\d{0,3}$/.test(id)))))
   throw Error('검증 일정표 형식이 올바르지 않습니다.');
  verificationPlan=payload;verificationPlanStatus='ready';
 }catch{verificationPlan=null;verificationPlanStatus='failed';}
 if(state.page==='schedule')render();
}
function verificationPlanMarkup(day){
 const stages=[['precheck','입찰 전 확인'],['sale_day','입찰 당일 점검'],['result_check','결과조회 예정'],['result_recheck','재검사 예정'],['final_followup','최종 추적']];
 if(verificationPlanStatus==='unloaded'||verificationPlanStatus==='loading')
  return '<div class="card"><strong>법원 수집물건 검증 예정</strong><p class="helper">검증 일정표를 불러오는 중…</p></div>';
 if(verificationPlanStatus!=='ready')
  return '<div class="card"><strong>법원 수집물건 검증 예정</strong><p class="helper">일정표를 확인할 수 없습니다. 법원 원문을 확인하세요.</p></div>';
 const report=verificationPlan.days.find(d=>d.date===day);
 const stale=Date.now()-Date.parse(verificationPlan.sourceSnapshotAt)>30*3600000;
 return '<div class="card court-plan"><strong>법원 수집물건 검증 예정</strong>'+
  '<p class="helper">수집본 '+escapeHtml(verificationPlan.snapshotItems)+'건 기준 · 일부 페이지만 수집 · '+escapeHtml(verificationPlan.generatedForDay)+' 생성'+
  (stale?' · 수집본 30시간 경과':'')+'</p>'+
  (report?stages.map(([key,label])=>'<div class="court-plan-row"><span>'+label+'</span><button type="button" class="court-plan-open" data-plan-stage="'+key+'" data-plan-date="'+day+'" '+(!report[key].length?'disabled':'')+' aria-label="'+label+' '+report[key].length+'건 대상 보기">'+report[key].length+'건 ›</button></div>').join(''):
    '<p class="helper">선택한 날짜는 현재 생성된 8일 일정 범위 밖입니다.</p>')+
  '<p class="helper">표시된 수치는 재조회 예정 건수이며 실제 법원 조회·낙찰·유찰·취하 확인 결과가 아닙니다. 입찰 전 법원 원문을 확인하세요.</p></div>';
}

function home(){return `<section class="hero dashboard"><div class="dash-heading"><div><p class="dash-kicker">MY AUCTION · 나의 경매 현황</p><h2>오늘도 좋은 물건을<br>차근차근 찾아봐요.</h2></div><span class="dash-mark" aria-hidden="true">⌂</span></div><div class="dash-stats"><button type="button" class="dash-stat" data-page="favorites"><span class="dash-stat-label"><span class="dashboard-heart">♥</span> 관심물건</span><strong>${saved.favorites.length}<small>건</small></strong></button><button type="button" class="dash-stat" data-page="study"><span class="dash-stat-label">▤ 공부 노트</span><strong>${saved.notes.length}<small>개</small></strong></button></div><p class="dash-disclaimer">직접 등록한 사건은 법원 원문을 다시 확인해 주세요. 자동 실시간 연동은 아직 지원되지 않아요.</p></section><form id="homeSearchForm" class="search-form" role="search"><input id="homeSearch" class="search" type="search" enterkeyhint="search" autocomplete="off" placeholder="지역, 주소, 사건번호로 검색" value="${escapeHtml(state.search)}"><button type="submit" class="search-submit">검색</button></form>${quickMenuMarkup()}<div class="section"><h2>${registeredProperties().length?'내가 등록한 경매물건':'내가 등록한 경매물건'}</h2><span class="muted">${registeredProperties().length?'법원 확인 필요':'등록 0건'}</span></div>${registeredProperties().length?registeredProperties().slice(-2).reverse().map(card).join(''):'<div class="empty">직접 등록한 경매물건이 없어요. 법원 수집목록을 확인하거나 물건을 등록해 주세요.</div>'}<div class="section"><h2>다가오는 입찰일</h2></div><div class="card line"><div><strong>${nextRegisteredAuction()?escapeHtml(nextRegisteredAuction().date):'직접 등록한 예정 일정 없음'}</strong><p class="tiny">${nextRegisteredAuction()?escapeHtml(nextRegisteredAuction().case)+' · 사용자 입력, 법원 확인 필요':'경매물건 등록 시 입찰일정에 표시돼요.'}</p></div><button class="miniButton" data-page="schedule">일정 보기 ›</button></div>`}function matchingProperties(){
  const query=state.search.trim().normalize('NFC').toLocaleLowerCase('ko');
  const min=state.minPrice===''?null:Number(state.minPrice);
  const max=state.maxPrice===''?null:Number(state.maxPrice);
  return registeredProperties().filter(p=>{
    const matchesText=!query||[p.name,p.case,p.court,p.type].some(v=>v.normalize('NFC').toLocaleLowerCase('ko').includes(query));
    const matchesType=state.filter==='전체'||p.type===state.filter;
    const matchesRegion=state.region==='전체'||p.name.startsWith(state.region);
    const price=propertyPrice(p);
    return matchesText&&matchesType&&matchesRegion&&(min===null||(price!==null&&price>=min))&&(max===null||(price!==null&&price<=max));
  });
}
function courtResultDiagnosticWarning(){
 const attempted=Date.parse(capitalLegalDiagnostic?.attemptedAt||'');
 const captured=Date.parse(capitalSnapshot?.fetchedAt||'');
 if(!Number.isFinite(attempted))return '<div class="status">⚠ 자동 결과검증 기록이 없습니다. 매각·취하·기일변경은 법원 원문 확인이 필요합니다.</div>';
 if(capitalLegalDiagnostic?.probeExecutionSucceeded!==true)return '<div class="status">⚠ 최근 자동 결과조회가 성공하지 못했습니다. 법적 진행상태는 확인되지 않았습니다.</div>';
 if((Number.isFinite(captured)&&attempted<captured)||Date.now()-attempted>30*3600000)
  return '<div class="status">⚠ 자동 결과검증 기록이 최신 수집보다 오래됐거나 30시간 이상 경과했습니다. 최신 매각·취하·기일변경 상태는 미확인입니다.</div>';
 return '';
}
function search(){
  const rows=matchingProperties();
  const query=state.search.trim().normalize('NFC').toLocaleLowerCase('ko');
  // Keep independently sourced records separate: the court snapshot is partial and not live.
  const courtMatches=query&&capitalSnapshot?.validation?.passed===true
   ?capitalSnapshot.items.filter(x=>(state.region==='전체'||!['서울','경기','인천'].includes(state.region)||x.region===state.region)&&
     [x.address,x.caseNo,x.courtName,x.itemNo,...(Array.isArray(x.components)?x.components.map(c=>c.address):[])].some(v=>String(v||'').normalize('NFC').toLocaleLowerCase('ko').includes(query)))
   :[];
  const courtPreview=query
   ?'<div class="section"><h2>법원 수집목록 <span class="result-count">'+courtMatches.length+'건</span></h2><span class="muted">서울·경기·인천 부분수집본 · 법원 실시간 전체 검색 아님</span></div>'+
     '<p class="helper">수집 시각: '+(capitalSnapshot?.fetchedAt&&Number.isFinite(Date.parse(capitalSnapshot.fetchedAt))?escapeHtml(new Date(capitalSnapshot.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})):'미확인')+' · <strong>진행상태 미검증</strong> (매각·취하·기일변경은 법원 원문 확인)</p>'+
     courtResultDiagnosticWarning()+
     (capitalSnapshot?.fetchedAt&&Date.now()-Date.parse(capitalSnapshot.fetchedAt)>30*3600000?'<div class="status">⚠ 수집 후 30시간 이상 경과 · 실제 상태 확인 필요</div>':'')+
     (capitalLoadStatus==='loading'||capitalLoadStatus==='unloaded'?'<div class="empty">검증된 법원 수집목록을 불러오는 중…</div>':
      capitalLoadStatus==='failed'?'<div class="status">⚠ 법원 수집목록을 불러오지 못했습니다. 법원 원문에서 확인해 주세요.</div>':
      (capitalLoadError?'<div class="status">⚠ 최신 목록 갱신에 실패해 이전 검증 자료를 표시합니다.</div>':'')+
      (courtMatches.length?courtMatches.slice(0,5).map(x=>'<details class="court-search-item"><summary><span class="court-search-address">'+escapeHtml(x.address)+'</span><span class="court-search-meta">'+escapeHtml(x.courtName||'법원 미확인')+' · '+escapeHtml(x.caseNo)+' · '+escapeHtml(String(x.itemNo||'?'))+'번 · 진행상태 미확인</span></summary><div class="court-search-expanded"><div><span>감정평가액</span><strong>'+escapeHtml(Number.isSafeInteger(x.appraisalWon)&&x.appraisalWon>0?prettyPrice(x.appraisalWon):'미확인')+'</strong></div><div><span>최저매각가</span><strong>'+escapeHtml(Number.isSafeInteger(x.minimumWon)&&x.minimumWon>0?prettyPrice(x.minimumWon):'미확인')+'</strong></div><div><span>매각기일</span><strong>'+escapeHtml(x.saleDate||'미확인')+'</strong></div><p>법원 부분수집본 · 실제 진행상태 및 기일은 법원 원문에서 반드시 확인하세요.</p></div></details>').join('')+
       (courtMatches.length>5?'<p class="helper">처음 5건만 미리 표시합니다. 전체 결과는 아래 버튼에서 확인하세요.</p>':''):'<div class="empty">현재 검증된 부분수집본에서 일치하는 물건이 없습니다. 법원 전체에 물건이 없다는 뜻은 아닙니다.</div>'))
   :'';
  const tags=[state.region!=='전체'?state.region:null,state.minPrice!==''?prettyPrice(state.minPrice)+' 이상':null,state.maxPrice!==''?prettyPrice(state.maxPrice)+' 이하':null].filter(Boolean);
  return `<div class="card"><label class="label" for="query">물건 찾아보기</label><form class="search-form" id="searchForm" role="search"><input class="search" id="query" type="search" enterkeyhint="search" autocomplete="off" placeholder="${state.searchMode==='case'?'예: 2025타경12345':state.searchMode==='address'?'도로명주소 또는 지번주소':'지역, 건물명, 사건번호'}" value="${escapeHtml(state.search)}"><button type="submit" class="search-submit">검색</button></form><div class="filters">${availablePropertyTypes().map(v=>`<button class="chip ${state.filter===v?'active':''}" data-filter="${v}">${v}</button>`).join('')}</div><div class="row search-action-row"><button type="button" class="secondary search-action-button" id="detailFilters"><span class="search-action-icon search-action-detail" aria-hidden="true"></span><span>상세검색</span></button><button type="button" class="secondary search-action-button" id="specialFilters"><span class="search-action-icon search-action-special" aria-hidden="true"></span><span>특수물건</span></button></div>${tags.length?`<div class="applied-filters">${tags.map(x=>`<span class="pill">${escapeHtml(x)}</span>`).join('')}<button class="clear-filter" id="clearFilters">초기화</button></div>`:''}</div><div class="section"><h2>직접 등록한 물건 <span class="result-count">${rows.length}건</span></h2><span class="muted">기기에 저장된 사용자 등록 기록</span></div><button type="button" class="secondary full-secondary" id="searchCourtResults">⌕ 같은 검색어로 수도권 법원 수집목록 찾기</button><p class="helper search-court-note">검색어·수도권 지역만 전달합니다. 물건 종류·가격 조건은 별도로 다시 선택하세요. 법원 부분수집본이며 전체 사건을 검색한 결과가 아닙니다.</p><button type="button" class="secondary full-secondary" data-page="official">⚖ 대한민국 법원경매정보에서 찾기 · 등록</button><div id="searchResults">${rows.map(card).join('')||'<div class="empty">조건에 맞는 직접 등록 물건이 없어요.</div>'}</div>${courtPreview}`;
}
function demo(){
 return '<div class="card demo-catalog"><strong>개발 테스트용 예시 물건</strong><p class="helper">아래 3건은 모두 가상 사건번호·가격·입찰기일을 사용합니다. 실제 경매 검색이나 입찰에 이용하면 안 됩니다.</p></div>'+
 properties.map(card).join('');
}
function advanced(){
  const unit=state.priceUnit||'원';
  return `<div class="card search-panel"><div class="search-intro"><strong>원하는 물건을 골라보세요</strong><p>조건을 선택하면 직접 등록한 물건에서 검색해요.</p></div>
  <label class="label" for="advRegion">지역</label><select class="select" id="advRegion">${['전체','서울','경기','인천','부산','대구'].map(v=>`<option ${state.region===v?'selected':''} value="${v}">${v==='전체'?'전국':v}</option>`).join('')}</select>
  <label class="label" for="advType">물건 종류</label><select class="select" id="advType">${availablePropertyTypes().map(v=>`<option ${state.filter===v?'selected':''} value="${v}">${v==='전체'?'전체 물건':v}</option>`).join('')}</select>
  <div class="line price-unit-line"><label class="label">최저입찰가</label><label class="label unit-picker-label" for="advPriceUnit">입력 단위 <select class="select unit-picker" id="advPriceUnit">${['원','만원','억원'].map(v=>`<option value="${v}" ${unit===v?'selected':''}>${v}</option>`).join('')}</select></label></div>
  <div class="row price-range"><div class="price-field"><input id="advMin" class="search" type="text" inputmode="decimal" autocomplete="off" placeholder="최소 금액" value="${escapeHtml(state.minPrice!==''?prettyPrice(state.minPrice):'')}" data-won="${escapeHtml(state.minPrice)}" data-displayed="1"></div><div class="price-field"><input id="advMax" class="search" type="text" inputmode="decimal" autocomplete="off" placeholder="최대 금액" value="${escapeHtml(state.maxPrice!==''?prettyPrice(state.maxPrice):'')}" data-won="${escapeHtml(state.maxPrice)}" data-displayed="1"></div></div>
  <div class="price-help">예: 2000000000원 = 20억원 · 원/만원/억원 중 선택</div>
  <label class="label" for="advCase">사건번호·주소·건물명</label><input class="search" id="advCase" placeholder="예: 2026타경12345" value="${escapeHtml(state.search)}"><button class="primary" id="applyAdvanced">이 조건으로 검색하기</button><button class="secondary full-secondary" id="resetAdvanced">검색 조건 초기화</button></div><p class="helper">법원 실시간 경매자료는 아직 연동되지 않았으며, 검색 조건은 직접 등록한 물건에 적용돼요. 수도권 법원 수집목록은 별도입니다.</p>`;
}
function special(){
  const labels=['임차인 우선권','유치권','법정지상권','대지권 미등기','지분매각','위반건축물','선순위 가등기','맹지'];
  return `<div class="card search-panel"><div class="search-intro"><strong>특수물건 검색</strong><p>경매에서 주의가 필요한 법률 조건들이에요.</p></div><div class="special-grid">${labels.map((v,i)=>`<div class="special-tile"><span>${['♙','⚖','⌂','▧','◈','⚠','▤','⌖'][i]}</span><strong>${v}</strong><small>자료 연동 전</small></div>`).join('')}</div><div class="status">⚠ 실제 권리정보가 연결되지 않아 특수물건 필터는 아직 작동하지 않아요.</div><button class="secondary full-secondary" id="specialBack">기본검색으로 돌아가기</button></div>`;
}
function calendarMonthKey(date){
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
}
function shiftMonth(key,delta){
  const [year,month]=key.split('-').map(Number);
  return calendarMonthKey(new Date(year,month-1+delta,1));
}

function courtFavoriteCalendarItems(date){
 const parsed=validAuctionCalendarDay(date);
 if(!parsed)return [];
 return courtFavorites().filter(x=>x.saleDate===parsed.value);
}
function courtFavoriteCalendarMarkup(items){
 if(!items.length)return '';
 return '<div class="court-calendar-group"><strong><span class="court-calendar-tag">법원 수집 · 저장 당시 기일</span> 관심물건 '+items.length+'건</strong>'+
  '<p class="helper court-calendar-caution">기일 변경·취하·낙찰 미확인 · 입찰 전 법원 원문 확인</p>'+
  items.map(x=>'<article class="court-calendar-entry"><strong>'+escapeHtml(x.address)+'</strong>'+
   '<p class="helper">'+escapeHtml(x.courtName)+' · '+escapeHtml(x.caseNo)+' · 물건 '+escapeHtml(x.itemNo)+'번</p>'+
   '<p class="helper">저장 당시 최저가 '+escapeHtml(Number.isSafeInteger(x.minimumWon)?prettyPrice(x.minimumWon):'미확인')+'</p>'+
   '<button type="button" class="secondary" data-court-favorite-open="'+escapeHtml(x.id)+'">수집목록에서 사건 찾기</button></article>').join('')+
  '</div>';
}

function calendarItems(date){
  return registeredProperties().filter(p=>propertyDate(p)===date
    &&(!state.calendarFavoritesOnly||saved.favorites.includes(p.id)));
}
function schedule(){
  const parts=state.viewMonth.split('-').map(Number),year=parts[0],month=parts[1];
  const first=new Date(year,month-1,1),offset=first.getDay();
  const daysInMonth=new Date(year,month,0).getDate();
  const todayDate=new Date(),today=todayDate.getFullYear()+'-'+String(todayDate.getMonth()+1).padStart(2,'0')+'-'+String(todayDate.getDate()).padStart(2,'0');
  const label=year+'년 '+month+'월';
  const week=['일','월','화','수','목','금','토'];
  const dates=Array.from({length:daysInMonth},(_,i)=>{
    const day=i+1,date=state.viewMonth+'-'+String(day).padStart(2,'0');
    const registeredCount=registeredProperties().filter(p=>propertyDate(p)===date).length;
    const courtCount=courtFavoriteCalendarItems(date).length;
    const personalFavCount=registeredProperties().filter(p=>propertyDate(p)===date&&saved.favorites.includes(p.id)).length;
    const ordinaryCount=state.calendarFavoritesOnly?personalFavCount:registeredCount;
    const visible=ordinaryCount+courtCount;
    const nonFavoriteCount=registeredCount-personalFavCount;
    const showBlue=!state.calendarFavoritesOnly&&nonFavoriteCount>0;
    const showPink=personalFavCount>0;
    const showPurple=courtCount>0;
    const bars=visible?'<span class="calendar-bars" aria-hidden="true">'+
      (showBlue?'<span class="calendar-bar calendar-bar-registered"></span>':'')+
      (showPink?'<span class="calendar-bar calendar-bar-personal"></span>':'')+
      (showPurple?'<span class="calendar-bar calendar-bar-court"></span>':'')+'</span>':'';
    return `<button type="button" class="day calendar-day ${state.selected===date?'selected':''} ${date===today?'today':''}" data-day="${date}" aria-label="${month}월 ${day}일, 일정 ${visible}건${courtCount?', 법원 수집 관심 '+courtCount+'건 (저장 당시 기일)':''}"><span class="calendar-date-number">${day}</span>${bars}</button>`;
  });
  const chosen=state.selected;
  const items=calendarItems(chosen);
  const courtItems=courtFavoriteCalendarItems(chosen);
  const actualCount=registeredProperties().filter(p=>propertyDate(p)===chosen).length+courtItems.length;
  return `<div class="card calendar-shell"><div class="calendar-toolbar"><button type="button" class="calendar-arrow" id="prevMonth" aria-label="이전 달">‹</button><strong>${label}</strong><button type="button" class="calendar-arrow" id="nextMonth" aria-label="다음 달">›</button><button type="button" class="calendar-today" id="todayMonth">오늘</button></div><div class="calendar-caption"><span>━ 직접 등록</span><span class="favorite-key">━ 개인 관심</span><span class="court-key">━ 법원 수집 관심</span></div><div class="calendar">${week.map((d,i)=>`<div class="weekday ${i===0?'sun':''}">${d}</div>`).join('')}${Array(offset).fill('<div class="calendar-blank"></div>').join('')}${dates.join('')}</div><div class="calendar-filter"><label><input type="checkbox" id="favCalendarOnly" ${state.calendarFavoritesOnly?'checked':''}> 관심물건 일정만 표시</label><span>기일 변경 자동 알림 없음</span></div></div><div class="section"><h2>${Number(chosen.slice(5,7))}월 ${Number(chosen.slice(-2))}일 일정</h2><span class="muted">${items.length+courtItems.length}건${courtItems.length?' · 법원 수집 '+courtItems.length+'건 (저장 당시)':''}</span></div>${items.map(card).join('')}${courtFavoriteCalendarMarkup(courtItems)}${!items.length&&!courtItems.length?(state.calendarFavoritesOnly&&actualCount?'<div class="empty">선택한 날짜에 관심물건 일정이 없어요.</div>':'<div class="empty">선택한 날짜에 기록된 입찰일정이 없어요.</div>'):''}${!courtItems.length?'<p class="helper">직접 등록 일정과 법원 수집 일정은 출처가 다릅니다. 입찰 전 법원 원문을 확인하세요.</p>':''}${verificationPlanMarkup(chosen)}`;
}

const COURT_FAVORITES_LIMIT=200;
function validCourtFavorite(x){
 return x&&typeof x==='object'&&
 typeof x.id==='string'&&/^court-B\d{6}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(x.id)&&
 typeof x.courtCode==='string'&&/^B\d{6}$/.test(x.courtCode)&&
 typeof x.caseNo==='string'&&/^20\d{2}타경\d{1,10}$/.test(x.caseNo)&&
 typeof x.itemNo==='string'&&/^[1-9]\d{0,3}$/.test(x.itemNo)&&
 x.id==='court-'+x.courtCode+'|'+x.caseNo+'|'+x.itemNo&&
 ['서울','경기','인천'].includes(x.region)&&
 typeof x.address==='string'&&x.address.length>3&&x.address.length<=260&&
 typeof x.courtName==='string'&&x.courtName.length<=80&&
 (x.saleDate===null||validAuctionCalendarDay(x.saleDate)!==null)&&
 [x.appraisalWon,x.minimumWon].every(v=>v===null||Number.isSafeInteger(v)&&v>0&&v<=999999999999999)&&
 typeof x.savedAt==='string'&&Number.isFinite(Date.parse(x.savedAt));
}
function courtFavorites(){
 return Array.isArray(saved.courtFavorites)?saved.courtFavorites.filter(validCourtFavorite):[];
}
function courtFavoriteFromLot(item){
 return {id:item.id,courtCode:item.courtCode,caseNo:item.caseNo,itemNo:item.itemNo,region:item.region,
  address:item.address,courtName:item.courtName||'',saleDate:item.saleDate||null,
  appraisalWon:item.appraisalWon??null,minimumWon:item.minimumWon??null,savedAt:new Date().toISOString()};
}
function setCourtFavorite(item,enable){
 const old=Array.isArray(saved.courtFavorites)?saved.courtFavorites:[],previous=saved.courtFavorites;
 const next=enable?[...old.filter(x=>x.id!==item.id),courtFavoriteFromLot(item)]:
  old.filter(x=>x.id!==item.id);
 if(next.length>COURT_FAVORITES_LIMIT)throw Error('관심물건 최대 200건');
 if(next.some(x=>!validCourtFavorite(x)))throw Error('관심물건 자료 오류');
 saved.courtFavorites=next;
 try{write();}catch(error){if(previous===undefined)delete saved.courtFavorites;else saved.courtFavorites=previous;throw error;}
}
function courtFavoriteCards(){
 let entries=courtFavorites();
 if(state.favoriteType!=='전체')entries=entries.filter(x=>x.region===state.favoriteType||state.favoriteType==='법원 수집');
 if(state.favoriteSort==='date')entries.sort((a,b)=>(a.saleDate||'9999').localeCompare(b.saleDate||'9999'));
 else if(state.favoriteSort==='price')entries.sort((a,b)=>(a.minimumWon??Number.MAX_SAFE_INTEGER)-(b.minimumWon??Number.MAX_SAFE_INTEGER));
 else entries.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
 return entries.map(x=>'<article class="favorite-item court-favorite-item">'+
  '<button class="favorite-open" type="button" data-court-favorite-open="'+escapeHtml(x.id)+'">'+
  '<span class="favorite-icon">⌂</span><span class="favorite-info">'+
  '<span class="auction-card-top"><span class="auction-type">'+escapeHtml(x.region)+'</span><span class="auction-demo user-record">법원 수집 · 저장 당시</span></span>'+
  '<strong>'+escapeHtml(x.address)+'</strong><span class="favorite-case">'+escapeHtml(x.courtName)+' · '+escapeHtml(x.caseNo)+' · 물건 '+escapeHtml(x.itemNo)+'번</span>'+
  '<span class="favorite-amount">'+escapeHtml(Number.isSafeInteger(x.minimumWon)?prettyPrice(x.minimumWon):'최저가 미확인')+'</span>'+
  '<span class="favorite-date">저장 당시 입찰기일: '+escapeHtml(x.saleDate||'미확인')+'</span>'+
  '</span><span class="arrow">›</span></button>'+
  '<div class="favorite-actions"><button type="button" data-court-favorite-date="'+escapeHtml(x.id)+'">일정 보기</button><button type="button" data-court-favorite-open="'+escapeHtml(x.id)+'">해당 사건 찾기</button>'+
  '<button type="button" class="favorite-remove" data-court-favorite-remove="'+escapeHtml(x.id)+'"><span class="favorite-heart">♥</span> 관심 해제</button></div>'+
  '</article>').join('');
}

function sortedFavorites(){
  const selected=new Set(saved.favorites);
  const list=allProperties().filter(p=>selected.has(p.id));
  if(state.favoriteType!=='전체')list.splice(0,list.length,...list.filter(p=>p.type===state.favoriteType));
  if(state.favoriteSort==='date')list.sort((a,b)=>a.date.localeCompare(b.date));
  else if(state.favoriteSort==='price')list.sort((a,b)=>(propertyPrice(a)??Number.MAX_SAFE_INTEGER)-(propertyPrice(b)??Number.MAX_SAFE_INTEGER));
  else list.sort((a,b)=>saved.favorites.indexOf(b.id)-saved.favorites.indexOf(a.id));
  return list;
}
function favorites(){
  const list=sortedFavorites();
  const courtCount=courtFavorites().length;
  const all=allProperties().filter(p=>saved.favorites.includes(p.id)).length+courtCount;
  const filters=[...availablePropertyTypes(),'법원 수집'];
  const controls=`<div class="favorites-toolbar"><div class="favorites-title"><h2>내 관심물건 <span>${all}건</span></h2><p>저장한 물건을 날짜와 가격순으로 정리해요.</p></div><label for="favoriteSort" class="favorite-sort-label">정렬 <select class="select favorite-sort" id="favoriteSort"><option value="recent" ${state.favoriteSort==='recent'?'selected':''}>최근 저장순</option><option value="date" ${state.favoriteSort==='date'?'selected':''}>입찰일 빠른순</option><option value="price" ${state.favoriteSort==='price'?'selected':''}>최저가 낮은순</option></select></label></div><div class="filters favorite-type-filters">${filters.map(v=>`<button class="chip ${state.favoriteType===v?'active':''}" type="button" data-favorite-type="${v}">${v}</button>`).join('')}</div>`;
  if(!all)return `${controls}<div class="empty favorites-empty"><div class="empty-symbol">♡</div><strong>아직 저장한 관심물건이 없어요.</strong><p>검색한 물건을 열고 ♡ 관심물건 저장을 눌러주세요.</p><button type="button" class="secondary" data-page="search">물건 찾아보기</button></div>`;
  return `${controls}${courtCount?'<p class="helper court-favorite-info">법원 수집 관심물건 '+courtCount+'건 · 저장 당시의 정보이며 현재 가격·기일·진행상태는 법원 원문에서 다시 확인해야 합니다.</p>':''}${courtFavoriteCards()}${list.map(p=>`<article class="favorite-item"><button class="favorite-open" type="button" data-detail="${p.id}" aria-label="${escapeHtml(p.name)} 상세보기"><span class="favorite-icon">⌂</span><span class="favorite-info"><span class="auction-card-top"><span class="auction-type">${escapeHtml(p.type)}</span><span class="auction-demo ${p.userRegistered?'user-record':''}">${p.userRegistered?'직접 등록':'예시 물건'}</span></span><strong>${escapeHtml(p.name)}</strong><span class="favorite-case">${escapeHtml(p.case)}</span><span class="favorite-amount">${knownAuctionPrice(p,propertyPrice(p))}</span><span class="favorite-date">${p.userRegistered?'사용자 입력 입찰일':'입찰 예정일(예시)'} · ${escapeHtml(p.date||'미정')}</span></span><span class="arrow">›</span></button><div class="favorite-actions"><button type="button" data-favorite-date="${p.id}">일정 보기</button><button type="button" class="favorite-remove" data-remove-favorite="${p.id}"><span class="favorite-heart" aria-hidden="true">♥</span> 관심 해제</button></div></article>`).join('')||'<div class="empty">선택한 종류에 저장된 물건이 없어요.</div>'}<p class="helper favorites-help">예시 물건은 가상 정보입니다. 직접 등록한 사건의 가격과 입찰일은 법원 원문으로 다시 확인하세요.</p>`;
}

function auctionFold(title,html,extraClass=''){
 return '<details class="auction-fold '+extraClass+'"><summary>'+escapeHtml(title)+'</summary><div class="auction-fold-body">'+html+'</div></details>';
}
function auctionBidDepositWon(bidManwon,ratePercent){
 const text=String(bidManwon??'').trim();
 if(!/^[1-9]\d{0,8}$/.test(text)||![10,20].includes(Number(ratePercent)))return null;
 const won=Number(text)*10000;
 const result=won*Number(ratePercent)/100;
 return Number.isSafeInteger(result)&&result>0?result:null;
}

function auctionPriceAnalysis(appraisalWon,minimumWon,source){
 const valid=v=>Number.isSafeInteger(v)&&v>0&&v<=999999999999999;
 if(!valid(appraisalWon)||!valid(minimumWon))
  return '<div class="auction-price-analysis"><strong>감정가 대비 가격 분석</strong><p class="helper">가격 자료가 충분하지 않아 비율과 차액을 계산하지 않습니다.</p></div>';
 const ratio=Math.round(minimumWon/appraisalWon*10000)/100;
 const gap=Math.abs(appraisalWon-minimumWon);
 return '<div class="auction-price-analysis"><strong>감정가 대비 가격 분석</strong>'+
  '<div class="line"><span class="muted">감정가 대비 최저가</span><strong>'+escapeHtml(ratio.toLocaleString('ko-KR',{maximumFractionDigits:2}))+'%</strong></div>'+
  '<div class="line"><span class="muted">가격 차액</span><strong>'+escapeHtml(prettyPrice(gap))+' '+(minimumWon>appraisalWon?'높음':minimumWon===appraisalWon?'동일':'낮음')+'</strong></div>'+
  '<p class="helper">'+escapeHtml(source)+' · 감정가와 최저가의 산술 비교입니다. 시세 할인율·유찰 횟수·입찰 적정가를 의미하지 않습니다.</p></div>';
}
function auctionBidCompare(bidManwon,minWon){
 const text=String(bidManwon??'').trim();
 if(!/^[1-9]\d{0,8}$/.test(text))return '입찰 예정가를 만원 단위 정수로 입력하세요.';
 if(!Number.isSafeInteger(minWon)||minWon<=0)return '최저매각가 미확인 · 법원 원문에서 확인하세요.';
 const bid=Number(text)*10000;
 if(!Number.isSafeInteger(bid))return '입찰 예정가를 확인하세요.';
 if(bid<minWon)return '최저매각가보다 '+prettyPrice(minWon-bid)+' 낮습니다 · 해당 최저가 기준 미달';
 if(bid===minWon)return '표시된 최저매각가와 금액이 같습니다.';
 return '표시된 최저매각가보다 '+prettyPrice(bid-minWon)+' 높습니다.';
}

function auctionBidCalculator(minWon,refLabel){
 const minText=Number.isSafeInteger(minWon)&&minWon>0?prettyPrice(minWon):'미확인';
 return '<div class="auction-bid-calc" data-auction-calc data-min-won="'+(Number.isSafeInteger(minWon)&&minWon>0?minWon:'')+'">'+
  '<strong>입찰보증금 계산기</strong>'+
  '<p class="helper">기준 최저매각가: '+escapeHtml(minText)+' · '+escapeHtml(refLabel)+'</p>'+
  '<label class="label">가정 입찰가 (만원)<input class="search" data-bid-manwon type="number" inputmode="numeric" min="1" max="999999999" step="1" placeholder="직접 입력 (만원)"></label>'+
  '<label class="label">법원 공고에서 확인한 보증금 비율<select class="select" data-bid-rate>'+
  '<option value="">비율을 선택하세요</option><option value="10">10%</option><option value="20">20%</option></select></label>'+
  '<div class="auction-bid-compare" data-bid-compare aria-live="polite">입찰 예정가와 최저매각가를 비교할 수 있습니다.</div>'+ 
  '<div class="auction-bid-result" data-bid-result role="status" aria-live="polite">입찰가와 공고상 비율을 입력하면 예상 보증금이 계산됩니다.</div>'+
  '<p class="helper">단순 계산 보조도구입니다. 사건별 보증금 비율·특별매각조건·최저가·진행 여부는 법원 공고와 원문을 반드시 확인하세요. 계산값은 공식 확인 또는 입찰 가능 판정이 아닙니다.</p>'+
  '</div>';
}
function auctionPrebidChecklist(){
 return '<details class="auction-prebid"><summary>입찰 전 확인사항</summary><ul>'+
  '<li>법원 원문에서 사건번호·물건번호·입찰기일·변경·취하 여부 확인</li>'+
  '<li>매각물건명세서·현황조사서·감정평가서 대조</li>'+
  '<li>등기사항·임차인·점유·인수권리 확인</li>'+
  '<li>특별매각조건 및 공고상 보증금 비율 확인</li>'+
  '<li>현장·도로·건물 상태와 세금·명도 비용 별도 확인</li>'+
  '</ul><p class="helper">확인 완료 표시가 아닌 점검 항목 안내입니다.</p></details>';
}


function rightsDrafts(){
 return Array.isArray(saved.rightsDrafts)?saved.rightsDrafts:[];
}
// Records from an official snapshot and manual registration are associated
// only when court NAME, case number and lot number all match exactly.
function linkedRightsIds(id){
 const result=[id];
 if(capitalSnapshot?.validation?.passed!==true)return result;
 const lots=Array.isArray(capitalSnapshot.items)?capitalSnapshot.items:[];
 const isCourt=/^court-B\d{6}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(id);
 if(isCourt){
  const matching=lots.filter(x=>x.id===id&&x.id==='court-'+x.courtCode+'|'+x.caseNo+'|'+x.itemNo);
  if(matching.length!==1)return result;
  const lot=matching[0];
  const reals=registeredProperties().filter(p=>p.id===realCaseId(p.court,p.case,p.itemNo||'1')&&
   p.court===lot.courtName&&p.case===lot.caseNo&&String(p.itemNo||'1')===String(lot.itemNo));
  if(reals.length===1)result.push(reals[0].id);
 }else{
  const real=registeredProperties().find(p=>p.id===id);
  if(!real||real.id!==realCaseId(real.court,real.case,real.itemNo||'1'))return result;
  const candidates=lots.filter(x=>x.id==='court-'+x.courtCode+'|'+x.caseNo+'|'+x.itemNo&&
   x.courtName===real.court&&x.caseNo===real.case&&String(x.itemNo)===String(real.itemNo||'1'));
  if(candidates.length===1)result.unshift(candidates[0].id);
 }
 return result;
}
function rightsDraftConflict(id){
 return rightsDrafts().filter(x=>linkedRightsIds(id).includes(x.propertyId)).length>1;
}
function currentRightsDraft(id){
 const ids=linkedRightsIds(id);
 const existing=rightsDrafts().filter(x=>ids.includes(x.propertyId));
 if(existing.length>1)return null; // Never silently merge two existing records.
 return existing[0]||window.RightsDraftSchema?.newRightsDraft(ids[0])||null;
}
function saveRightsDraft(next){
 const validated=window.RightsDraftSchema?.validateRightsDraft(next);
 if(!validated?.valid)throw Error('권리분석 입력 내용 오류: '+(validated?.reason||'검사 실패'));
 const old=saved.rightsDrafts;
 const nextRows=rightsDrafts().filter(x=>x.propertyId!==next.propertyId).concat(next);
 if(nextRows.length>100)throw Error('권리분석 기록 한도를 초과했어요.');
 saved.rightsDrafts=nextRows;
 try{write();}catch(e){if(old===undefined)delete saved.rightsDrafts;else saved.rightsDrafts=old;throw e;}
}

function rightsScenarioMarkup(p){
 const sourced=!!p?.userRegistered?
  (Number.isSafeInteger(p.minWon)&&p.minWon>0?p.minWon:null):
  (capitalSnapshot?.validation?.passed===true&&Number.isSafeInteger(p?.minimumWon)&&p.minimumWon>0?p.minimumWon:null);
 const appraisal=p?.userRegistered?p.valueWon:p?.appraisalWon;
 const knownAppraisal=Number.isSafeInteger(appraisal)&&appraisal>0?appraisal:null;
 const draft=currentRightsDraft(p.id);
 const tenants=Array.isArray(draft?.tenants)?draft.tenants:[];
 const deposits=tenants.filter(x=>Number.isSafeInteger(x.depositWon)&&x.depositWon>=0);
 const totalDeposits=deposits.reduce((a,x)=>a+x.depositWon,0);
 const depositNote=tenants.length?
  '<p class="helper">입력된 임차인 '+tenants.length+'명 · 보증금 확인 입력 '+deposits.length+'명'+
  (deposits.length&&Number.isSafeInteger(totalDeposits)?' · 입력된 보증금 합계 '+escapeHtml(prettyPrice(totalDeposits)):'')+
  ' · 이 합계는 낙찰자가 인수할 금액이 아닙니다.</p>':'';
 const inputs=[
  ['assumedLiabilityWon','인수 가정액'],
  ['acquisitionTaxWon','취득세'],
  ['registrationWon','등기·법무비'],
  ['evictionWon','명도비'],
  ['otherWon','기타비용']
 ];
 const sourceText=sourced!==null?
  '<p class="helper">저장된 '+(p.userRegistered?'직접 등록':'법원 부분수집')+' 최저매각가 '+escapeHtml(prettyPrice(sourced))+
  '를 낙찰예정가의 시작값으로 불러왔어요. 실제 입찰가나 최신 법원가격으로 확정된 값이 아니므로 수정할 수 있어요.</p>':
  '<p class="helper">확인 가능한 최저매각가가 없어 낙찰예정가를 직접 입력해야 해요.</p>';
 return '<section class="rights-scenario" data-scenario-property="'+escapeHtml(p.id)+'"'+
  (sourced!==null?' data-scenario-minimum="'+sourced+'"':'')+
  (knownAppraisal!==null?' data-scenario-appraisal="'+knownAppraisal+'"':'')+'>'+
  '<h3>낙찰 예상 비용</h3><p class="helper">현재 확인된 금액과 필요한 확인 사항을 먼저 보여줘요.</p>'+
  '<div class="rights-scenario-fields"><label for="rightsCalc_bidWon">낙찰예정가 (원)'+
  '<input class="search" id="rightsCalc_bidWon" inputmode="numeric" pattern="[0-9]*" autocomplete="off"'+
  (sourced!==null?' value="'+sourced+'"':'')+' placeholder="낙찰예정가 입력" data-scenario-amount="bidWon"></label></div>'+
  '<div id="rightsBidComparison" class="helper" role="status"></div>'+
  '<div class="rights-cost-summary" aria-label="비용 현황">'+
  '<div class="rights-cost-row"><span>취득세 및 부가세</span><strong id="rightsCostTax">조건 확인 필요</strong></div>'+
  '<div class="rights-cost-row"><span>등기·법무비</span><strong id="rightsCostRegistration">예상액 미확인</strong></div>'+
  '<div class="rights-cost-row"><span>인수 가능 금액</span><strong id="rightsCostLiability">권리 확인 필요</strong></div>'+
  '<div class="rights-cost-row"><span>명도비·기타비용</span><strong id="rightsCostOther">금액 미확인</strong></div></div>'+
  '<div class="rights-cost-total"><span>현재 입력된 금액 합계</span><strong id="rightsCostTotal">계산 중</strong></div>'+
  '<div id="rightsScenarioResult" class="helper" role="status" aria-live="polite">계산 중</div>'+
  '<details class="auction-fold rights-cost-settings"><summary>비용 자동계산·직접 수정</summary>'+
  sourceText+depositNote+
  '<div class="rights-tax-controls"><label for="rightsTaxMode">취득세 계산 조건'+
  '<select class="select" id="rightsTaxMode">'+
  '<option value="unknown">아직 몰라요</option>'+
  '<option value="ordinary">주택 일반세율 적용 · 중과/감면 없음 확인</option>'+
  '<option value="manual">세액을 직접 입력</option></select></label>'+
  '<label for="rightsTaxArea">주택 전용면적'+
  '<select class="select" id="rightsTaxArea"><option value="unknown">미확인</option>'+
  '<option value="at_most_85">85㎡ 이하</option><option value="over_85">85㎡ 초과</option></select></label>'+
  '<p class="helper" id="rightsTaxStatus">주택인지, 세율 조건과 면적을 확인하면 취득세·지방교육세·농어촌특별세를 참고 계산해요. 모르면 비워두세요.</p></div>'+
  '<div class="rights-scenario-fields">'+inputs.map(([key,title])=>
   '<label for="rightsCalc_'+key+'">'+title+' (원)<input class="search" id="rightsCalc_'+key+
   '" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="미확인" data-scenario-amount="'+key+'"></label>').join('')+'</div>'+
  '</details>'+

  '<p class="helper rights-cost-disclaimer">권리·인수금은 원본 검증 전 미확정 · 입력 금액은 저장되지 않아요.</p></section>';
}
function attachRightsScenario(){
 const shell=document.querySelector('[data-scenario-property]');
 const out=$('#rightsScenarioResult');if(!out||!shell)return;
 const controls=[...shell.querySelectorAll('[data-scenario-amount]')];
 const amount=parseNode=>{const raw=parseNode.value.trim();
  if(!raw)return null;
  if(!/^\d{1,16}$/.test(raw))throw Error('금액은 0 이상의 원 단위 숫자만 입력하세요.');
  const n=Number(raw);if(!Number.isSafeInteger(n)||n>1_000_000_000_000_000)throw Error('금액 범위를 확인하세요.');
  return n;
 };
 const initial=Number(shell.dataset.scenarioMinimum);
 const minimum=Number.isSafeInteger(initial)&&initial>0?initial:null;
 const knownAppraisal=Number(shell.dataset.scenarioAppraisal);
 const appraisal=Number.isSafeInteger(knownAppraisal)&&knownAppraisal>0?knownAppraisal:null;
 const comparison=$('#rightsBidComparison');
 const costTax=$('#rightsCostTax'),costRegistration=$('#rightsCostRegistration');
 const costLiability=$('#rightsCostLiability'),costOther=$('#rightsCostOther'),costTotal=$('#rightsCostTotal');
 const taxMode=$('#rightsTaxMode'),taxArea=$('#rightsTaxArea'),taxNode=$('#rightsCalc_acquisitionTaxWon'),taxStatus=$('#rightsTaxStatus');
 let autoTax=false;
 const calculate=()=>{
  try{
   const bid=amount($('#rightsCalc_bidWon'));
   if(taxMode.value==='ordinary'&&taxArea.value!=='unknown'&&bid!==null){
    const estimate=window.RightsLiability?.estimateOrdinaryHouseAcquisitionTax?.({
     bidWon:bid,ordinaryRateConfirmed:true,areaClass:taxArea.value});
    if(estimate?.ok){
     taxNode.value=String(estimate.estimatedWon);taxNode.readOnly=true;autoTax=true;
     taxStatus.textContent='자동 참고 계산 '+prettyPrice(estimate.estimatedWon)+
      ' (취득세 '+prettyPrice(estimate.acquisitionWon)+
      ' + 지방교육세 '+prettyPrice(estimate.educationWon)+
      ' + 농어촌특별세 '+prettyPrice(estimate.ruralWon)+') · 실제 세액 미확정';
    }else{if(autoTax)taxNode.value='';taxNode.readOnly=false;autoTax=false;
     taxStatus.textContent='취득세 자동 계산 불가 · 적용 조건을 확인하세요.';}
   }else{
    if(autoTax)taxNode.value='';
    taxNode.readOnly=false;autoTax=false;
    taxStatus.textContent=taxMode.value==='manual'?'직접 입력한 세액은 사용자 가정값입니다.':
     '주택 일반세율과 면적 확인 전에는 취득세를 0원으로 계산하지 않아요.';
   }
   const entries=Object.fromEntries(controls.map(node=>[node.dataset.scenarioAmount,amount(node)]));
   if(entries.bidWon===null){out.textContent='낙찰예정가를 입력해 주세요 · 총액 산정 불가';comparison.textContent='';costTotal.textContent='미확인';return;}
   const engine=window.RightsLiability?.calculateLiabilityScenario;
   if(typeof engine!=='function')throw Error('계산 기능을 불러오지 못했습니다.');
   const result=engine({bidWon:entries.bidWon,assumedLiabilityWon:entries.assumedLiabilityWon,
    fees:{acquisitionTaxWon:entries.acquisitionTaxWon,registrationWon:entries.registrationWon,
     evictionWon:entries.evictionWon,otherWon:entries.otherWon}});
   if(!result.ok)throw Error('금액을 확인해 주세요: '+result.reason);
   const display=(value,missing)=>value===null?missing:prettyPrice(value);
   costTax.textContent=display(entries.acquisitionTaxWon,'조건 확인 필요');
   costRegistration.textContent=display(entries.registrationWon,'예상액 미확인');
   costLiability.textContent=display(entries.assumedLiabilityWon,'권리 확인 필요');
   const extra=[entries.evictionWon,entries.otherWon];
   costOther.textContent=extra.every(v=>v!==null)?prettyPrice(extra[0]+extra[1]):'금액 미확인';
   costTotal.textContent=prettyPrice(result.scenarioSubtotalWon);
   const info=[];
   if(minimum!==null){const delta=entries.bidWon-minimum;
    info.push('최저매각가 대비 '+(delta>=0?'+':'−')+prettyPrice(Math.abs(delta)));}
   if(appraisal!==null)info.push('감정가 대비 '+Math.round(entries.bidWon/appraisal*1000)/10+'%');
   comparison.textContent=info.join(' · ')+' · 가격 비교일 뿐 입찰 적정성 판단은 아닙니다.';
   out.textContent=result.scenarioTotalWon===null?
    '미확인 '+result.missingFields.length+'항목 제외 · 실제 총액 산정 불가':
    '입력값 기준 가정 비용 · 실제 인수 여부 미확인';
  }catch(error){out.textContent='계산 불가 · '+String(error.message||'금액 오류');comparison.textContent='';costTotal.textContent='계산 불가';}
 };
 controls.forEach(node=>node.addEventListener('input',calculate));
 taxMode.addEventListener('change',calculate);
 taxArea.addEventListener('change',calculate);
 calculate();
}

function rightsEvidenceMarkup(d){
 const module=window.RightsSourceChecklist;
 if(!module?.evidenceChecklist)return '<p class="status">6개 권리분석 근거서류 목록을 불러오지 못했어요.</p>';
 const rows=module.evidenceChecklist(d);
 return '<section class="rights-evidence" aria-label="한눈에 보는 권리분석">'+
  '<h3>한눈에 보는 권리분석</h3>'+
  '<p class="helper">6가지 항목 모두 원본 검토 전에는 미확인이에요. 등록된 서류가 있어도 법적 결론이 확인된 것은 아니에요.</p>'+
  rows.map(row=>'<details class="rights-evidence-row"><summary><span>'+escapeHtml(row.label)+
   '</span><strong>미확인 · 원본 '+row.recordedCount+'/'+row.neededCount+'종 기록</strong></summary>'+
   '<div class="rights-evidence-docs"><strong>확인할 원본</strong>'+
   row.required.map(type=>'<div class="rights-evidence-source">'+
    '<span>'+escapeHtml(module.DOC_NAMES[type])+'</span><span>'+
    (row.recorded.includes(type)?'자료 기록됨 · 진위 미검증':'원본 필요')+
    '</span></div>').join('')+
   '<p class="helper">여기 표시된 것은 서류 등록 현황이지, '+escapeHtml(row.label)+
   '의 권리 성립·소멸·인수 여부를 판정한 결과가 아닙니다.</p></div></details>').join('')+
  '</section>';
}

function rightsEditor(p){
 if(!p?.id||(!p.userRegistered&&!(capitalSnapshot?.validation?.passed===true&&
  capitalSnapshot.items?.some(x=>x.id===p.id&&x.id==='court-'+x.courtCode+'|'+x.caseNo+'|'+x.itemNo))))
  return '<p class="status">검증된 물건번호를 확인할 수 없어 기록 입력을 중단했어요.</p>';
 if(rightsDraftConflict(p.id))return '<div class="status">⚠ 동일 사건에 직접 등록/수집 기록이 각각 존재합니다. 자동 병합은 하지 않습니다. 별도 백업 후 기록을 검토해 주세요.</div>';
 const d=currentRightsDraft(p.id);
 if(!d)return '<p class="status">입력 검증 모듈을 불러오지 못했어요. 새로고침해 주세요.</p>';
 const docNames={registry:'등기사항증명서',sale_statement:'매각물건명세서',occupancy_report:'현황조사서',appraisal:'감정평가서',lease:'임대차 자료',other:'기타'};
 const docRows=d.documents.map(x=>'<li>'+escapeHtml(docNames[x.type]||x.type)+' · '+escapeHtml(x.reference||'자료명 미입력')+' ('+escapeHtml(x.issuedOn||'발급일 미확인')+') '+(x.fileId?'<button type="button" class="secondary" data-rights-openpdf="'+escapeHtml(x.id)+'">원본 PDF 열기</button>':'<small>서류 정보만 기록됨 · 원본 없음</small>')+' <button type="button" class="secondary" data-rights-remove="document" data-rights-id="'+escapeHtml(x.id)+'">삭제</button></li>').join('');
 const tenantRows=d.tenants.map(x=>'<li>임차인 기록 · 보증금 '+escapeHtml(x.depositWon===null?'미확인':prettyPrice(x.depositWon))+' · 전입 '+escapeHtml(x.moveInOn||'미확인')+' <button type="button" class="secondary" data-rights-remove="tenant" data-rights-id="'+escapeHtml(x.id)+'">삭제</button></li>').join('');
 const rightRows=d.rights.map(x=>'<li>권리 기록 · '+escapeHtml(x.type)+' · 접수 '+escapeHtml(x.registeredOn||'미확인')+' <button type="button" class="secondary" data-rights-remove="right" data-rights-id="'+escapeHtml(x.id)+'">삭제</button></li>').join('');
 return rightsEvidenceMarkup(d)+rightsScenarioMarkup(p)+
 '<details class="auction-fold rights-manual-records"><summary>권리자료 직접 기록 · 서류 '+d.documents.length+'건 · 임차인 '+d.tenants.length+'건 · 등기 '+d.rights.length+'건</summary>'+
 '<p class="helper">자료는 사용자 기기에만 저장됩니다. PDF를 등록해도 자동 법률판정은 하지 않습니다.</p>'+
 '<details class="auction-fold"><summary>＋ 원본 PDF 가져오기 · 사건번호 확인</summary>'+
 '<form id="rightsPdfForm" class="rights-form">'+
 '<label>원본 종류<select id="rightsPdfType" class="select">'+Object.entries(docNames).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label>'+
 '<label>내 파일에서 PDF 선택<input type="file" accept=".pdf,application/pdf" id="rightsPdfInput" required></label>'+
 '<label>발급일(선택)<input type="date" id="rightsPdfIssueDate" class="search"></label>'+
 '<button type="submit" class="primary" id="rightsPdfSave">사건번호 확인 후 PDF 보관</button>'+
 '<p class="helper" id="rightsPdfStatus" aria-live="polite">8MB 이하 · 사건번호를 읽을 수 있는 PDF만 연결합니다. 같은 사건이라도 물건번호는 사용자가 원본을 대조해야 합니다. 원본 파일은 기기와 전체 백업에 보관해요.</p>'+
 '</form></details>'+
 '<details class="auction-fold"><summary>＋ 서류 기록 추가</summary><form id="rightsDocumentForm" data-property-id="'+escapeHtml(p.id)+'" class="rights-form">'+
 '<label>서류 종류<select id="rightsDocType" class="select">'+Object.entries(docNames).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label>'+
 '<label>자료명·페이지·출처<input id="rightsDocRef" class="search" maxlength="220" required placeholder="예: 등기사항증명서 1쪽"></label>'+
 '<label>발급일(선택)<input type="date" id="rightsDocDate" class="search"></label>'+
 '<button class="primary" type="submit">서류 기록 저장</button></form></details>'+
 (docRows?'<ul class="rights-record-list">'+docRows+'</ul>':'')+
 '<details class="auction-fold"><summary>＋ 임차인 정보 추가</summary><form id="rightsTenantForm" class="rights-form">'+
 '<label>보증금(원, 미확인 시 공란)<input id="rightsTenantDeposit" class="search" inputmode="numeric" placeholder="미확인"></label>'+
 '<label>전입일(선택)<input type="date" id="rightsTenantMove" class="search"></label>'+
 '<label>점유 여부<select id="rightsTenantOccupancy" class="select"><option value="unknown">미확인</option><option value="yes">점유</option><option value="no">비점유(사용자 기록)</option></select></label>'+
 '<label>배당요구<select id="rightsTenantDemand" class="select"><option value="unknown">미확인</option><option value="yes">요구(사용자 기록)</option><option value="no">미요구(사용자 기록)</option></select></label>'+
 '<label>근거서류<select id="rightsTenantDoc" class="select"><option value="">미확인</option>'+d.documents.map(x=>'<option value="'+escapeHtml(x.id)+'">'+escapeHtml(docNames[x.type]||x.type)+'</option>').join('')+'</select></label>'+
 '<button class="primary" type="submit">임차인 기록 저장</button></form></details>'+
 (tenantRows?'<ul class="rights-record-list">'+tenantRows+'</ul>':'')+
 '<details class="auction-fold"><summary>＋ 등기 권리 추가</summary><form id="rightsRightForm" class="rights-form">'+
 '<label>권리 종류<select id="rightsRightType" class="select"><option value="mortgage">근저당</option><option value="seizure">압류</option><option value="provisional_seizure">가압류</option><option value="ownership">소유권</option><option value="leasehold">임차권등기</option><option value="provisional_registration">가등기</option><option value="injunction">가처분</option><option value="other">기타</option></select></label>'+
 '<label>접수일(선택)<input type="date" id="rightsRightDate" class="search"></label>'+
 '<label>권리 금액(원, 미확인 시 공란)<input id="rightsRightAmount" class="search" inputmode="numeric"></label>'+
 '<label>근거서류<select id="rightsRightDoc" class="select"><option value="">미확인</option>'+d.documents.map(x=>'<option value="'+escapeHtml(x.id)+'">'+escapeHtml(docNames[x.type]||x.type)+'</option>').join('')+'</select></label>'+
 '<button class="primary" type="submit">권리 기록 저장</button></form></details>'+
 (rightRows?'<ul class="rights-record-list">'+rightRows+'</ul>':'')+
 '</details>';
}
function attachRightsEditor(){
 const shell=$('#rightsDocumentForm');if(!shell)return;
 const propertyId=shell.dataset.propertyId;
 const validContext=()=>state.page==='rights'?state.rightsPropertyId===propertyId:
   state.page==='detail'&&state.detail===propertyId;
 const nextId=()=>('r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8));
 const amount=id=>{const value=$(id).value.trim();if(!value)return null;
  if(!/^\d{1,16}$/.test(value))throw Error('금액은 0 이상의 원 단위 숫자만 입력하세요.');
  const n=Number(value);if(!Number.isSafeInteger(n)||n>1_000_000_000_000_000)throw Error('금액 범위를 확인하세요.');
  return n;};
 const submit=(collection,item)=>{const draft=currentRightsDraft(propertyId);
  if(!draft||!validContext())throw Error('현재 물건을 확인하세요.');
  const next={...draft,[collection]:[...draft[collection],item]};
  saveRightsDraft(next);render();showSavedCheck('권리자료 저장 완료');};
 shell.onsubmit=e=>{e.preventDefault();try{
  const ref=$('#rightsDocRef').value.trim();if(!ref)throw Error('자료명과 출처를 입력하세요.');
  submit('documents',{id:nextId(),type:$('#rightsDocType').value,source:'user_entry',
   issuedOn:$('#rightsDocDate').value||null,checkedOn:null,reference:ref,officiallyVerified:false});
 }catch(error){toast(error.message||'서류 저장 실패');}};
 $('#rightsTenantForm').onsubmit=e=>{e.preventDefault();try{submit('tenants',{
  id:nextId(),occupancy:$('#rightsTenantOccupancy').value,distributionDemand:$('#rightsTenantDemand').value,
  moveInOn:$('#rightsTenantMove').value||null,fixedDateOn:null,depositWon:amount('#rightsTenantDeposit'),
  documentId:$('#rightsTenantDoc').value||null,notes:null,liabilityVerified:false
 });}catch(error){toast(error.message||'임차인 저장 실패');}};
 $('#rightsRightForm').onsubmit=e=>{e.preventDefault();try{submit('rights',{
  id:nextId(),type:$('#rightsRightType').value,registeredOn:$('#rightsRightDate').value||null,
  rank:null,amountWon:amount('#rightsRightAmount'),documentId:$('#rightsRightDoc').value||null,
  notes:null,legalEffectVerified:false
 });}catch(error){toast(error.message||'권리 저장 실패');}};
 document.querySelectorAll('[data-rights-remove]').forEach(btn=>btn.onclick=()=>{try{
  if(!confirm('선택한 기록을 삭제할까요?'))return;
  if(!validContext())throw Error('현재 물건을 확인하세요.');
  const draft=currentRightsDraft(propertyId);if(!draft)throw Error('기록 충돌로 수정이 중단됐어요.');
  const kind=btn.dataset.rightsRemove;
  const key={document:'documents',tenant:'tenants',right:'rights'}[kind];if(!key)throw Error('항목 오류');
  const id=btn.dataset.rightsId;
  if(key==='documents'&&(draft.tenants.some(x=>x.documentId===id)||draft.rights.some(x=>x.documentId===id)))
   throw Error('다른 기록에서 참조하는 서류입니다. 연결 기록을 먼저 삭제하세요.');
  saveRightsDraft({...draft,[key]:draft[key].filter(x=>x.id!==id)});
  render();showSavedCheck('권리자료 변경 완료');
 }catch(error){toast(error.message||'삭제 실패');}});
}

function detail(){
 const p=allProperties().find(x=>x.id===state.detail)||properties[0],tab=state.detailTab||'overview';
 const navTabs=[['overview','개요'],['rights','권리'],['market','시세'],['docs','서류']].map(([v,name])=>`<button type="button" class="detail-tab ${tab===v?'selected':''}" data-detail-tab="${v}" aria-pressed="${tab===v}">${name}</button>`).join('');
 let panel='';
 if(tab==='overview'){
  panel=`<div class="row"><div class="metric"><div class="smTitle">감정가</div><b>${p.userRegistered?knownAuctionPrice(p,p.valueWon):escapeHtml(p.value)}</b></div><div class="metric"><div class="smTitle">최저입찰가</div><b class="detail-price">${compactAuctionPrice(knownAuctionPrice(p,propertyPrice(p)))}</b></div></div><div class="divider"></div><div class="line"><span class="muted">매각기일</span><strong>${escapeHtml(p.date||'미확인')} · ${p.userRegistered?escapeHtml(auctionDday(p.date)):'예시 '+escapeHtml(auctionDday(p.date))}</strong></div><div class="divider"></div><div class="line"><span class="muted">물건 종류</span><strong>${escapeHtml(p.type)}</strong></div><div class="line auction-detail-ident"><span class="muted">담당 법원</span><strong>${escapeHtml(p.court)}</strong></div><div class="line auction-detail-ident"><span class="muted">사건번호</span><strong>${escapeHtml(p.case)}</strong></div>${p.userRegistered?`<div class="line"><span class="muted">물건번호</span><strong>${escapeHtml(p.itemNo||'미확인')}</strong></div>`:''}${p.courtUsage?.names?.large?`<div class="line"><span class="muted">법원 분류</span><strong>${escapeHtml([p.courtUsage.names.large,p.courtUsage.names.medium,p.courtUsage.names.small].filter(Boolean).join(" › "))}</strong></div>`:""}${p.userRegistered&&p.court==='서울중앙지방법원'?'<div class="court-detail-recheck"><button type="button" class="secondary full-secondary" id="recheckRegisteredCourt">법원 정보 다시 조회해 빈 항목 보완</button><p class="helper" id="recheckRegisteredCourtStatus" role="status">기존 입력을 유지하며 확인된 빈 가격·기일만 저장해요.</p></div>':''}${p.userRegistered?'<div class="court-detail-pdf"><label class="official-pdf-label" for="detailPdfInput">▤ 법원 PDF에서 개요 보완</label><input type="file" id="detailPdfInput" accept="application/pdf,.pdf" hidden><p class="helper" id="detailPdfStatus">기존 사건번호와 법원을 대조하고 미확인 항목만 추가해요.</p></div>':''}<div class="divider"></div>${p.userRegistered?auctionFold('지도·로드뷰 확인',auctionMapControls(p.name,'사용자 입력 주소 기준 · 법원 원문과 대조 필요'),'auction-fold-map'):''}${auctionFold('감정가 대비 가격 분석',auctionPriceAnalysis(p.userRegistered?p.valueWon:null,propertyPrice(p),p.userRegistered?'사용자 입력 정보':'가상 예시 · 분석 제한'),'auction-fold-analysis')}${auctionFold('입찰보증금 계산기',auctionBidCalculator(propertyPrice(p),p.userRegistered?'사용자 입력 · 법원 미검증':'가상 예시 · 실입찰 사용 불가'),'auction-fold-calc')}${auctionPrebidChecklist()}<div class="status">⚠ 법원 서류와 점유관계는 아직 확인되지 않았어요.</div>`;
 }else if(tab==='rights'){
  panel=`<div class="detail-panel-heading">권리분석</div><div class="status">⚠ 등기·임차인·점유 자료가 연결되지 않았어요.</div><div class="info-row"><span>말소기준권리</span><strong>확인 필요</strong></div><div class="info-row"><span>임차인 현황</span><strong>확인 필요</strong></div><div class="info-row"><span>인수 가능 권리</span><strong>확인 필요</strong></div><button class="secondary full-secondary" id="rightsBtn" type="button">권리분석 상세 보기 →</button>${rightsEditor(p)}`;
 }else if(tab==='market'){
  panel=`<div class="detail-panel-heading">시세 정보</div><div class="status">ⓘ 실거래가·현재 매물 시세는 아직 연결되지 않았어요.</div><div class="info-row"><span>감정평가액 (${p.userRegistered?'사용자 입력':'예시'})</span><strong>${p.userRegistered?knownAuctionPrice(p,p.valueWon):escapeHtml(p.value)}</strong></div><div class="info-row"><span>최근 실거래가</span><strong>자료 미연동</strong></div><div class="info-row"><span>시세 대비 할인율</span><strong>계산 보류</strong></div><p class="helper">감정가를 실제 거래 시세로 표시하지 않아요.</p>`;
 }else{
  panel=`<div class="detail-panel-heading">관련 서류</div><div class="status">ⓘ 법원 원본 서류는 아직 연결되지 않았어요.</div><div class="info-row"><span>매각물건명세서</span><strong>연동 전</strong></div><div class="info-row"><span>현황조사서</span><strong>연동 전</strong></div><div class="info-row"><span>감정평가서</span><strong>연동 전</strong></div><p class="helper">법원 자료를 연결한 뒤 원본 문서와 출처를 제공할 예정이에요.</p>`;
 }
 return `<div class="card auction-detail"><div class="placeholder"><div><div style="font-size:55px">⌂</div>실제 사진 미연동<br>법원 원본 사진 연결 예정</div></div><div class="auction-card-top" style="margin-top:15px"><span class="auction-type">${escapeHtml(p.type)}</span><span class="auction-demo ${p.userRegistered?'user-record':''}">${p.userRegistered?'사용자 등록 · 법원 확인 필요':'가상 물건'}</span></div><h2 class="detailTitle">${escapeHtml(p.name)}</h2><p class="muted">${escapeHtml(p.court)} · ${escapeHtml(p.case)}</p><div class="detail-tabs" role="group" aria-label="물건 상세정보 분류">${navTabs}</div><div class="detail-tab-panel">${panel}</div>${p.userRegistered?'<button class="secondary full-secondary" type="button" id="editRealDetail">✎ 등록 정보 수정</button><button class="secondary full-secondary" type="button" id="openCourtDetail">⚖ 법원 원문에서 사건 확인 ↗</button>':''}<button class="primary detail-favorite-btn ${saved.favorites.includes(p.id)?'is-favorite':'is-not-favorite'}" id="favBtn" type="button" aria-pressed="${saved.favorites.includes(p.id)}"><span class="favorite-heart" aria-hidden="true">${saved.favorites.includes(p.id)?'♥':'♡'}</span> ${saved.favorites.includes(p.id)?'관심 해제':'관심물건 저장'}</button></div><p class="helper">${p.userRegistered?'사용자가 입력한 사건 기록입니다. 공식 자동 조회 결과가 아니며 입찰 전에 법원 경매 원본을 직접 확인하세요.':'사건번호·가격·날짜는 모두 화면 테스트용 가상 정보이며 입찰에 이용하면 안 됩니다.'}</p>`;
}
function rights(){
 const id=state.rightsPropertyId;
 const record=registeredProperties().find(p=>p.id===id)||
  (capitalSnapshot?.validation?.passed===true?capitalSnapshot.items?.find(p=>p.id===id):null);
 if(!record)return '<div class="status">권리분석할 물건을 확인하지 못했습니다. 직접 등록 목록 또는 법원 수집목록에서 물건을 다시 선택하세요.</div>';
 const court=record.courtName||record.court||'법원 미확인';
 const number=record.caseNo||record.case||'';
 return '<div class="card"><h2>권리분석 · 수동 기록</h2><p class="helper">'+escapeHtml(court)+' · '+escapeHtml(number)+' · 물건 '+escapeHtml(record.itemNo||'1')+'번</p>'+
 '<p class="helper">원본 서류 검증 전에는 권리·인수금이 미확정이에요.</p>'+
 rightsEditor(record)+'</div>';
}
const STUDY_CATEGORIES=[
 {id:'권리분석',icon:'⚖',desc:'등기·임차인·인수권리',topics:['등기부등본의 권리 순서 확인','말소기준권리와 인수 가능 권리 구분','임차인 점유와 보증금 관련 서류 확인']},
 {id:'경매절차',icon:'▤',desc:'사건검색부터 잔금납부',topics:['사건번호와 매각기일 확인','매각물건명세서·현황조사서 살펴보기','입찰보증금과 낙찰 후 일정 확인']},
 {id:'세금',icon:'▦',desc:'취득·보유·양도 비용',topics:['취득 단계의 세금과 부대비용','보유 과정의 세금 항목 확인','매각할 때 세금 검토 항목 정리']},
 {id:'명도',icon:'⌂',desc:'점유자·인도 절차',topics:['실제 점유자 현황 확인','협의 및 인도 절차 정리','인도명령 관련 서류와 기한 확인']}
];
const STUDY_CATEGORY_IDS=new Set(STUDY_CATEGORIES.map(c=>c.id));
function normalizedStudyCategory(value){return STUDY_CATEGORY_IDS.has(value)?value:'미분류';}
function studyTopicOptions(category){
 const group=STUDY_CATEGORIES.find(c=>c.id===category);
 return group?group.topics.map((topic,i)=>({id:category+':'+i,name:topic})):[];
}
function normalizedStudyTopic(value,category){
 return studyTopicOptions(category).some(topic=>topic.id===value)?value:'';
}
function visibleNotes(){
 const q=state.noteQuery.trim().normalize('NFC').toLocaleLowerCase('ko');
 const list=saved.notes.filter(n=>(state.studyCategory==='전체'||normalizedStudyCategory(n.category)===state.studyCategory)&&(!q||[n.title,n.body].some(v=>String(v||'').normalize('NFC').toLocaleLowerCase('ko').includes(q))));
 if(state.noteSort==='title')list.sort((a,b)=>String(a.title).localeCompare(String(b.title),'ko'));
 else if(state.noteSort==='oldest')list.sort((a,b)=>(a.updatedAt||a.id)-(b.updatedAt||b.id));
 else list.sort((a,b)=>(b.updatedAt||b.id)-(a.updatedAt||a.id));
 return list;
}
function noteCard(n){
 const summary=String(n.body||'').replace(/\s+/g,' ').trim();
 const ts=Number(n.updatedAt||n.id);
 const displayDate=Number.isFinite(ts)&&ts>946684800000?new Date(ts).toLocaleDateString('ko-KR'):'';
 return `<article class="study-note-card"><button type="button" class="study-note-open" data-note="${escapeHtml(n.id)}" aria-label="${escapeHtml(n.title)} 노트 열기"><span class="study-note-icon">▤</span><span class="study-note-info"><strong>${escapeHtml(n.title)}</strong><span class="study-note-excerpt">${escapeHtml(summary.slice(0,96)||'내용 없음')}</span><span class="study-note-date"><span class="study-note-category">${escapeHtml(normalizedStudyCategory(n.category))}</span>${normalizedStudyTopic(n.topicId,normalizedStudyCategory(n.category))?' · 학습항목 연결':''} ${escapeHtml(displayDate)}</span></span><span class="arrow">›</span></button><div class="study-note-actions"><button type="button" data-note-edit="${escapeHtml(n.id)}">수정</button><button type="button" class="study-delete" data-note-remove="${escapeHtml(n.id)}">삭제</button></div></article>`;
}
function study(){
 const list=visibleNotes(),count=saved.notes.length;
 const categories=STUDY_CATEGORIES.map((c,i)=>{
  const total=saved.notes.filter(n=>normalizedStudyCategory(n.category)===c.id).length;
  return `<button type="button" class="study-category-card ${state.studyCategory===c.id?'selected':''}" data-study-category="${escapeHtml(c.id)}"><span class="study-category-icon study-category-icon-${i}" aria-hidden="true"></span><span class="study-category-text"><strong>${c.id}</strong><small>${c.desc}</small></span><span class="study-category-count">${total}개</span></button>`;
 }).join('');
 const chosen=STUDY_CATEGORIES.find(c=>c.id===state.studyCategory);
 const lesson=chosen?`<div class="study-topic-panel"><div class="study-topic-heading"><strong>${chosen.icon} ${chosen.id} 학습 항목</strong><span>노트 연결</span></div>${chosen.topics.map((topic,i)=>{
  const topicId=chosen.id+':'+i;
  const linked=saved.notes.filter(n=>normalizedStudyCategory(n.category)===chosen.id&&normalizedStudyTopic(n.topicId,chosen.id)===topicId);
  return `<div class="study-linked-topic"><div class="study-topic-row"><span>${i+1}</span><p>${escapeHtml(topic)}</p><small>${linked.length}개</small></div><div class="study-topic-links">${linked.map(n=>`<button type="button" class="study-linked-note" data-note="${n.id}">▤ ${escapeHtml(n.title)} <span>›</span></button>`).join('')}<button type="button" class="study-topic-new" data-create-topic="${escapeHtml(topicId)}">＋ 이 항목에 노트 작성</button></div></div>`;
 }).join('')}<button type="button" id="createCategorizedNote" class="study-topic-create">＋ ${chosen.id} 일반 노트 작성</button><p class="study-topic-disclaimer">학습 항목별 노트를 모아 보는 용도이며 실제 사건의 법률 판단을 대신하지 않아요.</p></div>`:null;
 const uncategorized=saved.notes.filter(n=>normalizedStudyCategory(n.category)==='미분류').length;
 return `<div class="hero study-hero"><p>나만의 경매 학습 공간</p><h2>경매 공부방</h2><p>공부한 내용을 정리하고 기록하세요.</p></div>
 <div class="section"><h2>학습 카테고리</h2><button class="study-all-filter ${state.studyCategory==='전체'?'active':''}" data-study-category="전체" type="button">전체 보기</button></div>
 <div class="study-category-grid">${categories}</div><div class="study-unclassified"><button class="${state.studyCategory==='미분류'?'active':''}" data-study-category="미분류" type="button">미분류 노트 <strong>${uncategorized}개</strong></button></div>
 ${lesson||''}
 <div class="section study-section-heading"><h2>내 공부 노트 <span class="study-note-count">${count}개</span></h2><button class="miniButton" id="addNote">＋ 새 노트</button></div>
 <form id="noteSearchForm" class="search-form study-search-form" role="search"><input id="noteSearchInput" class="search" type="search" enterkeyhint="search" autocomplete="off" placeholder="제목·내용으로 노트 검색" value="${escapeHtml(state.noteQuery)}"><button type="submit" class="search-submit">검색</button></form>
 <div class="study-sort-toolbar"><span>${state.studyCategory==='전체'?'전체':escapeHtml(state.studyCategory)} · ${list.length}개 노트</span><label for="noteSort">정렬 <select class="select" id="noteSort"><option value="recent" ${state.noteSort==='recent'?'selected':''}>최근 수정순</option><option value="oldest" ${state.noteSort==='oldest'?'selected':''}>오래된순</option><option value="title" ${state.noteSort==='title'?'selected':''}>제목순</option></select></label></div>
 <div id="studyNoteResults">${list.map(noteCard).join('')||(count?'<div class="empty">이 카테고리에 검색 조건과 맞는 노트가 없어요.</div>':'<div class="empty">아직 작성한 노트가 없어요.<br>새 노트를 만들어보세요.</div>')}</div>
 <p class="helper">노트·형광펜·포스트잇은 기기에 저장돼요. 사진·PDF도 첨부할 수 있으며 중요한 자료는 설정에서 백업하세요.</p>`;
}
function note(){
 const n=saved.notes.find(x=>x.id===state.note)||{title:'',body:'',annotations:[],category:STUDY_CATEGORY_IDS.has(state.studyCategory)?state.studyCategory:'미분류',topicId:state.noteTopicDraft};
 return `<div class="card note-workspace" id="noteEditorShell">
 <div class="note-title-line"><label class="label" for="noteTitle">제목</label><label for="noteCategory" class="note-category-selector">분류 <select id="noteCategory" class="select">${['미분류',...STUDY_CATEGORIES.map(c=>c.id)].map(v=>`<option value="${v}" ${normalizedStudyCategory(n.category)===v?'selected':''}>${v}</option>`).join('')}</select></label></div><input id="noteTitle" class="search" placeholder="노트 제목" value="${escapeHtml(n.title)}"><div class="note-topic-selector"><label for="noteTopic">연결할 학습 항목</label><select id="noteTopic" class="select"><option value="">연결하지 않음</option>${studyTopicOptions(normalizedStudyCategory(n.category)).map(t=>`<option value="${escapeHtml(t.id)}" ${normalizedStudyTopic(n.topicId,normalizedStudyCategory(n.category))===t.id?'selected':''}>${escapeHtml(t.name)}</option>`).join('')}</select></div>
 <div id="notePdfSources" class="note-pdf-sources" hidden></div>
 <div id="noteDraftStatus" class="note-draft-status">작성 내용은 자동 임시저장 · 노트 저장으로 확정</div><div class="note-content-bar"><label class="label" for="noteBody">내용</label><div class="note-mode-buttons"><button id="noteWriteMode" type="button" class="note-mode active">✎ 작성</button><button id="noteMarkMode" type="button" class="note-mode">🖍 형광펜</button></div></div>
 <textarea class="select noteArea" id="noteBody" placeholder="공부한 내용을 적어보세요.">${escapeHtml(n.body)}</textarea>
 <div id="noteMarkupArea" class="note-markup-area" hidden><div class="note-mark-guide">첫 단어를 터치하고 마지막 단어를 터치하세요. 선택한 뒤 색상을 누르면 포스트잇이 열려요.</div><div class="note-select-tools"><div class="note-select-unit" role="group" aria-label="선택 단위"><button type="button" class="unit-active" data-note-granularity="word">단어</button><button type="button" data-note-granularity="char">글자</button></div><button type="button" id="noteClearSelection" class="note-clear-selection">선택 취소</button></div><p id="noteSelectionHint" class="note-selection-hint">시작 부분을 한 번 터치하세요.</p><div id="noteHighlightColors" class="note-color-tools"><button data-note-color="yellow" type="button" style="--marker-color:#ffe279" aria-label="노란 형광펜">노랑</button><button data-note-color="green" type="button" style="--marker-color:#b6f0bd" aria-label="초록 형광펜">초록</button><button data-note-color="pink" type="button" style="--marker-color:#ffc6d7" aria-label="분홍 형광펜">분홍</button><button data-note-color="blue" type="button" style="--marker-color:#b9ddff" aria-label="파란 형광펜">파랑</button></div><div id="noteHighlightText" class="note-highlight-text" aria-label="형광펜을 적용할 노트 내용"></div></div>
 <div class="note-footer"><div class="note-attachment-panel"><label for="noteAttachmentInput" class="note-attach-btn">＋ 사진 · PDF 첨부</label><input type="file" id="noteAttachmentInput" accept="image/*,application/pdf,.pdf" multiple hidden><span class="note-attach-count" id="noteAttachmentCount">첨부파일 불러오는 중</span></div><div class="note-attachment-list" id="noteAttachmentList"></div><button class="primary" id="saveNote" type="button">노트 저장</button>${state.note?'<button class="secondary note-delete-btn" id="deleteNote" type="button">노트 삭제</button>':''}</div>
 <div id="stickyBackdrop" class="sticky-backdrop" hidden><section class="sticky-paper" role="dialog" aria-modal="true" aria-labelledby="stickyHeading"><div class="sticky-head"><strong id="stickyHeading">▣ 포스트잇 메모</strong><button id="stickyClose" type="button" aria-label="닫기">×</button></div><p id="stickyQuote" class="sticky-quote"></p><textarea id="stickyText" class="sticky-input" placeholder="선택한 문장에 대한 메모를 적어보세요."></textarea><div class="sticky-buttons"><button type="button" id="stickyRemove" class="sticky-remove">형광펜 제거</button><button type="button" id="stickySave" class="sticky-save">메모 저장</button></div></section></div>
 <div id="attachmentViewer" class="attachment-viewer" role="dialog" aria-modal="true" aria-label="첨부파일 보기" hidden><div class="attachment-viewer-bar"><strong id="attachmentViewerName"></strong><button type="button" id="attachmentSearchOpen" class="attachment-search-open" aria-label="PDF 안에서 검색" title="PDF 검색" hidden><svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/></svg></button><button type="button" id="attachmentViewerClose" aria-label="첨부파일 닫기">✕</button></div><div class="attachment-viewer-content" id="attachmentViewerContent"></div><section id="attachmentSearchPanel" class="attachment-search-panel" role="dialog" aria-modal="false" aria-label="PDF 문장 검색" hidden><form id="attachmentSearchForm" class="attachment-search-form"><input id="attachmentSearchQuery" type="search" enterkeyhint="search" autocomplete="off" placeholder="PDF에서 찾을 단어·문장" aria-label="검색할 단어 또는 문장"><button type="submit">검색</button><button type="button" id="attachmentSearchClose">닫기</button></form><p id="attachmentSearchStatus" class="attachment-search-status" aria-live="polite">검색어를 입력해 주세요.</p><div id="attachmentSearchResults" class="attachment-search-results"></div></section><div class="attachment-viewer-controls"><div class="attachment-main-controls"><div id="attachmentViewerZoom" class="attachment-zoom" hidden><button type="button" id="attachmentZoomOut" aria-label="축소">−</button><button type="button" id="attachmentZoomReset">맞춤</button><button type="button" id="attachmentZoomIn" aria-label="확대">＋</button><span id="attachmentZoomValue" class="attachment-zoom-value">100%</span></div><div id="attachmentPdfControls" class="attachment-pdf-controls" hidden><button type="button" id="attachmentPdfPrev">이전</button><label class="attachment-page-field" for="attachmentPdfJump" aria-label="PDF 페이지 이동"><button type="button" id="attachmentPdfJump" class="attachment-page-trigger" aria-label="페이지 선택" aria-haspopup="dialog">1</button><span id="attachmentPdfTotal">/ ?</span></label><button type="button" id="attachmentPdfGo">이동</button><button type="button" id="attachmentPdfNext">다음</button><span id="attachmentPdfPage" class="attachment-pdf-reader-status" aria-live="polite">1페이지</span></div></div><div class="attachment-secondary-controls"><div class="attachment-pdf-extract-actions" id="attachmentExtractActions" hidden><button type="button" id="attachmentExtractToggle">문장 선택</button><button type="button" id="attachmentExtractInsert" hidden>선택 문장을 노트로</button></div><button type="button" class="attachment-export" id="attachmentViewerExport">내보내기</button></div><div id="attachmentExtractHint" class="attachment-extract-hint" hidden></div></div><div id="attachmentPagePicker" class="attachment-page-picker" hidden><div class="attachment-picker-sheet" role="dialog" aria-modal="true" aria-label="PDF 페이지 선택"><div class="attachment-picker-top"><button type="button" id="attachmentPickerCancel">취소</button><strong>페이지 선택</strong><button type="button" id="attachmentPickerDone">이동</button></div><div class="attachment-picker-wheel-wrap"><div id="attachmentPickerWheel" class="attachment-picker-wheel" role="listbox" aria-label="스크롤하여 페이지 선택"></div><div class="attachment-picker-selection" aria-hidden="true"></div></div><div class="attachment-picker-caption" id="attachmentPickerStatus"></div></div></div></div>
 </div>`;
}
const NOTE_COLORS={yellow:'#ffe279',green:'#b6f0bd',pink:'#ffc6d7',blue:'#b9ddff'};
function reconcileNoteMarks(before,after,marks){
 if(before===after)return marks;
 let prefix=0;
 while(prefix<before.length&&prefix<after.length&&before[prefix]===after[prefix])prefix++;
 let suffix=0;
 while(suffix<before.length-prefix&&suffix<after.length-prefix&&before[before.length-1-suffix]===after[after.length-1-suffix])suffix++;
 const oldChangedEnd=before.length-suffix,shift=after.length-before.length;
 return marks.flatMap(mark=>{
  const m={...mark};
  if(m.end<=prefix)return[m];
  if(m.start>=oldChangedEnd){m.start+=shift;m.end+=shift;return[m];}
  const quote=before.slice(mark.start,mark.end);
  const first=after.indexOf(quote);
  if(quote&&first>=0&&after.indexOf(quote,first+1)<0){m.start=first;m.end=first+quote.length;return[m];}
  return[];
 }).filter(m=>m.start>=0&&m.end<=after.length&&m.start<m.end);
}
function normalizeNoteMarks(text,marks){
 const ordered=(Array.isArray(marks)?marks:[]).filter(m=>m&&Number.isInteger(m.start)&&Number.isInteger(m.end)&&m.start>=0&&m.end<=text.length&&m.start<m.end&&NOTE_COLORS[m.color]).sort((a,b)=>a.start-b.start);
 const unique=[];
 ordered.forEach(mark=>{if(unique.length&&mark.start<unique[unique.length-1].end)return;unique.push({...mark,id:String(mark.id||'mark-'+mark.start),memo:String(mark.memo||'')});});
 return unique;
}
function highlightMarkup(text,marks){
 let offset=0,html='';
 for(const mark of marks){
  html+=escapeHtml(text.slice(offset,mark.start));
  html+=`<span class="note-highlight" data-annotation-id="${escapeHtml(mark.id)}" style="--highlight:${NOTE_COLORS[mark.color]}">${escapeHtml(text.slice(mark.start,mark.end))}</span>`;
  offset=mark.end;
 }
 return html+escapeHtml(text.slice(offset));
}
function splitNoteUnits(text,granularity){
 const pieces=[];
 if(typeof Intl!=='undefined'&&typeof Intl.Segmenter==='function'){
  const segmenter=new Intl.Segmenter('ko',{granularity:granularity==='char'?'grapheme':'word'});
  for(const item of segmenter.segment(text))pieces.push({start:item.index,end:item.index+item.segment.length,value:item.segment});
 }else{
  if(granularity==='word'){
   const re=/\s+|[^\s]+/gu;
   for(const m of text.matchAll(re))pieces.push({start:m.index,end:m.index+m[0].length,value:m[0]});
  }else{
   let index=0;
   for(const ch of Array.from(text)){pieces.push({start:index,end:index+ch.length,value:ch});index+=ch.length;}
  }
 }
 return pieces;
}
const PDFJS_CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/';
let pdfJsPromise=null;
async function loadPdfTextEngine(){
 if(!pdfJsPromise)pdfJsPromise=import(PDFJS_CDN+'pdf.min.mjs').then(module=>{
  module.GlobalWorkerOptions.workerSrc=PDFJS_CDN+'pdf.worker.min.mjs';
  return module;
 }).catch(err=>{pdfJsPromise=null;throw err;});
 return pdfJsPromise;
}


function extractCourtFields(text){
 const s=String(text||'').normalize('NFKC').replace(/\r/g,'').replace(/[ \t]+/g,' ');
 const unique=a=>{const x=[...new Set(a.filter(Boolean))];return x.length===1?x[0]:''};
 const collect=(re,fn)=>unique([...s.matchAll(re)].map(fn));
 const caseNum=collect(/(?:사건번호|사건)\s*[:：]?\s*(20\d{2})\s*타\s*경\s*(\d{1,10})/g,m=>m[1]+'타경'+m[2]);
 const court=collect(/(?:담당법원|관할법원|법원명|집행법원)\s*[:：]?\s*([가-힣]{2,20}(?:지방법원|지원|고등법원))/g,m=>m[1]);
 function amount(label){
  const re=new RegExp('(?:'+label+')\\s*[:：]?\\s*([0-9][0-9,]{2,17})\\s*원','g');
  const value=collect(re,m=>{const n=Number(m[1].replace(/,/g,''));return Number.isSafeInteger(n)&&n>0?String(n):''});
  return value?Number(value):null;
 }
 const date=collect(/(?:매각기일|입찰기일)\s*[:：]?\s*(20\d{2})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/g,m=>{
  const y=Number(m[1]),mo=Number(m[2]),day=Number(m[3]),d=new Date(y,mo-1,day);
  return d.getFullYear()===y&&d.getMonth()+1===mo&&d.getDate()===day?y+'-'+String(mo).padStart(2,'0')+'-'+String(day).padStart(2,'0'):'';
 });
 const address=collect(/(?:소재지|소재장소)\s*[:：]?\s*([^\n]{8,140})/g,m=>m[1].trim());
 return {caseNum,court,valueWon:amount('감정평가액|감정가'),minWon:amount('최저매각가격|최저입찰가|최저매각가'),date,address};
}
async function readAuctionPdfFields(file){
 if(!file||file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name))throw Error('PDF 파일을 선택해 주세요.');
 if(file.size>12*1024*1024)throw Error('12MB 이하 PDF를 선택해 주세요.');
 const engine=await loadPdfTextEngine();
 const pdf=await engine.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 try{
  const lines=[];
  for(let p=1;p<=Math.min(pdf.numPages,15);p++){
   const page=await pdf.getPage(p);
   const content=await page.getTextContent();
   lines.push(content.items.map(x=>String(x.str||'')+(x.hasEOL?'\n':' ')).join(''));
  }
  const text=lines.join('\n');
  if(text.trim().length<12)throw Error('스캔 PDF는 글자 인식(OCR)이 필요해요.');
  return {fields:extractCourtFields(text),readPages:Math.min(15,pdf.numPages),totalPages:pdf.numPages};
 }finally{await pdf.destroy();}
}

function pdfSearchIndex(value){
 // Ignore PDF extractor-inserted spaces, line breaks and zero-width characters,
 // but preserve original UTF-16 offsets to show the matching excerpt.
 const text=String(value||'');
 let folded='',positions=[],ends=[],cursor=0;
 for(const symbol of text){
  const start=cursor;cursor+=symbol.length;
  if(/[\s\u200B-\u200D\u2060\uFEFF]/u.test(symbol))continue;
  const chars=symbol.normalize('NFKC').toLocaleLowerCase('ko');
  for(let i=0;i<chars.length;i++){folded+=chars[i];positions.push(start);ends.push(cursor);}
 }
 return {folded,positions,ends};
}

const PDF_LAST_PAGE_PREFIX='auction_pdf_last_page_v1:';
function getPdfLastPage(fileId){
 if(!fileId)return 1;
 try{
  const data=JSON.parse(localStorage.getItem(PDF_LAST_PAGE_PREFIX+fileId)||'null');
  return Number.isSafeInteger(data?.page)&&data.page>0?data.page:1;
 }catch{return 1;}
}
function rememberPdfLastPage(fileId,pageNumber){
 if(!fileId||!Number.isSafeInteger(pageNumber)||pageNumber<1)return;
 try{localStorage.setItem(PDF_LAST_PAGE_PREFIX+fileId,JSON.stringify({page:pageNumber,updatedAt:Date.now()}));}
 catch(error){/* Reading position is optional. Do not block PDF viewing when storage is full. */}
}
function createAttachmentViewer(){
 const overlay=$('#attachmentViewer'),content=$('#attachmentViewerContent'),bar=$('#attachmentViewerName'),zoom=$('#attachmentViewerZoom'),pdfControls=$('#attachmentPdfControls');
 // Mount outside the scrolling/transformed app so iOS fixed positioning uses the actual viewport.
 const overlayHome=overlay.parentNode;
 function mountViewer(){if(overlay.parentNode!==document.body)document.body.appendChild(overlay);}
 function restoreViewer(){if(overlayHome.isConnected&&overlay.parentNode!==overlayHome)overlayHome.appendChild(overlay);}
 const extractActions=$('#attachmentExtractActions'),extractToggle=$('#attachmentExtractToggle'),extractInsert=$('#attachmentExtractInsert'),extractHint=$('#attachmentExtractHint');
 let url=null,scale=1,page=1,currentFile=null,loadedBlob=null,pdfDocument=null,extractMode=false,extractText='',extractTokens=[],firstToken=null,lastToken=null,viewerSeq=0,renderSeq=0,renderTask=null,pdfAvailable=false;
 const searchPanel=$('#attachmentSearchPanel'),searchResults=$('#attachmentSearchResults'),searchStatus=$('#attachmentSearchStatus'),searchQuery=$('#attachmentSearchQuery');
 let searchSeq=0;
 function cancelRendering(){
  renderSeq++;
  if(renderTask){try{renderTask.cancel();}catch(error){}renderTask=null;}
 }
 function resetExtract(){
  pdfDocument=null;pdfAvailable=false;extractMode=false;extractText='';extractTokens=[];firstToken=null;lastToken=null;
  extractActions.hidden=true;extractInsert.hidden=true;extractHint.hidden=true;extractToggle.textContent='문장 선택';
 }
 function close(){
  viewerSeq++;searchSeq++;cancelRendering();
  searchPanel.hidden=true;searchQuery.value='';searchResults.replaceChildren();
  $('#attachmentSearchOpen').hidden=true;
  overlay.hidden=true;content.replaceChildren();
  if(url){URL.revokeObjectURL(url);url=null;}
  const pagePicker=$('#attachmentPagePicker');if(pagePicker)pagePicker.hidden=true;
  if(currentFile&&(currentFile.type==='application/pdf'||/\.pdf$/i.test(currentFile.name)))rememberPdfLastPage(currentFile.id,page);
  currentFile=null;loadedBlob=null;resetExtract();document.body.classList.remove('attachment-viewing');restoreViewer();
 }
 function updatePageControls(){
  const max=pdfDocument?.numPages||0;
  $('#attachmentPdfPage').textContent=page+(max?' / '+max:'')+'페이지';
  $('#attachmentPdfJump').textContent=String(page);
  $('#attachmentPdfTotal').textContent='/ '+(max||'?');
  $('#attachmentPdfPrev').disabled=page<=1;
  $('#attachmentPdfNext').disabled=max>0&&page>=max;
 }
 function showZoomControls(isPdf){
  zoom.hidden=false;
  $('#attachmentZoomValue').textContent=Math.round(scale*100)+'%';
  $('#attachmentZoomReset').textContent='맞춤';
 }
 function setZoom(next){
  scale=Math.min(3,Math.max(1,Math.round(next*10)/10));
  const img=content.querySelector('img');
  if(img){img.style.width=scale*100+'%';img.style.maxWidth='none';}
  $('#attachmentZoomValue').textContent=Math.round(scale*100)+'%';
  if(pdfAvailable&&!extractMode)renderPdfPage();
 }
 function fallbackPdf(){
  if(!url||!currentFile)return;
  pdfAvailable=false;cancelRendering();content.replaceChildren();
  const frame=document.createElement('iframe');
  frame.className='attachment-pdf-frame';frame.title=currentFile.name;frame.src=url+'#page='+page+'&view=FitH';
  content.appendChild(frame);zoom.hidden=true;
  extractHint.hidden=false;extractHint.textContent='기본 PDF 뷰어로 표시 중 · 페이지 이동은 기기에 따라 제한될 수 있어요.';
  extractToggle.textContent='문장 선택';
 }
 async function openPdfDocument(){
  if(pdfDocument)return pdfDocument;
  const initial=viewerSeq,fileId=currentFile?.id;
  const engine=await loadPdfTextEngine();
  if(initial!==viewerSeq||currentFile?.id!==fileId)throw Error('첨부파일 화면이 변경됐어요.');
  const bytes=new Uint8Array(await loadedBlob.arrayBuffer());
  if(initial!==viewerSeq||currentFile?.id!==fileId)throw Error('첨부파일 화면이 변경됐어요.');
  const doc=await engine.getDocument({data:bytes}).promise;
  if(initial!==viewerSeq||currentFile?.id!==fileId){try{await doc.destroy();}catch(e){}throw Error('첨부파일 화면이 변경됐어요.');}
  pdfDocument=doc;pdfAvailable=true;
  page=Math.max(1,Math.min(page,doc.numPages));updatePageControls();
  return doc;
 }
 async function renderPdfPage(){
  if(!pdfDocument||!currentFile||extractMode)return;
  cancelRendering();
  const seq=viewerSeq,request=renderSeq,fileId=currentFile.id,pageNo=page;
  extractHint.hidden=true;
  const loading=document.createElement('div');loading.className='attachment-pdf-loading';loading.textContent='PDF '+pageNo+'페이지를 표시하는 중…';
  content.replaceChildren(loading);
  try{
   const pdfPage=await pdfDocument.getPage(pageNo);
   if(seq!==viewerSeq||request!==renderSeq||currentFile?.id!==fileId||extractMode)return;
   const natural=pdfPage.getViewport({scale:1});
   const containerWidth=Math.max(240,content.clientWidth-18);
   const fitWidth=containerWidth/natural.width;
   const viewport=pdfPage.getViewport({scale:fitWidth*scale});
   const dpr=Math.min(window.devicePixelRatio||1,2);
   const canvas=document.createElement('canvas');
   canvas.className='attachment-pdf-canvas';
   canvas.width=Math.ceil(viewport.width*dpr);
   canvas.height=Math.ceil(viewport.height*dpr);
   canvas.style.width=Math.ceil(viewport.width)+'px';
   canvas.style.height=Math.ceil(viewport.height)+'px';
   const ctx=canvas.getContext('2d');
   if(!ctx)throw Error('캔버스 표시 불가');
   ctx.setTransform(dpr,0,0,dpr,0,0);
   content.replaceChildren(canvas);
   content.scrollTop=0;content.scrollLeft=0;
   renderTask=pdfPage.render({canvasContext:ctx,viewport,canvas});
   await renderTask.promise;
   if(seq===viewerSeq&&request===renderSeq)renderTask=null;
  }catch(err){
   if(seq!==viewerSeq||request!==renderSeq||err?.name==='RenderingCancelledException')return;
   content.innerHTML='<div class="attachment-extract-empty">이 페이지를 표시하지 못했어요. 다시 시도하거나 파일을 내보내 주세요.</div>';
  }
 }
 function selectedRange(){
  if(firstToken===null||lastToken===null)return null;
  const left=Math.min(firstToken,lastToken),right=Math.max(firstToken,lastToken);
  return {start:extractTokens[left].start,end:extractTokens[right].end};
 }
 function drawExtractedPage(){
  content.replaceChildren();
  const paper=document.createElement('div');paper.className='attachment-extracted-page';
  for(let i=0;i<extractTokens.length;i++){
   const token=extractTokens[i],span=document.createElement('span');
   span.textContent=token.value;
   if(!/^\s+$/u.test(token.value)){
    span.className='attachment-extract-word';
    const range=selectedRange();
    if(range&&token.start<range.end&&token.end>range.start)span.classList.add('selected');
    else if(firstToken===i&&lastToken===null)span.classList.add('selected');
    span.dataset.token=String(i);
    span.onclick=()=>{
     if(firstToken===null||lastToken!==null){firstToken=i;lastToken=null;}else lastToken=i;
     drawExtractedPage();
    };
   }
   paper.appendChild(span);
  }
  content.appendChild(paper);
  const range=selectedRange();
  extractInsert.hidden=!range;
  extractHint.hidden=false;
  extractHint.textContent=range?'선택 완료 · 노트로 가져오기를 누르세요.':firstToken!==null?'마지막 단어를 터치하세요.':'가져올 문장의 첫 단어와 마지막 단어를 차례로 터치하세요.';
 }
 async function showExtractedPage(){
  if(!pdfDocument||!currentFile)return;
  cancelRendering();
  const sequence=viewerSeq,fileId=currentFile.id,pageNo=page,request=renderSeq;
  extractHint.hidden=false;extractHint.textContent='PDF '+pageNo+'페이지에서 문장을 추출하는 중…';
  extractInsert.hidden=true;content.replaceChildren();
  try{
   const pdfPage=await pdfDocument.getPage(pageNo);
   const textContent=await pdfPage.getTextContent();
   if(sequence!==viewerSeq||request!==renderSeq||currentFile?.id!==fileId||!extractMode)return;
   extractText=textContent.items.map(item=>String(item.str||'')+(item.hasEOL?'\n':' ')).join('').replace(/[ \t]+\n/g,'\n').trim();
   extractTokens=splitNoteUnits(extractText,'word');
   firstToken=null;lastToken=null;
   if(!extractText){
    content.innerHTML='<div class="attachment-extract-empty">이 페이지에서 선택할 수 있는 문장을 찾지 못했어요.<p>스캔 PDF라면 별도의 문자 인식(OCR)이 필요해요.</p></div>';
    extractHint.textContent='문장 추출 불가 · PDF 보기로 돌아갈 수 있어요.';
    return;
   }
   drawExtractedPage();
  }catch(err){
   if(sequence!==viewerSeq||request!==renderSeq)return;
   content.innerHTML='<div class="attachment-extract-empty">이 페이지의 글자를 읽을 수 없어요. 다른 페이지나 PDF 보기로 돌아가 주세요.</div>';
   extractHint.textContent='PDF 텍스트 추출 실패';
  }
 }
 async function startExtraction(){
  if(!currentFile||!loadedBlob)return;
  const sequence=viewerSeq,fileId=currentFile.id;
  extractMode=true;extractToggle.disabled=true;
  extractHint.hidden=false;extractHint.textContent='PDF 문자 분석 기능을 불러오는 중…';
  try{
   await openPdfDocument();
   if(sequence!==viewerSeq||currentFile?.id!==fileId)return;
   zoom.hidden=true;
   await showExtractedPage();extractToggle.textContent='PDF 보기';
  }catch(err){
   if(sequence!==viewerSeq)return;
   extractMode=false;
   if(pdfAvailable){showZoomControls(true);renderPdfPage();}
   else fallbackPdf();
   toast('PDF 문자 분석에 실패했어요. 인터넷 연결을 확인해 주세요.');
  }finally{extractToggle.disabled=false;}
 }
 function pageChange(delta){
  if(!currentFile||!(currentFile.type==='application/pdf'||/\.pdf$/i.test(currentFile.name)))return;
  const max=pdfDocument?.numPages||10000;
  const next=Math.max(1,Math.min(max,page+delta));
  if(next===page)return;
  page=next;rememberPdfLastPage(currentFile.id,page);updatePageControls();
  if(extractMode)showExtractedPage();
  else if(pdfAvailable)renderPdfPage();
  else fallbackPdf();
 }
 function closeSearch(){
  searchSeq++;
  searchPanel.hidden=true;
  searchQuery.value='';
  searchResults.replaceChildren();
  searchStatus.textContent='검색어를 입력해 주세요.';
  searchQuery.blur();
 }
 $('#attachmentSearchOpen').onclick=()=>{
  if(!currentFile||!(currentFile.type==='application/pdf'||/\.pdf$/i.test(currentFile.name)))return;
  // Each opening starts a new search session with a blank input and empty results.
  searchSeq++;
  searchQuery.value='';
  searchResults.replaceChildren();
  searchStatus.textContent='검색어를 입력해 주세요.';
  searchPanel.hidden=false;
  searchQuery.focus();
 };
 $('#attachmentSearchClose').onclick=closeSearch;
 $('#attachmentSearchForm').onsubmit=async event=>{
  event.preventDefault();
  const query=searchQuery.value.trim();
  if(!query){searchStatus.textContent='검색어를 입력해 주세요.';return;}
  const sequence=++searchSeq,fileId=currentFile?.id;
  searchResults.replaceChildren();
  searchStatus.textContent='PDF 문서에서 검색 중…';
  try{
   const doc=await openPdfDocument();
   if(sequence!==searchSeq||!currentFile||currentFile.id!==fileId)return;
   const lowerQuery=pdfSearchIndex(query).folded;
   if(!lowerQuery){searchStatus.textContent='검색할 글자를 입력해 주세요.';return;}
   let hits=0,scanned=0,stop=false;
   const fragment=document.createDocumentFragment();
   for(let i=1;i<=doc.numPages;i++){
    if(sequence!==searchSeq||!currentFile||currentFile.id!==fileId)return;
    const pdfPage=await doc.getPage(i);
    const textData=await pdfPage.getTextContent();
    if(sequence!==searchSeq||!currentFile||currentFile.id!==fileId)return;
    const whole=textData.items.map(item=>String(item.str||'')+(item.hasEOL?'\n':' ')).join('').replace(/[ \t]+/g,' ');
    const indexed=pdfSearchIndex(whole);
    let index=0,from=0;
    while((index=indexed.folded.indexOf(lowerQuery,from))!==-1){
     const matchStart=indexed.positions[index];
     const matchEnd=indexed.ends[index+lowerQuery.length-1];
     const fromSnippet=Math.max(0,matchStart-28),toSnippet=Math.min(whole.length,matchEnd+50);
     const snippet=whole.slice(fromSnippet,toSnippet).replace(/\s+/g,' ');
     const button=document.createElement('button');
     button.type='button';button.className='attachment-search-hit';
     const number=document.createElement('strong');number.textContent=i+'페이지';
     const excerpt=document.createElement('span');excerpt.textContent=snippet;
     button.append(number,excerpt);
     button.onclick=()=>{
      closeSearch();page=i;rememberPdfLastPage(currentFile.id,page);updatePageControls();
      if(extractMode)showExtractedPage();else if(pdfAvailable)renderPdfPage();else fallbackPdf();
     };
     fragment.appendChild(button);
     hits++;from=index+Math.max(1,lowerQuery.length);
     if(hits>=80){stop=true;break;}
    }
    scanned=i;
    if(i%8===0)searchStatus.textContent=i+' / '+doc.numPages+'페이지 검색 중…';
    if(stop)break;
   }
   if(sequence!==searchSeq||!currentFile||currentFile.id!==fileId)return;
   searchResults.replaceChildren(fragment);
   searchStatus.textContent=hits===0
    ?'일치하는 문장을 찾지 못했어요. 띄어쓰기는 무시해서 검색했으며, 스캔 문서는 문자 인식이 필요해요.'
    :hits+'개 검색 결과 · '+scanned+'/'+doc.numPages+'페이지 확인'+(stop?' · 처음 80개만 표시':'');
  }catch(err){
   if(sequence!==searchSeq)return;
   searchStatus.textContent='PDF 검색에 실패했어요. 인터넷 연결이나 문서 상태를 확인해 주세요.';
  }
 };
 $('#attachmentViewerClose').onclick=close;
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 $('#attachmentZoomIn').onclick=()=>setZoom(scale+.5);
 $('#attachmentZoomOut').onclick=()=>setZoom(scale-.5);
 $('#attachmentZoomReset').onclick=()=>setZoom(1);
 $('#attachmentPdfPrev').onclick=()=>pageChange(-1);
 $('#attachmentPdfNext').onclick=()=>pageChange(1);

 const picker=$('#attachmentPagePicker'),wheel=$('#attachmentPickerWheel'),pickerStatus=$('#attachmentPickerStatus');
 const WHEEL_ROW=44;
 let pickerValue=1;
 function pickerSelectedPage(){
  const max=pdfDocument?.numPages||1;
  return Math.max(1,Math.min(max,Math.round(wheel.scrollTop/WHEEL_ROW)+1));
 }
 function updatePickerState(){
  pickerValue=pickerSelectedPage();
  pickerStatus.textContent=pickerValue+' / '+pdfDocument.numPages+'페이지';
  wheel.querySelectorAll('.attachment-picker-item.selected').forEach(el=>el.classList.remove('selected'));
  const selected=wheel.children[pickerValue-1];
  if(selected){selected.classList.add('selected');wheel.setAttribute('aria-activedescendant',selected.id);}
 }
 function dismissPicker(){picker.hidden=true;}
 function openPicker(){
  if(!pdfDocument){toast('PDF 페이지 정보를 불러온 뒤 선택할 수 있어요.');return;}
  const count=pdfDocument.numPages;
  const fragment=document.createDocumentFragment();
  for(let i=1;i<=count;i++){
   const el=document.createElement('button');
   el.type='button';el.className='attachment-picker-item';el.id='attachmentPickerPage'+i;
   el.setAttribute('role','option');el.textContent=String(i);
   el.onclick=()=>wheel.scrollTo({top:(i-1)*WHEEL_ROW,behavior:'smooth'});
   fragment.appendChild(el);
  }
  wheel.replaceChildren(fragment);
  picker.hidden=false;
  wheel.scrollTop=(page-1)*WHEEL_ROW;
  updatePickerState();
 }
 wheel.addEventListener('scroll',updatePickerState,{passive:true});
 picker.addEventListener('click',event=>{if(event.target===picker)dismissPicker();});
 $('#attachmentPickerCancel').onclick=dismissPicker;
 $('#attachmentPickerDone').onclick=()=>{
  const selected=pickerSelectedPage();
  dismissPicker();
  if(selected===page)return;
  page=selected;rememberPdfLastPage(currentFile.id,page);updatePageControls();
  if(extractMode)showExtractedPage();
  else if(pdfAvailable)renderPdfPage();
  else fallbackPdf();
 };
 $('#attachmentPdfJump').onclick=openPicker;
 $('#attachmentPdfGo').onclick=openPicker;
 extractToggle.onclick=()=>{
  if(extractMode){
   extractMode=false;cancelRendering();
   extractToggle.textContent='문장 선택';extractInsert.hidden=true;extractHint.hidden=true;
   showZoomControls(true);renderPdfPage();
  }else startExtraction();
 };
 extractInsert.onclick=()=>{
  const range=selectedRange();if(!range||!extractText)return;
  const quote=extractText.slice(range.start,range.end).trim();if(!quote)return;
  const source={fileId:currentFile?.id||'',filename:currentFile?.name||'PDF',page};
  close();
  const editor=activeNoteEditor;
  if(editor&&typeof editor.appendFromPdf==='function')editor.appendFromPdf(quote,source);
  else toast('공부 노트를 열고 다시 시도해 주세요.');
 };
 $('#attachmentViewerExport').onclick=()=>{
  if(!currentFile||!url)return;
  const a=document.createElement('a');a.href=url;a.download=currentFile.name||'첨부파일';a.rel='noopener';
  document.body.appendChild(a);a.click();a.remove();
  toast('파일 저장 화면이 열리지 않으면 공유 메뉴를 이용해 주세요.');
 };
 content.addEventListener('touchstart',event=>{
  if(event.touches.length!==2||!content.querySelector('img'))return;
  content.dataset.pinchStart=String(Math.hypot(event.touches[0].clientX-event.touches[1].clientX,event.touches[0].clientY-event.touches[1].clientY));
  content.dataset.pinchScale=String(scale);
 },{passive:true});
 content.addEventListener('touchmove',event=>{
  if(event.touches.length!==2||!content.querySelector('img'))return;
  const distance=Math.hypot(event.touches[0].clientX-event.touches[1].clientX,event.touches[0].clientY-event.touches[1].clientY);
  const base=Number(content.dataset.pinchStart);
  if(base>0){event.preventDefault();setZoom(Number(content.dataset.pinchScale)*distance/base);}
 },{passive:false});
 return {
  async open(file,initialPage=null){
   if(!file||typeof file.data!=='string')return toast('첨부파일을 찾지 못했어요.');
   close();currentFile=file;
   const sequence=viewerSeq;bar.textContent=file.name;
   // An explicit source-page link always wins; normal attachment opens resume reading.
   const requested=initialPage===null?getPdfLastPage(file.id):Number(initialPage);
   page=Math.max(1,Math.floor(Number.isFinite(requested)?requested:1));scale=1;
   mountViewer();content.replaceChildren();zoom.hidden=true;pdfControls.hidden=true;overlay.hidden=false;document.body.classList.add('attachment-viewing');
   try{
    const response=await fetch(file.data),blob=await response.blob();
    if(sequence!==viewerSeq||currentFile?.id!==file.id)return;
    loadedBlob=blob;url=URL.createObjectURL(blob);
    const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
    $('#attachmentSearchOpen').hidden=!isPdf;
    if(isPdf){
     extractActions.hidden=false;pdfControls.hidden=false;
     extractHint.hidden=false;extractHint.textContent='PDF 페이지 정보를 불러오는 중…';
     updatePageControls();
     try{
      await openPdfDocument();
      if(sequence!==viewerSeq||currentFile?.id!==file.id)return;
      showZoomControls(true);await renderPdfPage();
     }catch(err){
      if(sequence!==viewerSeq)return;
      fallbackPdf();
      toast('PDF 전용 뷰어를 불러오지 못해 기본 뷰어로 열었어요.');
     }
    }else{
     const img=document.createElement('img');img.className='attachment-preview-image';img.alt=file.name;img.src=url;
     content.appendChild(img);showZoomControls(false);setZoom(1);
    }
   }catch(err){
    if(sequence!==viewerSeq)return;
    content.textContent='미리보기를 열 수 없어요. 파일 내보내기를 이용해 주세요.';
    toast('첨부파일 미리보기 실패');
   }
  },close
 };
}
function createAttachmentEditor(){
 const input=$('#noteAttachmentInput'),list=$('#noteAttachmentList'),counter=$('#noteAttachmentCount');
 const viewer=createAttachmentViewer();
 let files=[],ready=false,changed=false;
 const noteId=state.note;
 const init=noteId?attachmentList(noteId):Promise.resolve([]);
 const loaded=init.then(items=>{files=items;ready=true;draw();}).catch(err=>{counter.textContent='파일 저장 기능을 사용할 수 없어요.';throw err;});
 function draw(){
  counter.textContent=files.length+'개 / 최대 '+MAX_NOTE_ATTACH+'개 · 파일당 8MB';
  list.innerHTML=files.map(file=>`<div class="note-file-row"><button type="button" class="note-file-open" data-open-attachment="${escapeHtml(file.id)}"><span>${file.type==='application/pdf'?'▣':'▧'}</span><span class="note-file-title">${escapeHtml(file.name)}</span><small>${(file.size/1024/1024).toFixed(1)}MB</small></button><button type="button" class="note-file-remove" data-remove-attachment="${escapeHtml(file.id)}" aria-label="${escapeHtml(file.name)} 제거">×</button></div>`).join('');
  list.querySelectorAll('[data-remove-attachment]').forEach(btn=>btn.onclick=()=>{files=files.filter(x=>x.id!==btn.dataset.removeAttachment);changed=true;draw();});
  list.querySelectorAll('[data-open-attachment]').forEach(btn=>btn.onclick=()=>{
   const f=files.find(x=>x.id===btn.dataset.openAttachment);if(!f)return;
   viewer.open(f);
  });
 }
 input.onchange=async()=>{
  try{
   await loaded;
   for(const file of Array.from(input.files||[])){
    if(files.length>=MAX_NOTE_ATTACH){toast('노트당 최대 8개까지 첨부할 수 있어요.');break;}
    if(file.size>MAX_FILE_BYTES){toast('8MB 이하의 파일을 선택해 주세요.');continue;}
    if(file.type!=='application/pdf'&&!file.type.startsWith('image/')&&!/\.pdf$/i.test(file.name)){toast('사진 또는 PDF만 첨부할 수 있어요.');continue;}
    files.push({id:attachmentId(),noteId:Number(noteId||0),name:file.name,type:/\.pdf$/i.test(file.name)?'application/pdf':file.type,size:file.size,data:await readFileAsDataUrl(file)});
    changed=true;
   }
   draw();
  }catch(err){toast('첨부파일을 읽지 못했어요.');}
  input.value='';
 };
 draw();
 return {async getFiles(){await loaded;return files;},async openById(fileId,pageNumber){
  await loaded;
  const file=files.find(item=>item.id===fileId);
  if(!file){toast('연결된 PDF 첨부파일이 없어요. 삭제했거나 복원되지 않았을 수 있어요.');return false;}
  if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name)){toast('PDF 파일이 아니에요.');return false;}
  await viewer.open(file,pageNumber);return true;
 },get changed(){return changed;},closeViewer:viewer.close};
}
function normalizePdfSources(value){
 if(!Array.isArray(value))return [];
 return value.filter(x=>x&&typeof x.fileId==='string'&&x.fileId.length>0&&typeof x.filename==='string'&&Number.isInteger(x.page)&&x.page>0)
  .map(x=>({id:String(x.id||'pdf-'+x.fileId+'-'+x.page),fileId:x.fileId,filename:x.filename,page:x.page,quote:String(x.quote||'').slice(0,2500)}))
  .slice(0,200);
}
function initNoteEditor(){
 const note=saved.notes.find(x=>x.id===state.note)||{body:'',annotations:[]};
 const input=$('#noteBody'),reader=$('#noteHighlightText'),editor=$('#noteMarkupArea');
 const writeButton=$('#noteWriteMode'),markButton=$('#noteMarkMode'),popup=$('#stickyBackdrop'),popupMemo=$('#stickyText'),hint=$('#noteSelectionHint');
 let text=String(input.value),marks=normalizeNoteMarks(text,note.annotations),sources=normalizePdfSources(note.sources),first=null,second=null,currentId=null,mode='write',granularity='word';
 const sourcesPanel=$('#notePdfSources');
 function renderPdfSources(){
  sourcesPanel.hidden=sources.length===0;
  sourcesPanel.innerHTML=sources.map((src,i)=>`<div class="note-pdf-source"><button type="button" class="note-pdf-source-open" data-source-index="${i}"><span>▤</span><span class="note-pdf-source-name">${escapeHtml(src.filename)}</span><small>${src.page}페이지 · 원문 보기</small></button><button type="button" class="note-pdf-source-remove" data-remove-source="${i}" aria-label="원문 연결 제거">×</button></div>`).join('');
  sourcesPanel.querySelectorAll('[data-source-index]').forEach(button=>button.onclick=async()=>{
   const src=sources[Number(button.dataset.sourceIndex)];
   if(src&&activeNoteEditor?.attachments)await activeNoteEditor.attachments.openById(src.fileId,src.page);
  });
  sourcesPanel.querySelectorAll('[data-remove-source]').forEach(button=>button.onclick=()=>{
   const index=Number(button.dataset.removeSource);
   if(!confirm('원문 바로가기만 제거할까요? 노트의 문장·형광펜·첨부 PDF 파일은 그대로 보관됩니다.'))return;
   sources.splice(index,1);renderPdfSources();setEditorDirty(true);scheduleNoteDraft();
  });
 }
 renderPdfSources();
 function selectionRange(){
  if(!first||!second)return null;
  const begin=first.start<=second.start?first:second,end=first.start<=second.start?second:first;
  let start=begin.start,finish=end.end;
  while(start<finish&&/\s/u.test(text[start]))start++;
  while(finish>start&&/\s/u.test(text[finish-1]))finish--;
  return finish>start?{start,end:finish}:null;
 }
 function updateHint(){
  if(!text){hint.textContent='먼저 작성 모드에서 본문을 입력하세요.';return;}
  const range=selectionRange();
  hint.textContent=range?'선택 완료 · 원하는 형광펜 색을 눌러주세요.':first?'마지막 '+(granularity==='word'?'단어':'글자')+'를 터치하세요.':'시작 '+(granularity==='word'?'단어':'글자')+'를 한 번 터치하세요.';
 }
 function draw(){
  const range=selectionRange();
  reader.innerHTML='';
  if(!text){reader.innerHTML='<span class="note-read-empty">내용을 작성하면 여기서 터치로 형광펜을 적용할 수 있어요.</span>';updateHint();return;}
  for(const item of splitNoteUnits(text,granularity)){
   const mark=marks.find(m=>item.start<m.end&&item.end>m.start);
   const chosen=range&&item.start<range.end&&item.end>range.start;
   const selectedStart=first&&!second&&item.start===first.start&&item.end===first.end;
   const node=document.createElement('span');
   node.textContent=item.value;
   if(!/^\s+$/u.test(item.value)){
    node.className='note-tap-unit'+(chosen||selectedStart?' note-pending-selection':'')+(mark?' note-highlight':'');
    node.dataset.unitStart=String(item.start);
    node.dataset.unitEnd=String(item.end);
    if(mark){node.dataset.annotationId=mark.id;node.style.setProperty('--highlight',NOTE_COLORS[mark.color]);}
    node.setAttribute('role','button');
    node.setAttribute('tabindex','0');
   }
   reader.appendChild(node);
  }
  updateHint();
 }
 function openSticky(id){
  const mark=marks.find(m=>m.id===id);if(!mark)return;
  currentId=id;$('#stickyQuote').textContent='“'+text.slice(mark.start,mark.end)+'”';
  popupMemo.value=mark.memo||'';popup.hidden=false;popupMemo.focus();
 }
 function closeSticky(){popup.hidden=true;currentId=null;}
 function clearSelection(){first=null;second=null;draw();}
 function toMark(){
  const next=input.value,oldLength=marks.length;
  marks=normalizeNoteMarks(next,reconcileNoteMarks(text,next,marks));text=next;
  if(marks.length<oldLength)toast('본문 수정으로 일부 형광펜 표시가 해제됐어요.');
  mode='mark';input.hidden=true;editor.hidden=false;
  markButton.classList.add('active');writeButton.classList.remove('active');
  first=null;second=null;draw();
 }
 function toWrite(){
  mode='write';input.hidden=false;editor.hidden=true;input.value=text;
  markButton.classList.remove('active');writeButton.classList.add('active');
  first=null;second=null;closeSticky();
 }
 writeButton.onclick=toWrite;markButton.onclick=toMark;
 $('#noteClearSelection').onclick=clearSelection;
 document.querySelectorAll('[data-note-granularity]').forEach(button=>button.onclick=()=>{
  granularity=button.dataset.noteGranularity;
  document.querySelectorAll('[data-note-granularity]').forEach(b=>b.classList.toggle('unit-active',b===button));
  first=null;second=null;draw();
 });
 reader.addEventListener('click',event=>{
  const node=event.target.closest('[data-unit-start]');if(!node||!reader.contains(node))return;
  if(node.dataset.annotationId){openSticky(node.dataset.annotationId);return;}
  const point={start:Number(node.dataset.unitStart),end:Number(node.dataset.unitEnd)};
  if(!first||second){first=point;second=null;}
  else second=point;
  draw();
 });
 reader.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){const node=event.target.closest('[data-unit-start]');if(node){event.preventDefault();node.click();}}});
 reader.addEventListener('contextmenu',event=>event.preventDefault());
 document.querySelectorAll('[data-note-color]').forEach(button=>{
  button.onclick=()=>{
   const range=selectionRange();
   if(!range){toast('시작과 끝을 차례로 터치해 주세요.');return;}
   if(marks.some(m=>range.start<m.end&&range.end>m.start)){toast('기존 형광펜과 겹치지 않도록 선택해 주세요.');return;}
   const mark={id:'mark-'+Date.now()+'-'+Math.floor(Math.random()*1000000),start:range.start,end:range.end,color:button.dataset.noteColor,memo:''};
   marks=normalizeNoteMarks(text,[...marks,mark]);first=null;second=null;draw();openSticky(mark.id);
  };
 });
 $('#stickyClose').onclick=closeSticky;
 popup.addEventListener('click',event=>{if(event.target===popup)closeSticky();});
 $('#stickySave').onclick=()=>{
  const mark=marks.find(m=>m.id===currentId);
  if(mark)mark.memo=popupMemo.value;
  closeSticky();toast('포스트잇을 반영했어요. 노트 저장을 눌러 보관하세요.');
 };
 $('#stickyRemove').onclick=()=>{marks=marks.filter(m=>m.id!==currentId);closeSticky();draw();toast('형광펜 표시를 제거했어요.');};
 draw();
 return {getData(){
  if(mode==='write'){const next=input.value;marks=normalizeNoteMarks(next,reconcileNoteMarks(text,next,marks));text=next;}
  return {body:text,annotations:marks,sources:sources.map(x=>({...x}))};
 },appendFromPdf(quote,source){
  if(mode==='write')toMark();
  const label='[PDF: '+String(source.filename||'문서')+' · '+source.page+'페이지]';
  const separator=text?'\n\n':'',start=text.length+separator.length+label.length+1;
  text+=separator+label+'\n'+quote;
  const marker={id:'mark-'+Date.now()+'-'+Math.floor(Math.random()*1000000),start,end:start+quote.length,color:'yellow',memo:''};
  marks=normalizeNoteMarks(text,[...marks,marker]);
  input.value=text;first=null;second=null;
  if(source.fileId){
   sources.push({id:'pdf-'+Date.now()+'-'+Math.floor(Math.random()*1000000),fileId:source.fileId,filename:String(source.filename||'PDF'),page:Number(source.page)||1,quote:quote.slice(0,2500)});
   renderPdfSources();
  }
  draw();openSticky(marker.id);
  setEditorDirty(true);scheduleNoteDraft();
 },setData(data){
  text=String(data.body||'');
  marks=normalizeNoteMarks(text,data.annotations);
  sources=normalizePdfSources(data.sources);
  renderPdfSources();
  input.value=text;first=null;second=null;
  draw();
 }};

}


function capitalPriceHistoryMarkup(item){
 const data=capitalPriceHistory;
 if(!data||data.schemaVersion!==1||data.kind!=='observed_snapshot_prices'||
  data.legalStatusVerified!==false||!Array.isArray(data.events))
  return '<p class="helper">수집값 변동 기록을 확인하지 못했습니다. 법원 원문에서 확인하세요.</p>';
 const events=data.events.filter(e=>e.id===item.id&&
  Number.isSafeInteger(e.previousMinimumWon)&&e.previousMinimumWon>0&&
  Number.isSafeInteger(e.currentMinimumWon)&&e.currentMinimumWon>0&&
  Number.isFinite(Date.parse(e.fromSnapshotAt))&&Number.isFinite(Date.parse(e.toSnapshotAt))&&
  Date.parse(e.fromSnapshotAt)<Date.parse(e.toSnapshotAt)&&
  Date.parse(e.toSnapshotAt)<=Date.parse(capitalSnapshot.fetchedAt)).slice(0,4);
 if(!events.length)
  return '<p class="helper">기록된 최저가 변경 없음 · 이전 수집범위 밖의 가격 변동까지 확인한 것은 아닙니다.</p>';
 return '<div class="capital-price-history">'+
  events.map(e=>'<div class="capital-history-event"><small>이전 수집 '+escapeHtml(e.fromSnapshotAt.slice(0,10))+
   ' → 새 수집 '+escapeHtml(e.toSnapshotAt.slice(0,10))+'</small><div>'+
   escapeHtml(prettyPrice(e.previousMinimumWon))+' → <strong>'+escapeHtml(prettyPrice(e.currentMinimumWon))+
   '</strong></div></div>').join('')+
  '<p class="helper">서로 다른 수집시점의 값 차이입니다. 유찰·낙찰·취하나 법적 상태를 확인한 결과가 아닙니다.</p></div>';
}

function capital(){
 const snapshot=capitalSnapshot;
 const allItems=Array.isArray(snapshot?.items)?snapshot.items:[];
 const reviewing=Boolean(state.capitalReviewDate&&state.capitalReviewStage);
 const report=reviewing&&verificationPlanStatus==='ready'?verificationPlan.days.find(x=>x.date===state.capitalReviewDate):null;
 const validStages=['precheck','sale_day','result_check','result_recheck','final_followup'];
 const aligned=Boolean(report&&validStages.includes(state.capitalReviewStage)&&snapshot?.validation?.passed===true&&
  snapshot.fetchedAt===verificationPlan.sourceSnapshotAt&&snapshot.items.length===verificationPlan.snapshotItems&&
  verificationPlan.legalStatusVerified===false&&verificationPlan.automaticCourtRequests===0);
 const ids=aligned?new Set(report[state.capitalReviewStage]):new Set();
 const focusId=typeof state.capitalFocusId==='string'&&/^court-B\d{6}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(state.capitalFocusId)?state.capitalFocusId:'';
 const focusing=Boolean(focusId);
 const sourceVerified=snapshot?.validation?.passed===true;
 const items=focusing?(sourceVerified?allItems.filter(x=>x.id===focusId):[]):reviewing?(aligned?allItems.filter(x=>ids.has(x.id)):[]):allItems;
 const reviewLabel=reviewing?state.capitalReviewDate+' · '+({precheck:'입찰 전 확인',sale_day:'입찰 당일 점검',result_check:'결과조회 예정',result_recheck:'재검사 예정',final_followup:'최종 추적'}[state.capitalReviewStage]||'검증 예정'):'';
 const region=state.capitalRegion,query=state.capitalQuery.trim().normalize('NFC').toLocaleLowerCase('ko');
 const componentsFor=x=>Array.isArray(x.components)&&x.components.length?x.components:[{address:x.address,largeCode:x.largeCode,mediumCode:x.mediumCode,smallCode:x.smallCode}];
 const presentCodes=new Set(items.filter(x=>region==='전체'||x.region===region).flatMap(x=>componentsFor(x).map(c=>c.smallCode)).filter(Boolean));
 const preferred=['20104','20101','20102','20105','20106','20108','10108','20110','21101','21104'];
 const available=COURT_USAGE_CATALOG.filter(x=>x.level==='small'&&presentCodes.has(x.code));
 const sortedTypes=available.sort((a,b)=>{
  const ia=preferred.indexOf(a.code),ib=preferred.indexOf(b.code);
  return (ia<0?999:ia)-(ib<0?999:ib)||a.name.localeCompare(b.name,'ko');
 });
 const typeOptions=[{code:'전체',name:'전체 물건'},...sortedTypes];
 if(items.some(x=>(region==='전체'||x.region===region)&&componentsFor(x).every(c=>!COURT_USAGE_CATALOG.some(z=>z.level==='small'&&z.code===c.smallCode))))typeOptions.push({code:'미확인',name:'분류 미확인'});
 const isType=x=>state.capitalType==='전체'||(state.capitalType==='미확인'
  ?componentsFor(x).every(c=>!COURT_USAGE_CATALOG.some(t=>t.level==='small'&&t.code===c.smallCode))
  :componentsFor(x).some(c=>c.smallCode===state.capitalType));
 const matched=items.filter(x=>(region==='전체'||x.region===region)&&isType(x)&&
  (!query||[x.address,x.caseNo,x.courtName,x.itemNo,...componentsFor(x).map(c=>c.address)].some(v=>String(v||'').normalize('NFC').toLocaleLowerCase('ko').includes(query))));
 const groupedMap=new Map();
 for(const x of matched){const k=x.courtCode+'|'+x.caseNo;if(!groupedMap.has(k))groupedMap.set(k,[]);groupedMap.get(k).push(x);}
 const grouped=[...groupedMap.values()];
 const renderCapitalProperty=(x,caseHeader)=>{

  const components=componentsFor(x);
  const entry=COURT_USAGE_CATALOG.find(t=>t.level==='small'&&t.code===x.smallCode);
  const category=components.length>1?'복합물건':entry?entry.name:'분류 미확인';
  const partList=components.length>1?`<details class="capital-components"><summary>구성요소 ${components.length}개 · 토지·건물·소재지 펼치기</summary>${components.map(c=>{
   const kind=COURT_USAGE_CATALOG.find(t=>t.level==='small'&&t.code===c.smallCode)?.name||'분류 미확인';
   return `<p class="helper">${escapeHtml(kind)} · ${escapeHtml(c.address)}</p>`;
  }).join('')}</details>`:'';
  return `<div class="capital-property">${focusing&&x.id===focusId?'<div class="capital-focus-found">✓ 관심 저장한 물건번호 '+escapeHtml(x.itemNo)+'번 · 수집본에서 정확히 일치</div>':''}<div class="auction-card-top"><span class="auction-type">${escapeHtml(category)}</span><span class="auction-demo user-record">법원 수집 · 시범</span></div>
   <p class="capital-lot-label"><strong>물건 ${escapeHtml(x.itemNo)}번</strong>${components.length>1?' · 복합물건':''}</p>${x.address!==caseHeader.address?'<p class="capital-lot-address">'+escapeHtml(x.address)+'</p>':''}${partList}
   <div class="line"><span class="muted">감정평가액</span><strong>${escapeHtml(formatAmount(x.appraisalWon))}</strong></div>
   <div class="line"><span class="muted">최저매각가</span><strong>${escapeHtml(formatAmount(x.minimumWon))}</strong></div>
   <div class="line"><span class="muted">매각기일</span><strong>${escapeHtml(x.saleDate||'미확인')} · ${escapeHtml(auctionDday(x.saleDate))}</strong></div>
   <div class="capital-status-note"><strong>진행상태 · 미확인</strong><span>취하·기일변경·매각 여부는 법원 원문 확인 필요</span></div>
   <button type="button" class="secondary full-secondary court-favorite-toggle" data-court-favorite-toggle="${escapeHtml(x.id)}">${courtFavorites().some(f=>f.id===x.id)?'♥ 관심물건 해제':'♡ 관심물건 저장'}</button>
   ${auctionFold('지도·로드뷰 확인',auctionMapControls(x.address,'법원 수집 주소 기준 · 정확한 위치 확인 필요'),'auction-fold-map')}
   ${auctionFold('감정가 대비 가격 분석',auctionPriceAnalysis(x.appraisalWon,x.minimumWon,'법원 시범 부분수집본 · 원문 대조 필요'),'auction-fold-analysis')}
   ${auctionFold('최저매각가 변경 이력',capitalPriceHistoryMarkup(x),'auction-fold-history')}
   ${auctionFold('입찰보증금 계산기',auctionBidCalculator(x.minimumWon,'법원 부분수집본 · 최신 가격 및 공고 확인 필요'),'auction-fold-calc')}
   ${auctionPrebidChecklist()}
   <button type="button" class="secondary full-secondary" data-capital-rights="${escapeHtml(x.id)}">⚖ 권리분석 · 인수 가능 금액 기록</button>
   <button type="button" class="secondary full-secondary" data-capital-check="${escapeHtml(x.id)}">법원 서버에서 이 물건 재조회</button>
   <p class="helper" data-capital-result="${escapeHtml(x.id)}" aria-live="polite">재조회 전 · 법원 원문 확인 필요</p>
   <div class="court-official-jump"><p class="helper">법원 원문 확인 · ${escapeHtml(x.courtName)} / 물건 ${escapeHtml(x.itemNo)}번</p>
   <div class="status">법원 검색창에서 <strong>연도 ${escapeHtml(x.caseNo.slice(0,4))}</strong> 선택 · <strong>타경번호 ${escapeHtml(x.caseNo.split('타경')[1])}</strong> 붙여넣기</div>
   <button type="button" class="secondary full-secondary" data-capital-official="${escapeHtml(x.id)}">타경번호 복사하고 법원검색 열기 ↗</button>
   <button type="button" class="secondary full-secondary" data-capital-copy="${escapeHtml(x.id)}">타경번호만 복사</button>
   <p class="helper">법원 사이트의 연도 선택은 자동으로 변경되지 않습니다. 상세 사건으로 바로 이동하는 기능도 아직 지원하지 않습니다.</p></div>
  </div>`;

 };
 const formatAmount=n=>Number.isSafeInteger(n)&&n>0?prettyPrice(n):'미확인';
 const capturedTime=Date.parse(snapshot?.fetchedAt||'');
 const ageHours=Number.isFinite(capturedTime)?(Date.now()-capturedTime)/3600000:Infinity;
 const safetyVerified=snapshot?.validation?.passed===true;
 const isStale=ageHours>30||ageHours< -1||!Number.isFinite(ageHours);
 const info=capitalLoadStatus==='loading'?'목록을 불러오는 중…':capitalLoadStatus==='failed'?'목록 갱신 확인 실패 · '+capitalLoadError:
   capitalLoadStatus==='ready'?'마지막 수집 '+escapeHtml(new Date(capturedTime).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+' · 부분 수집':'목록 확인 전';
 const latestFailed=capitalAttemptStatus?.outcome==='failed'&&Date.parse(capitalAttemptStatus.attemptedAt)>capturedTime;
 const legalDiagnosticText=capitalLegalDiagnostic?
  '법적 상태 검증: 미완료 · 단일 사건 진단 '+escapeHtml(new Date(capitalLegalDiagnostic.attemptedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+
  (capitalLegalDiagnostic.reason==='before_result_publication_window'?' · 기일 당일 조회 대기':
   capitalLegalDiagnostic.reason==='snapshot_schedule_changed_or_unconfirmed'?' · 기일 변경 또는 확인 실패':
   capitalLegalDiagnostic.reason==='empty_result'?' · 결과검색 0건 (매각·취하 뜻 아님)':
   capitalLegalDiagnostic.reason==='raw_code_cross_checked'?' · 원시코드 교차확인 (법적 상태 미확정)':' · 공식 상태명 확인 전'):
  '법적 상태 검증: 미확인 · 진단 보고서 없음';
 const safetyNotice=capitalLoadStatus==='ready'?
  (capitalLoadError?'<div class="status">⚠ 최신 목록 다시 불러오기 실패: '+escapeHtml(capitalLoadError)+' · 이전에 검증된 목록을 표시합니다.</div>':'')+
  (!capitalAttemptStatus?'<div class="status">⚠ 마지막 자동 수집 시도의 성공·실패 정보를 확인할 수 없습니다. 법원 원문을 확인하세요.</div>':'')+
  (capitalAttemptStatus?.outcome==='success'&&Date.parse(capitalAttemptStatus.attemptedAt)<capturedTime?'<div class="status">⚠ 목록 수집시각보다 이전의 성공기록만 있습니다. 최신 수집 상태를 확인할 수 없습니다.</div>':'')+
  (latestFailed?'<div class="status">⚠ '+escapeHtml(
   capitalAttemptStatus.reason==='connection_timeout'?'법원 서버 접속 시간 초과 · 이전 목록 표시':
   capitalAttemptStatus.reason==='conflicting_records'?'법원 물건정보 충돌 · 이전 목록 표시':
   capitalAttemptStatus.reason==='validation_rejected'?'법원 수집자료 검증 실패 · 이전 목록 표시':
   '최근 자동 수집 실패 · 이전 목록 표시')+' · 법원 원문 확인 필요.</div>':'')+
  (isStale?'<div class="status">⚠ 마지막 수집 후 30시간 이상 경과했습니다. 자료가 오래되었을 수 있습니다.</div>':
   safetyVerified?'<div class="status">✓ 자동 형식 검사 통과 · 법원 원문 확인을 대체하지 않습니다.</div>':
   '<div class="status">⚠ 기존 시범 수집본입니다. 토지·건물 등 복합 구성요소가 일부 누락됐을 수 있으며, 안전검증 기록이 아직 없습니다.</div>')+
  (safetyVerified&&snapshot.validation.warnings?.length?
   '<div class="status">⚠ 이전 수집본과 차이 감지: '+escapeHtml(snapshot.validation.warnings.join(' / '))+'</div>':'')+
  '<p class="helper">각 지역 일부 페이지만 수집했습니다. 실제 조회: 서울 '+escapeHtml(String(snapshot?.regions?.서울?.processedPages||'?'))+'페이지, 경기 '+escapeHtml(String(snapshot?.regions?.경기?.processedPages||'?'))+'페이지, 인천 '+escapeHtml(String(snapshot?.regions?.인천?.processedPages||'?'))+'페이지. 목록에 없다고 매각·취하된 것은 아닙니다.</p>':'';

 return `${focusing?'<div class="card capital-focus-banner"><strong>관심 저장한 물건번호만 찾기</strong>'+(capitalLoadStatus==='loading'||capitalLoadStatus==='unloaded'?'<p class="helper">검증된 수집목록을 불러오는 중입니다.</p>':items.length?'<p class="helper">같은 사건의 다른 물건번호는 제외했습니다. 해당 물건만 아래에서 펼쳐 확인하세요.</p>':'<div class="status">⚠ 현재 검증된 부분 수집목록에서 정확히 일치하는 물건을 찾지 못했습니다. 수집범위 밖이거나 정보가 변경됐을 수 있습니다. 낙찰·취하를 의미하지 않습니다.</div>')+'<button type="button" class="secondary full-secondary" id="capitalFocusClear">전체 수집목록 보기</button></div>':''}${reviewing?'<div class="card court-review-banner"><strong>'+escapeHtml(reviewLabel)+'</strong><p class="helper">검증 예정 물건만 표시합니다. 자동 결과조회가 아니라 기존 물건별 수동 재조회입니다.</p>'+(aligned?'<p class="helper">일정표와 수집본의 시각·건수가 일치합니다. '+items.length+'건</p>':'<div class="status">⚠ 일정표와 최신 수집본이 일치하지 않거나 일정이 만료됐습니다. 잘못된 물건 연결을 방지하기 위해 목록을 차단했습니다.</div>')+'<button type="button" class="secondary full-secondary" id="capitalReviewClear">전체 수집목록 보기</button></div>':''}<div class="card search-panel"><strong>서울·경기·인천 법원 경매물건</strong>
 <p class="helper">자동 수집 시범 목록입니다. 수도권 전체 사건 목록이 아니며, 매각기일·가격·진행 상태는 법원 원문에서 다시 확인해야 합니다.</p>
 <p class="helper" id="capitalStatus">${info}</p><div class="status">⚠ ${legalDiagnosticText} · 전체 ${items.length}건의 매각·취하 여부가 확인됐다는 뜻은 아닙니다.</div>${courtResultDiagnosticWarning()}${safetyNotice}
 <div class="filters">${['전체','서울','경기','인천'].map(r=>`<button type="button" class="chip ${region===r?'active':''}" data-capital-region="${r}">${r}</button>`).join('')}</div>
 <label class="label" for="capitalTypeFilter">물건 종류</label>
 <select id="capitalTypeFilter" class="select" aria-label="물건 종류별 필터">
 ${typeOptions.map(t=>`<option value="${escapeHtml(t.code)}" ${state.capitalType===t.code?'selected':''}>${escapeHtml(t.name)}</option>`).join('')}</select>
 <p class="helper">현재 수집된 물건 종류만 표시합니다. 종류를 선택하면 해당 물건만 보여줍니다.</p>
 <form id="capitalSearchForm" class="search-form"><input id="capitalSearch" class="search" type="search" placeholder="소재지·법원·사건번호 검색" value="${escapeHtml(state.capitalQuery)}"><button class="search-submit" type="submit">검색</button></form>
 <button type="button" class="secondary full-secondary" id="capitalReload">목록 다시 불러오기</button></div>
 <div class="section"><h2>수집된 물건 <span class="result-count">${matched.length}건</span></h2><span class="muted">사건 ${grouped.length}건 · 물건번호별 정보 보존</span></div>
 ${capitalLoadStatus==='loading'?'<div class="empty">수도권 목록을 불러오는 중…</div>':capitalLoadStatus==='failed'?'<div class="empty">자동목록에 연결할 수 없습니다. 나중에 다시 확인해 주세요.</div>':matched.length===0?'<div class="empty">표시할 물건이 없습니다. 검색 조건을 변경해 주세요.</div>':
 grouped.slice(0,state.capitalLimit).map(group=>{
 const x=group[0];
 return '<details class="card capital-record capital-case-group"'+(focusing?' open':'')+'><summary><strong>'+escapeHtml(x.address)+'</strong><p class="helper">'+escapeHtml(x.courtName||'법원 미확인')+' · '+escapeHtml(x.caseNo)+'</p><span class="capital-case-count">'+group.length+'개 물건 · 펼쳐보기</span></summary>'+group.map(item=>renderCapitalProperty(item,x)).join('')+'</details>';
 }).join('')}
 ${grouped.length>state.capitalLimit?`<button class="secondary full-secondary" type="button" id="capitalMore">다음 40개 사건 더 보기 (${grouped.length-state.capitalLimit}건 남음)</button>`:''}
 <p class="helper">수집물건은 직접 등록 사건·일정에 자동 추가되지 않습니다. 관심물건 저장 버튼을 누른 물건만 기기에 별도로 저장됩니다.</p>`;
}
async function verifyCapitalItem(id,button){
 const snapshot=capitalSnapshot,item=snapshot?.items?.find(x=>x.id===id);
 if(!item)return;
 const output=button.parentElement.querySelector('[data-capital-result]');
 if(!output)return;
 button.disabled=true;
 output.textContent='법원 서버에서 조회하는 중…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const query=new URLSearchParams({courtCode:item.courtCode,caseNo:item.caseNo,itemNo:item.itemNo});
  const response=await fetch(COURT_ITEM_URL+'?'+query.toString(),{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('법원 원문 재조회에 실패했습니다 (HTTP '+response.status+').');
  const fresh=await response.json();
  if(fresh?.verified!==true||fresh.courtCode!==item.courtCode||fresh.caseNo!==item.caseNo||
    String(fresh.itemNo)!==String(item.itemNo)||fresh.source!=='courtauction.go.kr')
    throw Error('법원/사건/물건번호 일치 여부를 확인하지 못했습니다.');
  const changes=[],unknown=[],equal=[];
  const validWon=value=>Number.isSafeInteger(value)&&value>0&&value<=999999999999999;
  const validAuctionDate=value=>{
   if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;
   const date=new Date(value+'T00:00:00Z');
   return !Number.isNaN(+date)&&date.toISOString().slice(0,10)===value;
  };
  const compare=(key,label)=>{
   const old=item[key],latest=fresh[key];
   const isDate=key==='saleDate';
   if(isDate?(!validAuctionDate(old)||!validAuctionDate(latest)):(!validWon(old)||!validWon(latest))){
    unknown.push(label+' (값 없음·형식 오류)');return;
   }
   if(old!==latest)changes.push(label+' 차이 (수집 '+(isDate?old:prettyPrice(old))+' / 재조회 '+(isDate?latest:prettyPrice(latest))+')');
   else equal.push(label);
  };
  compare('appraisalWon','감정평가액');
  if(fresh.priceAmbiguous===true)unknown.push('최저매각가 (법원 조회값이 여러 개)');
  else compare('minimumWon','최저매각가');
  compare('saleDate','매각기일');
  const prefix=changes.length?'⚠ 법원 재조회와 수집 목록에 차이가 있습니다. 기일 변경·가격 변경 여부를 원문에서 확인하세요: '+changes.join(' / '):
    unknown.length?'⚠ 재조회했지만 일부 가격·기일을 정확히 대조하지 못했습니다.':
    '✓ 수집 목록과 재조회한 가격·기일이 일치합니다.';
  output.textContent='조회시각 '+new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' · '+prefix+
   (equal.length?' · 일치: '+equal.join(', '):'')+
   (unknown.length?' · 미확인: '+unknown.join(', '):'')+
   ' · 매각·취하·변경 등 사건 진행상태는 검증되지 않았습니다. 법원 원문에서 확인하세요.';
 }catch(error){
  output.textContent='⚠ 재조회 실패: '+String(error?.name==='AbortError'?'시간 초과':error?.message||'연결 오류')+
   ' · 저장된 정보가 정확하다는 뜻이 아닙니다. 법원 원문에서 확인하세요.';
 }finally{
  clearTimeout(timer);button.disabled=false;
 }
}
async function loadCapital(force=false){
 if(capitalLoadStatus==='loading'||(capitalLoadStatus==='ready'&&!force))return;
 capitalLoadStatus='loading';capitalLoadError='';
 if(state.page==='capital')render();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const [response,statusResponse,legalResponse,historyResponse]=await Promise.all([
   fetch('./data/capital-court-pilot.json',{cache:'no-store',signal:controller.signal}),
   fetch('./data/capital-court-status.json',{cache:'no-store',signal:controller.signal}).catch(()=>null),
   fetch('./data/court-sale-result-status.json',{cache:'no-store',signal:controller.signal}).catch(()=>null),
   fetch('./data/capital-price-history.json',{cache:'no-store',signal:controller.signal}).catch(()=>null)
  ]);
  let attempt=null;
  if(statusResponse?.ok){try{const item=await statusResponse.json();if(item?.schemaVersion===1&&['success','failed'].includes(item.outcome)&&Number.isFinite(Date.parse(item.attemptedAt)))attempt=item;}catch{}}
  capitalAttemptStatus=attempt;
  let legalDiagnostic=null;
  if(legalResponse?.ok){try{
   const item=await legalResponse.json();
   if(item?.schemaVersion===1&&item.legalStatusVerified===false&&Number.isFinite(Date.parse(item.attemptedAt))&&Date.parse(item.attemptedAt)<=Date.now()+60000&&typeof item.reason==='string'&&/^[a-z_]{1,40}$/.test(item.reason))legalDiagnostic=item;
  }catch{}}
  capitalLegalDiagnostic=legalDiagnostic;
  if(!response.ok)throw Error('목록 파일이 아직 배포되지 않았습니다.');
  const payload=await response.json();
  if(![1,2].includes(payload?.schemaVersion)||payload.complete!==false||!Array.isArray(payload.items)||payload.items.length===0||payload.items.length>5000||
    !payload.items.every(x=>x&&typeof x.id==='string'&&x.id.startsWith('court-')&&['서울','경기','인천'].includes(x.region)&&typeof x.address==='string'&&x.address.length<=260&&
    (payload.schemaVersion!==2||(Array.isArray(x.components)&&x.components.length>0&&x.components.length<=100&&x.components.every(c=>c&&typeof c.address==='string'&&c.address.length<=260)))))
    throw Error('목록 데이터 형식 확인 실패');
  if(payload.validation?.passed!==true||!Number.isSafeInteger(payload.validation.validatedItems)||payload.validation.validatedItems!==payload.items.length)throw Error('검증 완료 기록이 없는 목록은 표시하지 않습니다.');
  let observed=null;
  if(historyResponse?.ok){
   try{
    const h=await historyResponse.json();
    if(h?.schemaVersion===1&&h.kind==='observed_snapshot_prices'&&h.source==='courtauction.go.kr'&&
     h.partialCoverage===true&&h.legalStatusVerified===false&&Array.isArray(h.events)&&h.events.length<=1000&&
     h.events.every(e=>e&&typeof e.id==='string'&&/^court-B\d{6}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(e.id)&&
      Number.isSafeInteger(e.previousMinimumWon)&&e.previousMinimumWon>0&&
      Number.isSafeInteger(e.currentMinimumWon)&&e.currentMinimumWon>0&&
      Number.isFinite(Date.parse(e.fromSnapshotAt))&&Number.isFinite(Date.parse(e.toSnapshotAt))&&
      Date.parse(e.fromSnapshotAt)<Date.parse(e.toSnapshotAt)&&Date.parse(e.toSnapshotAt)<=Date.parse(payload.fetchedAt)))
      observed=h;
   }catch{}
  }
  capitalPriceHistory=observed;
  capitalSnapshot=payload;capitalLoadStatus='ready';
  if(force&&capitalAttemptStatus?.outcome==='success'&&Date.parse(capitalAttemptStatus.attemptedAt)>=Date.parse(payload.fetchedAt)&&payload.validation?.passed===true)showSavedCheck('검증된 자료 불러오기 완료');
 }catch(e){
  capitalLoadError=e?.name==='AbortError'?'시간 초과':String(e.message||'연결 오류');
  // Keep the last successfully loaded snapshot on a network failure.
  capitalLoadStatus=capitalSnapshot?'ready':'failed';
  if(capitalSnapshot&&state.page==='capital')toast('갱신에 실패했습니다. 마지막으로 확인한 자료를 표시합니다.');
 }
 finally{clearTimeout(timer);if(state.page==='capital'||state.page==='search')render();}
}
function official(){
 const records=registeredProperties().slice().reverse();
 const editing=records.find(p=>p.id===state.editRealId)||null;
 const liveTestHTML='<div class="court-live-test"><strong>✓ 실제 법원 조회 성공 물건 테스트</strong>'+
  '<p class="helper">서울중앙지방법원 · 2025타경103685 · 물건 1번 · 최저가 2억 400만원 · 2026-11-19</p>'+
  '<p class="helper">사건번호·가격·기일의 법원 조회가 성공한 사례예요. 저장 전 최신 자료를 다시 조회합니다.</p>'+
  '<button type="button" class="secondary full-secondary" id="loadLiveCourtTest">실제 사건 등록 테스트</button>'+
  '<p id="liveCourtTestStatus" class="helper" role="status">자동 저장하지 않아요. 확인 후 아래 사건 등록을 눌러 주세요.</p></div>';
 return `<div class="card official-intro"><strong>대한민국 법원경매정보</strong><p class="helper">법원 공식 사이트에서 물건을 검색해 사건번호와 매각기일·가격을 확인하세요. 현재 서울중앙지방법원 사건번호 확인과 물건번호별 정보 가져오기를 지원해요. 조회된 정보를 법원 원문과 대조한 뒤 등록하세요.</p><button type="button" class="primary" id="openOfficialCourt">⚖ 법원경매정보 열기 ↗</button><p class="helper">공식 사이트에서 확인한 사건만 아래에 직접 등록해 주세요. 직접 입력값은 법원 검증 완료 표시가 아닙니다.</p></div>
 <form class="card official-form" id="officialRecordForm">
 <strong>${editing?'경매사건 등록 정보 수정':'실제 경매사건 직접 등록'}</strong>${editing?'':liveTestHTML}${editing?'<p class="helper">법원·사건번호·물건번호는 같은 기록을 유지하기 위해 변경할 수 없습니다. 가격·매각기일·주소·분류는 수정할 수 있어요.</p>':''}
 <div class="court-pdf-import"><label class="official-pdf-label" for="officialPdfInput">▤ 법원 PDF로 정보 자동 입력</label><input type="file" id="officialPdfInput" accept="application/pdf,.pdf" hidden><p class="helper" id="officialPdfStatus">법원 사이트에서 저장한 텍스트 PDF를 선택하세요. 확실한 정보만 추출하며 등록 전에 검토해야 해요.</p></div>
 <label class="label" for="officialCourt">담당 법원</label><input class="search" id="officialCourt" required maxlength="100" placeholder="예: 서울중앙지방법원">
 <label class="label" for="officialCase">사건번호</label><input class="search" id="officialCase" required placeholder="예: 2025타경12345" inputmode="text">
 <button type="button" class="secondary court-verify-button" id="verifyOfficialCase">🔎 법원 사건번호 확인</button><p class="helper court-verify-status" id="verifyOfficialStatus" role="status" aria-live="polite">지원 법원: 서울중앙지방법원 · 조회 결과는 자동 저장되지 않습니다.</p>
 <label class="label" for="officialItemNo">물건번호</label><input class="search" id="officialItemNo" placeholder="예: 1 (선택)" inputmode="numeric" maxlength="4">
 <button type="button" class="secondary court-item-button" id="fetchOfficialItem">▤ 물건정보 자동 입력</button><p class="helper court-item-status" id="fetchOfficialItemStatus" role="status" aria-live="polite">물건번호를 먼저 입력하세요. 법원 자료가 확인되면 빈칸에만 적용합니다.</p>
 <label class="label" for="officialAddress">소재지 / 물건 이름</label><input class="search" id="officialAddress" required maxlength="300" placeholder="법원에 표시된 소재지">
 <label class="label" for="officialUsageLarge">법원 물건 용도 · 대분류</label>
 <select id="officialUsageLarge" class="select" ${editing?"":"required"}><option value="" selected disabled>법원 대분류 선택</option>${COURT_USAGE_LARGE.map(x=>'<option value="'+x.name+'">'+x.name+'</option>').join('')}</select>
 <label class="label" for="officialUsageMedium">법원 용도 · 중분류</label><select class="select" id="officialUsageMedium" ${editing?"":"required"}><option value="">대분류를 먼저 선택</option></select>
 <label class="label" for="officialType">법원 용도 · 소분류 / 실제 물건 종류</label><select class="select" id="officialType" ${editing?"":"required"}><option value="">중분류를 먼저 선택</option></select>
 <p class="helper">법원 서버에서 확인한 대·중·소분류 코드를 사용합니다. 기존 사건의 분류는 변경하지 않아요.</p>
 <label class="label" for="officialAppraisal">감정평가액 (원)</label><input class="search" id="officialAppraisal" type="number" inputmode="numeric" min="0" step="1" placeholder="원 단위">
 <label class="label" for="officialMin">최저매각가격 (원)</label><input class="search" id="officialMin" type="number" inputmode="numeric" min="0" step="1" placeholder="원 단위">
 <label class="label" for="officialSaleDate">매각기일 (선택)</label><input class="search" id="officialSaleDate" type="date">
 <button class="primary" type="submit">${editing?'수정 내용 저장':'사건 등록'}</button>${editing?'<button class="secondary full-secondary" type="button" id="cancelRealEdit">수정 취소</button>':''}<p class="helper">사용자 입력 기록 · 기일 변경 및 취하 여부는 법원에서 직접 재확인</p></form>
 <div class="section"><h2>내가 등록한 사건</h2><span class="muted">${records.length}건</span></div>
 ${records.map(p=>`<div class="official-saved-item">${card(p)}<div class="official-record-actions"><button type="button" class="secondary" data-edit-real="${escapeHtml(p.id)}">등록 내용 수정</button><button type="button" class="secondary" data-delete-real="${escapeHtml(p.id)}">등록 내용 삭제</button></div></div>`).join('')||'<div class="empty">등록한 사건이 없어요. 법원 원문을 확인하고 등록해 주세요.</div>'}`;
}
function settings(){const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;const backupDate=localStorage.getItem(STORAGE_STAMP_KEY);return `<div class="card"><strong>앱 정보</strong><p class="helper">부동산 경매 v${APP_VERSION} · ${standalone?'홈 화면 웹앱':'브라우저 실행'}</p><p class="helper" id="appUpdateState">${statusText()}</p><button class="secondary" id="checkUpdate" style="width:100%">${updateState.available?'업데이트 적용':'업데이트 확인'}</button><p id="updateAvailableMessage" class="update-available-message" ${updateState.available?'':'hidden'}>새 버전이 준비돼 있어요. 작성 중인 내용은 먼저 저장해 주세요.</p><div class="divider"></div><strong>개발 상태</strong><p class="helper">서울중앙지방법원 사건번호 및 물건정보를 조회하고 확인 후 빈 등록칸에 반영합니다. 물건 종류 판별·실시간 일정 갱신·실거래가·사진 연동은 아직 미지원.</p><div class="divider"></div><strong>데이터 백업</strong><p class="helper">노트·관심물건·첨부파일을 한 번에 백업합니다. Safari와 홈 화면 웹앱은 저장 데이터가 분리될 수 있으니 홈 화면 웹앱에서 백업하세요.</p><p class="helper">마지막 백업 생성 요청: ${backupDate?new Date(backupDate).toLocaleString('ko-KR'):'기록 없음'}</p><button class="secondary" id="export" style="width:100%">내 데이터 백업</button><label class="upload" style="margin-top:10px">백업 파일 복원<input id="import" type="file" accept="application/json,.json" hidden></label></div><div class="card"><strong>테스트용 예시 물건</strong><p class="helper">기본 검색과 홈에는 가상 물건을 표시하지 않습니다. 기존 테스트 데이터는 삭제하지 않고 이 화면에서만 확인할 수 있습니다.</p><button type="button" class="secondary full-secondary" data-page="demo">테스트용 예시 3건 보기</button></div><div class="card"><strong>프로젝트 이관</strong><p class="helper">README.md, PROJECT_HANDOFF.md, DESIGN_SPEC.md에 작업 재개 및 배포 방법이 기록돼 있어요.</p></div>`}function render(){if(editorDirty&&state.page==='note')persistNoteDraft();document.onselectionchange=null;activeNoteEditor=null;editorDirty=false;const back=document.getElementById('navBack');if(back){back.hidden=state.page==='home';back.onclick=goBack;}document.title='부동산 경매 · '+titles[state.page];$('#page-title').textContent=titles[state.page];$('#content').innerHTML=({home,search,schedule,favorites,study,advanced,special,detail,rights,note,settings,official,capital,demo}[state.page])();if($('#noteEditorShell')){
 activeNoteEditor={...initNoteEditor(),attachments:createAttachmentEditor()};
 const changed=()=>{setEditorDirty(true);scheduleNoteDraft();};
 $('#noteTitle').addEventListener('input',changed);
 $('#noteCategory').addEventListener('change',changed);
 $('#noteTopic').addEventListener('change',changed);
 $('#noteBody').addEventListener('input',changed);
 $('#noteAttachmentInput').addEventListener('change',()=>{
  setEditorDirty(true);scheduleNoteDraft();
  const indicator=$('#noteDraftStatus');
  if(indicator)indicator.textContent='첨부파일은 노트 저장을 눌러야 보관됩니다';
 });
 document.querySelectorAll('[data-note-color]').forEach(btn=>btn.addEventListener('click',changed));
 $('#stickySave').addEventListener('click',changed);
 $('#stickyRemove').addEventListener('click',changed);
 // Wait for editor controls and pending attachment list to initialize before restoring draft.
 recoverNoteDraft();
 }$('#tabs').innerHTML=tabs();$('#settings').onclick=()=>nav('settings');document.querySelectorAll('[data-page]').forEach(x=>x.onclick=()=>nav(x.dataset.page,x.dataset.searchMode?{searchMode:x.dataset.searchMode}:x.dataset.page==='search'?{searchMode:'all'}:{}));if($('#quickEditToggle'))$('#quickEditToggle').onclick=()=>{quickMenuEditing=!quickMenuEditing;render();};
document.querySelectorAll('[data-quick-toggle]').forEach(button=>button.onclick=()=>{
 const id=button.dataset.quickToggle;
 const next=quickMenuIds.includes(id)?quickMenuIds.filter(x=>x!==id):[...quickMenuIds,id];
 try{persistQuickMenu(next);render();showSavedCheck('빠른 메뉴 저장 완료');}
 catch{toast('빠른 메뉴를 저장할 수 없습니다.');}
});
document.querySelectorAll('[data-quick-move]').forEach(button=>button.onclick=()=>{
 const id=button.dataset.quickMove,from=quickMenuIds.indexOf(id),to=from+Number(button.dataset.step);
 if(from<0||to<0||to>=quickMenuIds.length)return;
 const next=quickMenuIds.slice();[next[from],next[to]]=[next[to],next[from]];
 try{persistQuickMenu(next);render();showSavedCheck('순서 저장 완료');}
 catch{toast('순서를 저장할 수 없습니다.');}
});
// iOS touch drag is attached only to the reorder handle, not entire cards.
document.querySelectorAll('[data-quick-drag]').forEach(handle=>{
 let startY=0,dragging=false;
 handle.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  startY=event.clientY;dragging=true;handle.setPointerCapture?.(event.pointerId);
  handle.closest('.quick-edit-row')?.classList.add('dragging');
 });
 handle.addEventListener('pointercancel',()=>{dragging=false;handle.closest('.quick-edit-row')?.classList.remove('dragging');});
 handle.addEventListener('pointerup',event=>{
  if(!dragging)return;dragging=false;
  handle.closest('.quick-edit-row')?.classList.remove('dragging');
  if(Math.abs(event.clientY-startY)<16)return;
  const rows=[...document.querySelectorAll('[data-quick-row]')].filter(row=>quickMenuIds.includes(row.dataset.quickRow));
  const target=rows.find(row=>{const r=row.getBoundingClientRect();return event.clientY>=r.top&&event.clientY<=r.bottom;});
  const from=quickMenuIds.indexOf(handle.dataset.quickDrag),to=target?quickMenuIds.indexOf(target.dataset.quickRow):-1;
  if(from<0||to<0||from===to)return;
  // Reorder only visible active entries, leaving hidden items excluded.
  const reordered=quickMenuIds.slice(),moved=reordered.splice(from,1)[0];reordered.splice(to,0,moved);
  try{persistQuickMenu(reordered);render();showSavedCheck('순서 저장 완료');}
  catch{toast('순서를 저장할 수 없습니다.');}
 });
});
if($('#quickReset'))$('#quickReset').onclick=()=>{
 if(!confirm('빠른 메뉴를 처음 구성으로 복원할까요?'))return;
 try{persistQuickMenu(DEFAULT_QUICK_IDS.slice());render();showSavedCheck('기본 메뉴 복원 완료');}
 catch{toast('기본 메뉴 복원에 실패했습니다.');}
};
if(state.page==='schedule'&&verificationPlanStatus==='unloaded')void loadVerificationPlan();
document.querySelectorAll('[data-detail]').forEach(x=>x.onclick=()=>nav('detail',{detail:x.dataset.detail,detailTab:'overview'}));document.querySelectorAll('[data-filter]').forEach(x=>x.onclick=()=>{state.filter=x.dataset.filter;render()});document.querySelectorAll('[data-day]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.day;render();});if($('#prevMonth'))$('#prevMonth').onclick=()=>{state.viewMonth=shiftMonth(state.viewMonth,-1);state.selected=state.viewMonth+'-01';render();};if($('#nextMonth'))$('#nextMonth').onclick=()=>{state.viewMonth=shiftMonth(state.viewMonth,1);state.selected=state.viewMonth+'-01';render();};if($('#todayMonth'))$('#todayMonth').onclick=()=>{const now=new Date();state.viewMonth=calendarMonthKey(now);state.selected=state.viewMonth+'-'+String(now.getDate()).padStart(2,'0');render();};if($('#favCalendarOnly'))$('#favCalendarOnly').onchange=e=>{state.calendarFavoritesOnly=e.target.checked;render();};document.querySelectorAll('[data-note]').forEach(x=>x.onclick=()=>nav('note',{note:Number(x.dataset.note)}));if($('#favoriteSort'))$('#favoriteSort').onchange=e=>{state.favoriteSort=e.target.value;render();};
document.querySelectorAll('[data-favorite-type]').forEach(btn=>btn.onclick=()=>{state.favoriteType=btn.dataset.favoriteType;render();});
document.querySelectorAll('[data-court-favorite-toggle]').forEach(button=>button.onclick=()=>{
 const lot=capitalSnapshot?.items?.find(x=>x.id===button.dataset.courtFavoriteToggle);
 if(!lot||capitalSnapshot?.validation?.passed!==true){toast('검증된 수집목록에서만 저장할 수 있어요.');return;}
 const enable=!courtFavorites().some(x=>x.id===lot.id);
 try{setCourtFavorite(lot,enable);render();showSavedCheck(enable?'관심물건 저장 완료':'관심물건 해제 완료');}
 catch(error){toast(String(error.message||'관심물건 저장 실패'));}
});
document.querySelectorAll('[data-court-favorite-remove]').forEach(button=>button.onclick=()=>{
 const lot=courtFavorites().find(x=>x.id===button.dataset.courtFavoriteRemove);
 if(!lot||!confirm('법원 수집 관심물건을 해제할까요?'))return;
 try{setCourtFavorite(lot,false);render();showSavedCheck('관심물건 해제 완료');}
 catch{toast('관심물건 해제 실패');}
});
document.querySelectorAll('[data-court-favorite-date]').forEach(button=>button.onclick=()=>{
 const lot=courtFavorites().find(x=>x.id===button.dataset.courtFavoriteDate);
 if(!lot||!lot.saleDate||!validAuctionCalendarDay(lot.saleDate)){toast('저장된 입찰기일이 확인되지 않습니다.');return;}
 nav('schedule',{selected:lot.saleDate,viewMonth:lot.saleDate.slice(0,7),calendarFavoritesOnly:true});
});
document.querySelectorAll('[data-court-favorite-open]').forEach(button=>button.onclick=()=>{
 const lot=courtFavorites().find(x=>x.id===button.dataset.courtFavoriteOpen);
 if(!lot)return;
 nav('capital',{capitalFocusId:lot.id,capitalRegion:'전체',capitalType:'전체',capitalQuery:'',capitalLimit:40,capitalReviewDate:'',capitalReviewStage:''});
});
document.querySelectorAll('[data-remove-favorite]').forEach(btn=>btn.onclick=()=>{
 const id=btn.dataset.removeFavorite;
 const property=allProperties().find(p=>p.id===id);
 if(!property||!saved.favorites.includes(id))return;
 if(!confirm(property.name+'을(를) 관심물건에서 해제할까요?'))return;
 btn.disabled=true;
 btn.classList.add('heart-unfilled');
 const symbol=btn.querySelector('.favorite-heart');
 if(symbol)symbol.textContent='♡';
 saved.favorites=saved.favorites.filter(savedId=>savedId!==id);
 write();
 // Let the outline state be visible before the item disappears.
 setTimeout(()=>{if(state.page==='favorites')render();toast('관심물건에서 해제했어요.');},220);
});
document.querySelectorAll('[data-favorite-date]').forEach(btn=>btn.onclick=()=>{
 const item=allProperties().find(p=>p.id===btn.dataset.favoriteDate);
 if(!item)return;
 const date=item.date.replaceAll('.','-');
 nav('schedule',{selected:date,viewMonth:date.slice(0,7),calendarFavoritesOnly:true});
});

if($('#openOfficialCourt'))$('#openOfficialCourt').onclick=()=>window.open(OFFICIAL_AUCTION_URL,'_blank','noopener');

if($('#verifyOfficialCase'))$('#verifyOfficialCase').onclick=async()=>{
 const button=$('#verifyOfficialCase'),status=$('#verifyOfficialStatus');
 const court=$('#officialCourt').value.trim().normalize('NFC');
 const caseNumber=$('#officialCase').value.trim().normalize('NFC').replace(/\s+/g,'');
 if(court!=='서울중앙지방법원'){status.textContent='현재 서울중앙지방법원만 자동 확인을 지원합니다.';return;}
 if(!/^20\d{2}타경\d{1,12}$/.test(caseNumber)){status.textContent='사건번호를 2023타경4869 형식으로 입력해 주세요.';return;}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 button.disabled=true;status.textContent='법원 사건번호 확인 중…';
 try{
  const endpoint=COURT_VERIFY_URL+'?courtCode=B000210&caseNo='+encodeURIComponent(caseNumber);
  const response=await fetch(endpoint,{method:'GET',mode:'cors',cache:'no-store',signal:controller.signal});
  const result=await response.json();
  if(!response.ok||result?.verified!==true||result?.courtCode!=='B000210'||result?.caseNo!==caseNumber||result?.courtName!==court)
   throw Error(result?.error||'법원 또는 사건번호를 확인할 수 없습니다.');
  if(status.isConnected)status.textContent='✓ 법원 사건번호 확인 완료. 가격·매각기일은 법원 원문을 확인해 직접 입력하세요.';
 }catch(error){
  if(status.isConnected)status.textContent=error.name==='AbortError'?'법원 조회 시간이 초과됐어요. 다시 시도해 주세요.':'조회 실패: '+(error.message||'네트워크를 확인해 주세요.');
 }finally{clearTimeout(timeout);if(button.isConnected)button.disabled=false;}
};



// Court taxonomy cascades strictly by 5-digit parent codes.

if($('#recheckRegisteredCourt'))$('#recheckRegisteredCourt').onclick=async()=>{
 const button=$('#recheckRegisteredCourt'),status=$('#recheckRegisteredCourtStatus');
 const id=state.detail,record=registeredProperties().find(p=>p.id===id);
 if(!record||record.court!=='서울중앙지방법원'||!/^20\d{2}타경\d{1,10}$/.test(record.case)||
    !/^[1-9]\d{0,3}$/.test(String(record.itemNo))){
  status.textContent='이 사건은 자동 조회 지원 대상이 아니에요.';return;
 }
 button.disabled=true;status.textContent='법원 서버에서 물건정보를 다시 조회하는 중…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const query=new URLSearchParams({courtCode:'B000210',caseNo:record.case,itemNo:String(record.itemNo)});
  const response=await fetch(COURT_ITEM_URL+'?'+query.toString(),{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('법원 조회 실패 (HTTP '+response.status+')');
  const court=await response.json();
  if(court?.verified!==true||court.source!=='courtauction.go.kr'||court.courtName!==record.court||
     court.courtCode!=='B000210'||court.caseNo!==record.case||
     String(court.itemNo)!==String(record.itemNo))
    throw Error('법원·사건·물건번호가 일치하지 않아요.');
  const validWon=v=>Number.isSafeInteger(v)&&v>0&&v<=999999999999999;
  const validDate=v=>typeof v==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&
    Number.isFinite(Date.parse(v+'T00:00:00Z'))&&
    new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
  const candidates=[];
  if((record.valueWon===null||record.valueWon===undefined)&&validWon(court.appraisalWon))
   candidates.push({key:'valueWon',label:'감정가',value:court.appraisalWon});
  if((record.minWon===null||record.minWon===undefined)&&court.priceAmbiguous!==true&&validWon(court.minimumWon))
   candidates.push({key:'minWon',label:'최저매각가',value:court.minimumWon});
  if(!record.date&&validDate(court.saleDate))
   candidates.push({key:'date',label:'매각기일',value:court.saleDate.replaceAll('-','.')});
  if(!candidates.length){status.textContent='보완할 빈 금액·기일이 없어요. 진행상태는 법원 원문 확인이 필요합니다.';return;}
  const diff=candidates.map(f=>f.label+': '+(f.key==='date'?f.value:prettyPrice(f.value))).join('\n');
  if(!confirm('법원 물건정보를 다시 조회했습니다.\n\n'+diff+
    '\n\n기존 입력은 유지하고 위 빈 항목만 저장할까요?')){
   status.textContent='저장 취소 · 기존 자료는 그대로예요.';return;
  }
  const latest=registeredProperties().find(p=>p.id===id);
  if(!latest||latest.court!==record.court||latest.case!==record.case||
     String(latest.itemNo)!==String(record.itemNo))
   throw Error('저장할 사건이 변경됐어요. 다시 조회해 주세요.');
  const changes=candidates.filter(f=>f.key==='date'?!latest.date:
    latest[f.key]===null||latest[f.key]===undefined);
  if(!changes.length){status.textContent='이미 입력한 값은 덮어쓰지 않았어요.';return;}
  const next={...latest};
  for(const field of changes)next[field.key]=field.value;
  if(!validateRealProperty(next))throw Error('입력값 형식을 검증하지 못했습니다.');
  const old=saved.realProperties;
  saved.realProperties=registeredProperties().map(p=>p.id===id?next:p);
  try{write();}catch(error){saved.realProperties=old;throw error;}
  render();showSavedCheck('법원 정보 보완 완료');
 }catch(error){if(status.isConnected)status.textContent=
  (error.name==='AbortError'?'법원 조회 시간 초과':String(error.message||'연결 오류'))+
  ' · 기존 자료는 그대로 보존했어요.';
 }finally{clearTimeout(timer);if(button.isConnected)button.disabled=false;}
};
if($('#editRealDetail'))$('#editRealDetail').onclick=()=>{
 const p=registeredProperties().find(p=>p.id===state.detail);
 if(p)nav('official',{editRealId:p.id});
};
document.querySelectorAll('[data-edit-real]').forEach(button=>button.onclick=()=>{
 const p=registeredProperties().find(p=>p.id===button.dataset.editReal);
 if(p)nav('official',{editRealId:p.id});
});
if($('#cancelRealEdit'))$('#cancelRealEdit').onclick=()=>{
 const id=state.editRealId;state.editRealId=null;nav('detail',{detail:id,detailTab:'overview'});
};
if($('#capitalReload'))$('#capitalReload').onclick=()=>loadCapital(true);
if($('#capitalFocusClear'))$('#capitalFocusClear').onclick=()=>{state.capitalFocusId='';state.capitalQuery='';state.capitalRegion='전체';state.capitalType='전체';state.capitalLimit=40;render();};
if($('#capitalReviewClear'))$('#capitalReviewClear').onclick=()=>{
 state.capitalReviewDate='';state.capitalReviewStage='';state.capitalQuery='';state.capitalLimit=40;render();
};
document.querySelectorAll('[data-plan-stage]').forEach(button=>button.onclick=()=>{
 const day=button.dataset.planDate,stage=button.dataset.planStage;
 const report=verificationPlan?.days?.find(x=>x.date===day);
 if(verificationPlanStatus!=='ready'||!report||!Array.isArray(report[stage])||!report[stage].length){
  toast('해당 날짜의 검증 대상이 없습니다.');return;
 }
 nav('capital',{capitalReviewDate:day,capitalReviewStage:stage,
  capitalRegion:'전체',capitalType:'전체',capitalQuery:'',capitalFocusId:'',capitalLimit:40});
});
document.querySelectorAll('[data-capital-region]').forEach(button=>button.onclick=()=>{
 state.capitalFocusId='';state.capitalRegion=button.dataset.capitalRegion;state.capitalType='전체';state.capitalLimit=40;render();
});
if($('#capitalTypeFilter'))$('#capitalTypeFilter').onchange=event=>{
 state.capitalFocusId='';state.capitalType=event.target.value;state.capitalLimit=40;render();
};
if($('#capitalSearchForm'))$('#capitalSearchForm').onsubmit=event=>{
 event.preventDefault();state.capitalFocusId='';state.capitalQuery=$('#capitalSearch').value.trim();state.capitalLimit=40;render();
};
if($('#capitalMore'))$('#capitalMore').onclick=()=>{state.capitalLimit+=40;render();};
document.querySelectorAll('[data-auction-calc]').forEach(box=>{
 const amount=box.querySelector('[data-bid-manwon]'),rate=box.querySelector('[data-bid-rate]'),result=box.querySelector('[data-bid-result]'),compare=box.querySelector('[data-bid-compare]');
 const calculate=()=>{
  compare.textContent=amount.value?auctionBidCompare(amount.value,Number(box.dataset.minWon)):'입찰 예정가와 최저매각가를 비교할 수 있습니다.';
  if(!amount.value||!rate.value){result.textContent='입찰가와 공고상 비율을 모두 입력하세요.';return;}
  const value=auctionBidDepositWon(amount.value,rate.value);
  result.textContent=value===null?'올바른 입찰가와 보증금 비율을 확인하세요.':'가정 입찰보증금: '+prettyPrice(value)+' · 실제 공고에서 재확인 필요';
 };
 amount.addEventListener('input',calculate);rate.addEventListener('change',calculate);
});
document.querySelectorAll('[data-capital-rights]').forEach(button=>button.onclick=()=>{
 const id=button.dataset.capitalRights;
 const item=capitalSnapshot?.items?.find(x=>x.id===id);
 if(capitalSnapshot?.validation?.passed!==true||!item||id!=='court-'+item.courtCode+'|'+item.caseNo+'|'+item.itemNo){
  toast('검증된 물건번호를 확인하지 못했습니다.');return;
 }
 nav('rights',{rightsPropertyId:id});
});
document.querySelectorAll('[data-capital-check]').forEach(button=>button.onclick=()=>void verifyCapitalItem(button.dataset.capitalCheck,button));
function copyCapitalCaseNumber(value){
 const match=/^20\d{2}타경(\d{1,10})$/.exec(value);
 if(!match)return Promise.resolve(false);
 value=match[1];
 if(navigator.clipboard?.writeText){
  try{return navigator.clipboard.writeText(value).then(()=>true,()=>fallbackCopyCapitalCase(value));}
  catch{return Promise.resolve(fallbackCopyCapitalCase(value));}
 }
 return Promise.resolve(fallbackCopyCapitalCase(value));
}
function fallbackCopyCapitalCase(value){
 const input=document.createElement('input');
 input.value=value;input.readOnly=true;
 input.style.position='fixed';input.style.opacity='0';
 document.body.append(input);input.select();
 try{return document.execCommand('copy')===true;}catch{return false;}finally{input.remove();}
}
const capitalLotByButton=id=>capitalSnapshot?.validation?.passed===true?
 capitalSnapshot.items?.find(x=>x.id===id&&x.id==='court-'+x.courtCode+'|'+x.caseNo+'|'+x.itemNo):null;
document.querySelectorAll('[data-capital-copy]').forEach(button=>button.onclick=()=>{
 const item=capitalLotByButton(button.dataset.capitalCopy);
 if(!item){toast('물건번호를 확인할 수 없어요.');return;}
 void copyCapitalCaseNumber(item.caseNo).then(ok=>toast(ok?'타경번호 '+item.caseNo.split('타경')[1]+' 복사 완료 · 연도 '+item.caseNo.slice(0,4)+' 선택':
  '복사 실패 · 타경번호 '+item.caseNo.split('타경')[1]));
});
document.querySelectorAll('[data-capital-official]').forEach(button=>button.onclick=()=>{
 const item=capitalLotByButton(button.dataset.capitalOfficial);
 if(!item){toast('물건번호를 확인할 수 없어요.');return;}
 const url=new URL(OFFICIAL_CASE_SEARCH_URL);
 if(url.origin!=='https://www.courtauction.go.kr')return;
 // Start clipboard work during the original user gesture and open immediately,
 // rather than awaiting the clipboard Promise (mobile popup blockers).
 const copy=copyCapitalCaseNumber(item.caseNo);
 window.open(url.href,'_blank','noopener,noreferrer');
 void copy.then(ok=>{if(ok)toast('타경번호 복사 완료 · 연도 '+item.caseNo.slice(0,4)+' 선택');
  else toast('복사 실패 · 타경번호 '+item.caseNo.split('타경')[1]);});
});
if((state.page==='capital'||(state.page==='search'&&state.search.trim()))&&capitalLoadStatus==='unloaded')void loadCapital();
if($('#officialUsageLarge')){
 const large=$('#officialUsageLarge'),middle=$('#officialUsageMedium'),small=$('#officialType');
 const populate=(node,entries,placeholder)=>{
  const previous=node.value;
  node.replaceChildren();
  const blank=document.createElement('option');blank.value='';blank.textContent=placeholder;node.appendChild(blank);
  for(const entry of entries){
   const option=document.createElement('option');option.value=entry.name;option.textContent=entry.name;
   node.appendChild(option);
  }
  node.value=entries.some(x=>x.name===previous)?previous:'';
 };
 const refreshSmall=()=>{
  const parent=COURT_USAGE_LARGE.find(x=>x.name===large.value)?.code;
  const medium=usageExact('medium',middle.value,parent);
  populate(small,medium?usageChildren('small',medium.code):[],'소분류 선택');
 };
 const refreshMedium=()=>{
  const parent=COURT_USAGE_LARGE.find(x=>x.name===large.value)?.code;
  populate(middle,parent?usageChildren('medium',parent):[],'중분류 선택');
  refreshSmall();
 };
 large.addEventListener('change',()=>{middle.value='';small.value='';refreshMedium()});
 middle.addEventListener('change',()=>{small.value='';refreshSmall()});
 refreshMedium();
 const p=registeredProperties().find(x=>x.id===state.editRealId);
 if(p){
  const textFields={officialCourt:p.court,officialCase:p.case,officialItemNo:p.itemNo,
   officialAddress:p.name,officialAppraisal:p.valueWon,officialMin:p.minWon,
   officialSaleDate:propertyDate(p)};
  for(const [id,value] of Object.entries(textFields)){
   const input=document.getElementById(id);if(input&&value!=null)input.value=String(value);
  }
  for(const id of ['officialCourt','officialCase','officialItemNo']){
   const input=document.getElementById(id);if(input)input.readOnly=true;
  }
  const usage=p.courtUsage;
  const largeEntry=COURT_USAGE_CATALOG.find(x=>x.level==='large'&&x.code===usage?.codes?.large);
  if(largeEntry){
   large.value=largeEntry.name;refreshMedium();
   const middleEntry=COURT_USAGE_CATALOG.find(x=>x.level==='medium'&&x.parentCode===largeEntry.code&&x.code===usage?.codes?.medium);
   if(middleEntry){
    middle.value=middleEntry.name;refreshSmall();
    const smallEntry=COURT_USAGE_CATALOG.find(x=>x.level==='small'&&x.parentCode===middleEntry.code&&x.code===usage?.codes?.small);
    if(smallEntry)small.value=smallEntry.name;
   }
  }else{
   const note=document.createElement('p');note.className='helper';note.textContent='기존 등록 분류: '+p.type+' · 분류를 변경하지 않으려면 선택하지 않고 저장하세요.';
   large.before(note);
  }
 }
}

if($('#loadLiveCourtTest'))$('#loadLiveCourtTest').onclick=async()=>{
 const button=$('#loadLiveCourtTest'),status=$('#liveCourtTestStatus');
 if(state.page!=='official'||state.editRealId){status.textContent='새 사건 등록 화면에서만 이용할 수 있어요.';return;}
 button.disabled=true;status.textContent='테스트 사건 정보를 확인하는 중…';
 try{
  const response=await fetch('./data/court-live-test-case.json',{cache:'no-store'});
  if(!response.ok)throw Error('테스트 사건 정보 불러오기 실패');
  const test=await response.json();
  if(test?.schemaVersion!==1||test.kind!=='official_bridge_verified_test_case'||
    test.courtCode!=='B000210'||test.courtName!=='서울중앙지방법원'||
    test.caseNo!=='2025타경103685'||test.itemNo!=='1'||
    test.verification?.verified!==true||test.verification?.exactIdentity!==true)
   throw Error('테스트 사건 식별정보 확인 실패');
  const court=$('#officialCourt'),caseNumber=$('#officialCase'),itemNo=$('#officialItemNo');
  if(!court||!caseNumber||!itemNo)throw Error('등록 입력화면이 없습니다.');
  if(court.value.trim()||caseNumber.value.trim()||itemNo.value.trim())
   throw Error('현재 입력된 법원·사건번호·물건번호를 비운 뒤 다시 눌러 주세요.');
  court.value=test.courtName;caseNumber.value=test.caseNo;itemNo.value=test.itemNo;
  status.textContent='시험사건을 불러왔어요. 이제 법원 서버로 다시 조회합니다.';
  $('#fetchOfficialItem').click();
  court.scrollIntoView({behavior:'smooth',block:'center'});
 }catch(error){status.textContent='준비 실패: '+String(error.message||error);}
 finally{button.disabled=false;}
};
if($('#fetchOfficialItem'))$('#fetchOfficialItem').onclick=async()=>{
 const button=$('#fetchOfficialItem'),status=$('#fetchOfficialItemStatus');
 const courtInput=$('#officialCourt'),caseInput=$('#officialCase'),itemInput=$('#officialItemNo');
 const court=courtInput.value.trim().normalize('NFC');
 const caseNumber=caseInput.value.trim().normalize('NFC').replace(/\s+/g,'');
 const rawItem=itemInput.value.trim();
 if(court!=='서울중앙지방법원'){status.textContent='현재 서울중앙지방법원만 자동 조회할 수 있어요.';return;}
 if(!/^20\d{2}타경\d{1,12}$/.test(caseNumber)){status.textContent='사건번호를 올바르게 입력해 주세요.';return;}
 if(!/^[1-9]\d{0,3}$/.test(rawItem)){status.textContent='물건번호를 1 이상의 숫자로 입력해 주세요.';return;}
 const itemNo=String(Number(rawItem)),snapshot=[court,caseNumber,itemNo];
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 button.disabled=true;status.textContent='법원 물건정보 조회 중…';
 try{
  const endpoint=COURT_ITEM_URL+'?courtCode=B000210&caseNo='+encodeURIComponent(caseNumber)+'&itemNo='+encodeURIComponent(itemNo);
  const response=await fetch(endpoint,{method:'GET',mode:'cors',cache:'no-store',signal:controller.signal});
  const result=await response.json();
  if(!response.ok||result?.verified!==true||result.courtCode!=='B000210'||result.caseNo!==caseNumber||
     String(result.itemNo)!==itemNo||result.courtName!==court)
   throw Error(result?.error||'법원 물건정보가 입력한 사건과 일치하지 않습니다.');
  if(!status.isConnected)return;
  if(courtInput.value.trim().normalize('NFC')!==snapshot[0]||
     caseInput.value.trim().normalize('NFC').replace(/\s+/g,'')!==snapshot[1]||
     String(Number(itemInput.value.trim()))!==snapshot[2]){
    status.textContent='조회 중 사건번호 또는 물건번호가 변경됐어요. 다시 조회해 주세요.';return;
  }
  const fields=[
   {key:'address',id:'officialAddress',label:'소재지',validate:v=>typeof v==='string'&&v.trim().length>=5&&v.length<=250,
     format:v=>v.trim()},
   {key:'appraisalWon',id:'officialAppraisal',label:'감정평가액',validate:v=>Number.isSafeInteger(v)&&v>0,
     format:v=>String(v)},
   {key:'minimumWon',id:'officialMin',label:'최저매각가격',validate:v=>Number.isSafeInteger(v)&&v>0&&!result.priceAmbiguous,
     format:v=>String(v)},
   {key:'saleDate',id:'officialSaleDate',label:'매각기일',validate:v=>typeof v==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&
     !Number.isNaN(new Date(v+'T00:00:00Z').getTime()),format:v=>v}
  ];
  const patch=fields.flatMap(f=>{
    const input=document.getElementById(f.id),value=result[f.key];
    return input&&!input.value.trim()&&f.validate(value)?[{...f,input,value:f.format(value)}]:[];
  });
  if(!patch.length){status.textContent='빈 입력칸이나 확실한 법원 정보가 없어요. 물건 종류는 직접 선택해 주세요.';return;}
  const formatted=patch.map(f=>f.label+': '+(f.key==='saleDate'||f.key==='address'||f.key==='propertyType'?f.value:Number(f.value).toLocaleString('ko-KR')+'원')).join('\n');
  const warning=result.priceAmbiguous?'\n최저매각가격이 복수로 조회돼 자동 입력하지 않습니다.':'';
  if(!confirm('법원 조회 결과를 확인해 주세요.\n\n'+formatted+warning+
    '\n\n실제 원문과 대조한 후 비어 있는 칸에만 입력할까요?')){
    status.textContent='자동 입력을 취소했어요. 기존 값은 유지됩니다.';return;
  }
  if(!status.isConnected||courtInput.value.trim().normalize('NFC')!==snapshot[0]||
     caseInput.value.trim().normalize('NFC').replace(/\s+/g,'')!==snapshot[1]||
     String(Number(itemInput.value.trim()))!==snapshot[2]){
    if(status.isConnected)status.textContent='입력 내용이 변경되어 적용하지 않았어요.';return;
  }
  let applied=[];
  for(const field of patch){
   if(!field.input.isConnected||field.input.value.trim())continue;
   field.input.value=field.value;applied.push(field.label);
  }
  if(result.courtUsage&&typeof result.courtUsage==='object'){
   const usage=result.courtUsage;
   const large=$('#officialUsageLarge'),medium=$('#officialUsageMedium');
   const known=COURT_USAGE_LARGE.find(x=>x.code===usage.codes?.large&&x.name===usage.names?.large);
   if(known&&!large.value){large.value=known.name;large.dispatchEvent(new Event('change'));}
   const mid=COURT_USAGE_CATALOG.find(x=>x.level==='medium'&&x.parentCode===known?.code&&x.code===usage.codes?.medium&&x.name===usage.names?.medium);
   if(mid&&!medium.value){medium.value=mid.name;medium.dispatchEvent(new Event('change'));}
   const sub=COURT_USAGE_CATALOG.find(x=>x.level==='small'&&x.parentCode===mid?.code&&x.code===usage.codes?.small&&x.name===usage.names?.small);
   const subtype=$('#officialType');
   if(sub&&subtype&&!subtype.value)subtype.value=sub.name;
  }
  status.textContent=applied.length?'✓ 입력 완료: '+applied.join(' · ')+'. 법원 대·중·소분류를 확인한 후 사건 등록을 눌러주세요.':'확인된 주소·가격·날짜의 빈칸은 없어요. 분류는 법원 원문과 대조해 주세요.';
 }catch(error){
  if(status.isConnected)status.textContent=error.name==='AbortError'?'조회 시간이 초과됐어요. 잠시 뒤 다시 시도해 주세요.':'물건정보 조회 실패: '+(error.message||'연결을 확인해 주세요.');
 }finally{clearTimeout(timeout);if(button.isConnected)button.disabled=false;}
};

if($('#officialPdfInput'))$('#officialPdfInput').onchange=async event=>{
 const input=event.target,file=input.files?.[0],status=$('#officialPdfStatus');if(!file)return;
 status.textContent='PDF 글자 분석 중…';
 try{
  const result=await readAuctionPdfFields(file);
  if(!status.isConnected)return;
  const map={caseNum:'officialCase',court:'officialCourt',address:'officialAddress',valueWon:'officialAppraisal',minWon:'officialMin',date:'officialSaleDate'};
  const names={caseNum:'사건번호',court:'법원',address:'소재지',valueWon:'감정가',minWon:'최저가',date:'매각기일'};
  const filled=[];
  for(const [field,id] of Object.entries(map)){
   const value=result.fields[field],element=document.getElementById(id);
   if(value===null||value===undefined||value===''||!element||element.value.trim())continue;
   element.value=String(value);filled.push(names[field]);
  }
  status.textContent=filled.length?'PDF 자동 입력: '+filled.join(' · ')+' ('+result.readPages+'/'+result.totalPages+'페이지 읽음). 원문과 대조한 후 등록하세요.':'확실하게 추출할 수 있는 정보가 없어요. 법원 원문을 확인해 직접 입력하세요.';
 }catch(error){if(status.isConnected)status.textContent='PDF 분석 실패: '+(error.message||'파일을 확인해 주세요.');}
 finally{input.value='';}
};
if($('#detailPdfInput'))$('#detailPdfInput').onchange=async event=>{
 const input=event.target,file=input.files?.[0],status=$('#detailPdfStatus');if(!file)return;
 const id=state.detail;
 status.textContent='PDF 글자 분석 중…';
 try{
  const result=await readAuctionPdfFields(file);
  if(state.page!=='detail'||state.detail!==id)return;
  const current=registeredProperties().find(p=>p.id===id);
  if(!current)throw Error('등록된 사건이 없어요.');
  if(result.fields.caseNum&&result.fields.caseNum!==current.case)throw Error('다른 사건번호의 PDF예요.');
  if(result.fields.court&&result.fields.court!==current.court)throw Error('법원이 다른 PDF예요.');
  const patch={};
  if(result.fields.valueWon!==null&&!(current.valueWon>0))patch.valueWon=result.fields.valueWon;
  if(result.fields.minWon!==null&&!(current.minWon>0))patch.minWon=result.fields.minWon;
  if(result.fields.date&&!current.date)patch.date=result.fields.date.replaceAll('-','.');
  const labels={valueWon:'감정가',minWon:'최저가',date:'매각기일'};
  const summary=Object.entries(patch).map(([k,v])=>labels[k]+': '+(k==='date'?v:prettyPrice(v))).join('\n');
  if(!summary){status.textContent='추가할 수 있는 미확인 항목이 없어요.';return;}
  if(!confirm('PDF에서 추출한 정보예요. 법원 원문과 일치하는지 확인한 후 적용해 주세요.\n\n'+summary+'\n\n미확인 칸에 입력할까요?')){status.textContent='변경하지 않았어요.';return;}
  Object.assign(current,patch);write();render();showSavedCheck('개요 보완 완료');
 }catch(error){if(status.isConnected)status.textContent='PDF 분석 실패: '+(error.message||'파일을 확인해 주세요.');}
 finally{input.value='';}
};

if($('#officialRecordForm'))$('#officialRecordForm').onsubmit=event=>{
 event.preventDefault();
 const previous=registeredProperties().find(p=>p.id===state.editRealId)||null;
 const court=$('#officialCourt').value.trim(),caseNumber=$('#officialCase').value.trim().replace(/\s+/g,''),itemNo=$('#officialItemNo').value.trim()||'1',name=$('#officialAddress').value.trim();
 const selectedType=$('#officialType').value.trim(),usageLarge=$('#officialUsageLarge').value,usageMedium=$('#officialUsageMedium').value.trim();
 const codeSet=usageCodesForNames(usageLarge,usageMedium,selectedType);
 const chosen=Boolean(codeSet.large&&codeSet.medium&&codeSet.small);
 const emptyClassification=!usageLarge&&!usageMedium&&!selectedType;
 if(!chosen&&!(previous&&emptyClassification)){toast('법원 대·중·소분류를 모두 선택해 주세요.');return;}
 const type=chosen?selectedType:previous.type;
 const courtUsage=chosen?{codes:codeSet,names:{large:usageLarge,medium:usageMedium,small:selectedType},source:'user-verified'}:previous.courtUsage;
 const minWon=$('#officialMin').value.trim()===''?null:Number($('#officialMin').value),valueWon=$('#officialAppraisal').value.trim()===''?null:Number($('#officialAppraisal').value),date=$('#officialSaleDate').value.replaceAll('-','.');
 if(!/^\d{4}타경\d{1,10}$/.test(caseNumber)){toast('사건번호는 2025타경12345 형식으로 입력해 주세요.');return;}
 if(!/^\d{1,4}$/.test(itemNo)||!court||!name||(minWon!==null&&(!Number.isSafeInteger(minWon)||minWon<0))||(valueWon!==null&&(!Number.isSafeInteger(valueWon)||valueWon<0))){toast('법원·소재지·가격·물건번호를 확인해 주세요.');return;}
 const id=realCaseId(court,caseNumber,itemNo);
 if(previous&&id!==previous.id){toast('사건번호와 물건번호는 변경할 수 없습니다.');return;}
 const record={...(previous||{}),id,userRegistered:true,name,court,case:caseNumber,itemNo,type,courtUsage,minWon,valueWon,date,sourceUrl:previous?.sourceUrl||OFFICIAL_AUCTION_URL,enteredAt:previous?.enteredAt||Date.now(),...(previous?{editedAt:Date.now()}:{})};
 if(!validateRealProperty(record)){toast('등록 내용의 형식을 확인해 주세요.');return;}
 if(!previous&&registeredProperties().some(x=>x.id===id)){toast('같은 법원·사건·물건번호가 이미 등록돼 있어요.');return;}
 saved.realProperties=previous?registeredProperties().map(p=>p.id===previous.id?record:p):[...registeredProperties(),record];
 write();state.editRealId=null;nav('detail',{detail:id,detailTab:'overview'});showSavedCheck(previous?'수정 완료':'사건 등록 완료');
};
document.querySelectorAll('[data-delete-real]').forEach(btn=>btn.onclick=()=>{
 const id=btn.dataset.deleteReal,p=registeredProperties().find(x=>x.id===id);if(!p)return;
 if(!confirm(p.case+' 물건 '+p.itemNo+'번의 직접 등록 기록을 삭제할까요?'))return;
 saved.realProperties=registeredProperties().filter(x=>x.id!==id);
 saved.favorites=saved.favorites.filter(x=>x!==id);
 write();render();toast('등록 기록을 삭제했어요.');
});
if($('#homeSearch')){
  const input=$('#homeSearch');
  let composing=false;
  input.addEventListener('compositionstart',()=>{composing=true});
  input.addEventListener('compositionend',()=>{composing=false});
  $('#homeSearchForm').addEventListener('submit',e=>{
    e.preventDefault();
    if(composing||e.isComposing)return;
    state.search=input.value.normalize('NFC').trim();
    input.blur();nav('search');
  });
  input.addEventListener('change',()=>{state.search=input.value.normalize('NFC').trim()});
}
if($('#searchForm')){
  const input=$('#query'),form=$('#searchForm');
  let composing=false;
  input.addEventListener('compositionstart',()=>{composing=true});
  input.addEventListener('compositionend',()=>{composing=false});
  // iOS Korean keyboard can be disrupted by *any* DOM update during typing.
  // Search and rerender only after explicit submit, never on each keystroke.
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(composing||e.isComposing)return;
    state.search=input.value.normalize('NFC').trim();
    input.blur();render();
  });
}
if($('#searchCourtResults'))$('#searchCourtResults').onclick=()=>{
 const input=$('#query'),term=String(input?.value??state.search).normalize('NFC').trim();
 const region=['서울','경기','인천'].includes(state.region)?state.region:'전체';
 state.search=term;
 nav('capital',{capitalQuery:term,capitalRegion:region,capitalType:'전체',capitalLimit:40,capitalFocusId:'',capitalReviewDate:'',capitalReviewStage:''});
};
if($('#detailFilters'))$('#detailFilters').onclick=()=>nav('advanced');if($('#specialFilters'))$('#specialFilters').onclick=()=>nav('special');if($('#clearFilters'))$('#clearFilters').onclick=()=>{state.region='전체';state.minPrice='';state.maxPrice='';render();};if($('#advPriceUnit')){
 const unitSelect=$('#advPriceUnit');
 const fields=['advMin','advMax'].map(id=>document.getElementById(id));
 const getWon=(input,unit)=>input.dataset.displayed==='1'?(input.dataset.won===''?null:Number(input.dataset.won)):priceFromInput(input.value,unit);
 function showWon(input,won){
  if(Number.isNaN(won)){input.classList.add('price-invalid');return;}
  input.classList.remove('price-invalid');
  input.dataset.won=won===null?'':String(won);
  input.dataset.displayed='1';
  input.value=won===null?'':prettyPrice(won);
 }
 fields.forEach(input=>{
  input.addEventListener('focus',()=>{if(input.dataset.displayed!=='1')return;input.value=input.dataset.won===''?'':numberInUnit(input.dataset.won,unitSelect.value);input.dataset.displayed='0';});
  input.addEventListener('input',()=>input.classList.remove('price-invalid'));
  input.addEventListener('blur',()=>showWon(input,getWon(input,unitSelect.value)));
 });
 unitSelect.addEventListener('change',()=>{
  const previousUnit=state.priceUnit||'원',nextUnit=unitSelect.value;
  fields.forEach(input=>showWon(input,getWon(input,previousUnit)));
  state.priceUnit=nextUnit;
 });
}
if($('#applyAdvanced'))$('#applyAdvanced').onclick=()=>{
  const region=$('#advRegion').value,filter=$('#advType').value,unit=$('#advPriceUnit').value;
  const readField=id=>{const el=document.getElementById(id);return el.dataset.displayed==='1'?(el.dataset.won===''?null:Number(el.dataset.won)):priceFromInput(el.value,unit);};
  const min=readField('advMin'),max=readField('advMax');
  if(Number.isNaN(min)||Number.isNaN(max)||(min!==null&&max!==null&&min>max))return toast('금액과 최소·최대 범위를 확인해주세요.');
  state.region=region;state.filter=filter;
  state.minPrice=min===null?'':String(min);state.maxPrice=max===null?'':String(max);
  state.priceUnit=unit;
  state.search=$('#advCase').value.normalize('NFC').trim();nav('search');
};
if($('#resetAdvanced'))$('#resetAdvanced').onclick=()=>{state.region='전체';state.filter='전체';state.search='';state.minPrice='';state.maxPrice='';state.priceUnit='원';render();};
if($('#specialBack'))$('#specialBack').onclick=()=>goBack();if($('#openCourtDetail'))$('#openCourtDetail').onclick=()=>window.open(OFFICIAL_AUCTION_URL,'_blank','noopener');
if($('#favBtn'))$('#favBtn').onclick=()=>{const wasSaved=saved.favorites.includes(state.detail);saved.favorites=wasSaved?saved.favorites.filter(i=>i!==state.detail):[...saved.favorites,state.detail];write();render();toast(wasSaved?'관심물건에서 해제했어요.':'관심물건에 저장했어요.');};document.querySelectorAll('[data-detail-tab]').forEach(btn=>btn.onclick=()=>{state.detailTab=btn.dataset.detailTab;render();});if($('#rightsBtn'))$('#rightsBtn').onclick=()=>nav('rights',{rightsPropertyId:state.detail});attachRightsEditor();attachRightsScenario();if($('#noteSearchForm')){
 const form=$('#noteSearchForm'),input=$('#noteSearchInput');
 let composing=false;
 input.addEventListener('compositionstart',()=>composing=true);
 input.addEventListener('compositionend',()=>composing=false);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  if(composing||event.isComposing)return;
  state.noteQuery=input.value.normalize('NFC').trim();
  input.blur();
  render();
 });
}
if($('#noteSort'))$('#noteSort').onchange=event=>{state.noteSort=event.target.value;render();};
if($('#checkUpdate'))$('#checkUpdate').onclick=()=>updateState.available?applyAppUpdate():inspectAppUpdate(true);
updateUpdateStatus();
document.querySelectorAll('[data-study-category]').forEach(btn=>btn.onclick=()=>{state.studyCategory=btn.dataset.studyCategory;render();});
if($('#createCategorizedNote'))$('#createCategorizedNote').onclick=()=>nav('note',{note:null,noteTopicDraft:''});
document.querySelectorAll('[data-create-topic]').forEach(btn=>btn.onclick=()=>nav('note',{note:null,noteTopicDraft:btn.dataset.createTopic}));
if($('#noteCategory'))$('#noteCategory').onchange=()=>{
 const select=$('#noteTopic'),category=$('#noteCategory').value;
 const previously=select.value;
 select.innerHTML='<option value="">연결하지 않음</option>'+studyTopicOptions(category).map(topic=>'<option value="'+escapeHtml(topic.id)+'">'+escapeHtml(topic.name)+'</option>').join('');
 select.value=normalizedStudyTopic(previously,category);
};
document.querySelectorAll('[data-note-edit]').forEach(btn=>btn.onclick=()=>nav('note',{note:Number(btn.dataset.noteEdit)}));
document.querySelectorAll('[data-note-remove]').forEach(btn=>btn.onclick=async()=>{
 const id=Number(btn.dataset.noteRemove);
 const n=saved.notes.find(x=>x.id===id);
 if(!n)return;
 if(!confirm('노트 "'+n.title+'"을(를) 삭제할까요?'))return;
 try{await attachmentDeleteNote(id);}catch(err){toast('첨부파일 삭제 실패');return;}
 saved.notes=saved.notes.filter(x=>x.id!==id);
 clearDraft(id);write();render();toast('노트를 삭제했어요.');
});
if($('#addNote'))$('#addNote').onclick=()=>nav('note',{note:null,noteTopicDraft:''});
if($('#saveNote'))$('#saveNote').onclick=async()=>{
 const title=$('#noteTitle').value.trim(),category=normalizedStudyCategory($('#noteCategory').value),topicId=normalizedStudyTopic($('#noteTopic').value,category);
 if(!title)return toast('제목을 입력하세요.');
 const {body,annotations,sources}=activeNoteEditor?activeNoteEditor.getData():{body:$('#noteBody').value.trim(),annotations:[],sources:[]};
 const button=$('#saveNote');button.disabled=true;
 try{
  const files=activeNoteEditor?await activeNoteEditor.attachments.getFiles():[];
  const now=Date.now(),oldNote=state.note?saved.notes.find(x=>x.id===state.note):null;
  if(state.note&&!oldNote)throw Error('노트를 찾지 못했어요.');
  const uniqueId=oldNote?oldNote.id:now+Math.max(0,...saved.notes.map(n=>Math.max(0,n.id-now+1)));
  // Commit file bytes before updating note metadata, so storage failures cannot silently lose attachments.
  if(files.length||oldNote&&activeNoteEditor.attachments.changed)await attachmentReplaceForNote(uniqueId,files);
  if(oldNote)Object.assign(oldNote,{title,body,annotations,sources,category,topicId,updatedAt:now});
  else saved.notes.unshift({id:uniqueId,title,body,annotations,sources,category,topicId,updatedAt:now});
  write();setEditorDirty(false);clearDraft(state.note);nav('study');showSavedCheck('노트 저장 완료');
 }catch(err){toast('노트 저장 실패: '+(err.message||'첨부파일을 확인해 주세요.'));button.disabled=false;}
};
if($('#deleteNote'))$('#deleteNote').onclick=async()=>{
 if(!confirm('노트를 삭제할까요?'))return;
 try{await attachmentDeleteNote(state.note);}catch(err){toast('첨부파일 삭제에 실패했어요.');return;}
 saved.notes=saved.notes.filter(x=>x.id!==state.note);
 write();setEditorDirty(false);clearDraft(state.note);nav('study');toast('노트를 삭제했어요.');
};
if($('#export'))$('#export').onclick=async()=>{
 try{
  const attachments=await allAttachments();
  if(!confirm('백업할 자료를 확인해 주세요.\n'+backupSummary(saved,attachments)+'\n\n현재 저장된 데이터만 백업됩니다. 아직 노트 저장 버튼을 누르지 않은 편집 내용은 포함되지 않아요.\n\n백업 파일을 생성할까요?'))return;
  const payload={version:3,exportedAt:new Date().toISOString(),data:saved,attachments,preferences:{quickMenu:quickMenuIds.slice()}};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='auction-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),6000);
  localStorage.setItem(STORAGE_STAMP_KEY,new Date().toISOString());toast('백업 파일 생성 요청을 보냈어요. 아이폰 파일 앱에서 저장 여부를 확인해 주세요.');
 }catch(err){toast('백업 실패: 첨부파일 저장소를 확인해 주세요.');}
};
if($('#import'))$('#import').onchange=async event=>{
 try{
  const file=event.target.files?.[0];if(!file)return;
  const payload=JSON.parse(await file.text());
  if(!payload.data||!Array.isArray(payload.data.favorites)||!Array.isArray(payload.data.notes))throw Error('백업 파일 형식 오류');
  if(payload.data.courtFavorites!==undefined&&(!Array.isArray(payload.data.courtFavorites)||payload.data.courtFavorites.length>COURT_FAVORITES_LIMIT||payload.data.courtFavorites.some(x=>!validCourtFavorite(x))||new Set(payload.data.courtFavorites.map(x=>x.id)).size!==payload.data.courtFavorites.length))throw Error('법원 관심물건 백업 데이터 오류');
  if(payload.data.realProperties!==undefined&&(!Array.isArray(payload.data.realProperties)||payload.data.realProperties.some(x=>!validateRealProperty(x))))throw Error('직접 등록 사건 데이터 오류');
  if(payload.data.notes.some(n=>!n||!Number.isFinite(Number(n.id))||typeof n.title!=='string'||typeof n.body!=='string'))throw Error('노트 데이터 형식 오류');
  if(payload.data.rightsDrafts!==undefined&&(!Array.isArray(payload.data.rightsDrafts)||payload.data.rightsDrafts.length>100||
   payload.data.rightsDrafts.some(x=>window.RightsDraftSchema?.validateRightsDraft(x).valid!==true)||
   new Set(payload.data.rightsDrafts.map(x=>x.propertyId)).size!==payload.data.rightsDrafts.length))
   throw Error('권리분석 백업 데이터 오류');
  const attachments=payload.version>=2?payload.attachments:[];
  const hasQuickMenu=payload.version>=3&&payload.preferences&&Object.prototype.hasOwnProperty.call(payload.preferences,'quickMenu');
  const backedQuickMenu=hasQuickMenu?payload.preferences.quickMenu:null;
  if(hasQuickMenu&&(!Array.isArray(backedQuickMenu)||new Set(backedQuickMenu).size!==backedQuickMenu.length||backedQuickMenu.some(id=>!QUICK_MENU_ITEMS.some(item=>item.id===id))))throw Error('빠른 메뉴 백업 데이터 오류');
  if(!Array.isArray(attachments)||attachments.some(x=>!verifyAttachment(x)))throw Error('첨부파일 형식 오류');
  const before=await allAttachments();
  const destination=payload.data;
  if(!Array.isArray(destination.realProperties))destination.realProperties=[];
  const summary='백업 파일 ('+backupSummary(destination,attachments)+')\n현재 앱 ('+backupSummary(saved,before)+')'+
   '\n빠른 메뉴: '+(hasQuickMenu?'백업 설정 복원':'기존 기기 설정 유지');
  if((saved.rightsDrafts?.length||0)>0&&!(destination.rightsDrafts?.length)&&
   !confirm('주의: 선택한 백업에는 권리분석 기록이 없습니다. 기존 권리분석 '+saved.rightsDrafts.length+'건이 복원으로 사라집니다. 계속할까요?'))return;
  if(!confirm(summary+'\n\n복원하면 현재 앱의 저장 자료를 백업 내용으로 교체합니다. 계속할까요?'))return;
  if(destination.notes.length===0&&saved.notes.length>0){
   if(!confirm('주의: 선택한 백업 파일에는 노트가 0개입니다.\n현재 노트 '+saved.notes.length+'개가 모두 없어질 수 있어요.\n\n그래도 빈 노트 백업으로 교체할까요?'))return;
  }
  const oldSaved=saved,oldQuickMenu=quickMenuIds.slice();
  try{
   await attachmentRestoreAll(attachments);
   saved=destination;
   write();
   if(hasQuickMenu)persistQuickMenu(backedQuickMenu.slice());
  }catch(err){
   saved=oldSaved;
   try{write();}catch{}
   try{persistQuickMenu(oldQuickMenu);}catch{}
   try{await attachmentRestoreAll(before);}catch(rollbackError){toast('복구 실패: 기존 백업 파일을 보존해 주세요.');throw rollbackError;}
   throw err;
  }
  render();showSavedCheck('복원 완료');
 }catch(err){toast('복원 실패: '+(err.message||'파일을 확인해 주세요.'));}
 finally{event.target.value='';}
}}render();initGestureNavigation();if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});initUpdateMonitoring();void confirmAppliedUpdate();