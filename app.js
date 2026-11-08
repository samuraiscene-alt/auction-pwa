const $=s=>document.querySelector(s);const APP_VERSION='0.3.9';const STORE='auction_skeleton_v1';let state={page:'home',filter:'전체',selected:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0'),viewMonth:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'),calendarFavoritesOnly:false,detail:null,note:null,search:'',region:'전체',minPrice:'',maxPrice:'',priceUnit:'원',detailTab:'overview',favoriteSort:'recent',favoriteType:'전체',noteQuery:'',noteSort:'recent',studyCategory:'전체',noteTopicDraft:''};let saved;try{saved=JSON.parse(localStorage.getItem(STORE))||{favorites:[],notes:[]}}catch{saved={favorites:[],notes:[]}}const write=()=>{
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
 if(updateState.checking)return '업데이트 확인 중…';
 if(updateState.available)return '새 버전 v'+updateState.latest+' 준비됨';
 if(!navigator.onLine)return '오프라인 · 저장한 자료 사용 가능';
 return '최신 버전 v'+APP_VERSION;
}
function updateUpdateStatus(){
 const info=$('#appUpdateState');
 if(info)info.textContent=statusText();
 const button=$('#checkUpdate');
 if(button){button.disabled=updateState.checking;button.textContent=updateState.available?'업데이트 적용':'업데이트 확인';}
 const row=$('#updateAvailableMessage');
 if(row)row.hidden=!updateState.available;
}
async function inspectAppUpdate(announce=false){
 if(!('serviceWorker'in navigator)||location.protocol==='file:'){
  if(announce)toast('이 환경에서는 자동 업데이트를 사용할 수 없어요.');return;
 }
 if(updateState.checking)return;
 updateState.checking=true;updateUpdateStatus();
 try{
  const reg=await navigator.serviceWorker.getRegistration('./');
  if(reg){updateState.registration=reg;await reg.update();}
  const response=await fetch('./VERSION.txt?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('버전 확인 응답 오류');
  const remote=(await response.text()).trim().split(/\s+/)[0];
  if(!/^\d+\.\d+\.\d+$/.test(remote))throw Error('버전 정보 오류');
  updateState.latest=remote;
  const toNums=v=>v.split('.').map(Number);
  const local=toNums(APP_VERSION),next=toNums(remote);
  updateState.available=next.some((n,i)=>n>local[i]&&next.slice(0,i).every((x,j)=>x===local[j]));
  updateState.network=true;
  if(announce)toast(updateState.available?'업데이트가 준비됐어요.':'현재 최신 버전입니다.');
 }catch(err){
  updateState.network=false;
  if(announce)toast(navigator.onLine?'업데이트 확인 실패 · 연결을 확인해 주세요.':'인터넷에 연결한 뒤 확인해 주세요.');
 }finally{updateState.checking=false;updateUpdateStatus();}
}
function applyAppUpdate(){
 if(editorDirty){
  toast('작성 중인 노트를 먼저 저장해 주세요.');
  return;
 }
 if(updateState.available)location.reload();
 else inspectAppUpdate(true);
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
  &&item.data.startsWith('data:')&&(item.type==='application/pdf'||item.type.startsWith('image/'));
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
const properties=[{id:'demo1',type:'아파트',name:'서울 강남구 아파트',court:'서울중앙지방법원',case:'2026타경12345',value:'12억 5,000만원',min:'8억 7,500만원',date:'2026.11.17',flag:'2회 유찰'},{id:'demo2',type:'빌라',name:'경기 성남시 다세대주택',court:'수원지방법원',case:'2026타경23456',value:'4억 8,000만원',min:'3억 3,600만원',date:'2026.11.18',flag:'추가 확인'},{id:'demo3',type:'단독주택',name:'서울 성북구 단독주택',court:'서울북부지방법원',case:'2026타경34567',value:'5억 9,000만원',min:'4억 1,300만원',date:'2026.11.20',flag:'1회 유찰'}];const titles={home:'부동산 경매',search:'통합검색',schedule:'경매일정',favorites:'관심물건',study:'경매 공부방',advanced:'상세검색',special:'특수물건 검색',detail:'물건 상세',rights:'권리분석',note:'공부 노트',settings:'설정'};function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(window.tt);window.tt=setTimeout(()=>$('#toast').classList.remove('show'),2200)}
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
 return '관심물건 '+data.favorites.length+'개 · 노트 '+data.notes.length+'개 · 첨부파일 '+attachments.length+'개';
}
const MAIN_TABS=['home','search','schedule','favorites','study'];
let appDepth=0;
const viewHistory=new Map();
function snapshot(){return {page:state.page,filter:state.filter,selected:state.selected,viewMonth:state.viewMonth,calendarFavoritesOnly:state.calendarFavoritesOnly,detail:state.detail,note:state.note,search:state.search,region:state.region,minPrice:state.minPrice,maxPrice:state.maxPrice,priceUnit:state.priceUnit,detailTab:state.detailTab,favoriteSort:state.favoriteSort,favoriteType:state.favoriteType,noteQuery:state.noteQuery,noteSort:state.noteSort,studyCategory:state.studyCategory,noteTopicDraft:state.noteTopicDraft}}
viewHistory.set(0,snapshot());
history.replaceState({auctionApp:true,depth:0,view:snapshot()},'',location.pathname+location.search);
function nav(page,extra={}){
  if(!titles[page])return;
  if(state.page==='note'&&page!=='note')persistNoteDraft();
  if(page===state.page&&Object.keys(extra).length===0)return;
  state={...state,...extra,page};
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
    try{return ({home,search,schedule,favorites,study,advanced,special,detail,rights,note,settings})[page]();}
    finally{state.page=previous}
  }
  function previousPage(){
    const record=viewHistory.get(appDepth-1);
    if(record&&titles[record.page])return record.page;
    return ({rights:'detail',detail:'search',note:'study',settings:'home',advanced:'search',special:'search'})[state.page]||'home';
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
function setTab(page){nav(page)}function tabs(){return ['home','search','schedule','favorites','study'].map((p,i)=>`<button class="${state.page===p?'active':''}" data-page="${p}"><span>${['⌂','⌕','▦','♡','▤'][i]}</span>${['홈','검색','일정','관심','공부방'][i]}</button>`).join('')}function card(p){
  const amount=DEMO_PRICES[p.id];
  return `<div class="listItem auction-card" data-detail="${p.id}"><div class="thumb">⌂</div><div class="itemContent"><div class="auction-card-top"><span class="auction-type">${escapeHtml(p.type)}</span><span class="auction-demo">예시</span></div><strong>${escapeHtml(p.name)}</strong><p>${escapeHtml(p.court)} · ${escapeHtml(p.case)}</p><div class="auction-price-label">최저입찰가</div><span class="price">${prettyPrice(amount)}</span><p>감정가 ${escapeHtml(p.value)} · ${escapeHtml(p.flag)}</p></div><span class="arrow">›</span></div>`;
}
function home(){return `<section class="hero dashboard"><div class="dash-heading"><div><p class="dash-kicker">MY AUCTION · 나의 경매 현황</p><h2>오늘도 좋은 물건을<br>차근차근 찾아봐요.</h2></div><span class="dash-mark" aria-hidden="true">⌂</span></div><div class="dash-stats"><button type="button" class="dash-stat" data-page="favorites"><span class="dash-stat-label"><span class="dashboard-heart">♥</span> 관심물건</span><strong>${saved.favorites.length}<small>건</small></strong></button><button type="button" class="dash-stat" data-page="study"><span class="dash-stat-label">▤ 공부 노트</span><strong>${saved.notes.length}<small>개</small></strong></button></div><p class="dash-disclaimer">현재 예시 경매물건으로 구성된 UI 테스트 버전이에요.</p></section><input id="homeSearch" class="search" placeholder="⌕  지역, 주소, 사건번호로 검색" value="${escapeHtml(state.search)}"><div class="section"><h2>빠른 메뉴</h2></div><div class="grid"><button class="quick" data-page="search"><b>♜</b>법원검색</button><button class="quick" data-page="search"><b>⌖</b>주소검색</button><button class="quick" data-page="search"><b>#</b>사건번호</button><button class="quick" data-page="study"><b>▤</b>공부방</button></div><div class="section"><h2>최근 경매물건</h2><span class="muted">예시 데이터</span></div>${properties.slice(0,2).map(card).join('')}<div class="section"><h2>다가오는 입찰일</h2></div><div class="card line"><div><strong>11월 17일 화요일</strong><p class="tiny">선택 날짜의 가상 일정</p></div><button class="miniButton" data-page="schedule">일정 보기 ›</button></div>`}function matchingProperties(){
  const query=state.search.trim().normalize('NFC').toLocaleLowerCase('ko');
  const min=state.minPrice===''?null:Number(state.minPrice);
  const max=state.maxPrice===''?null:Number(state.maxPrice);
  return properties.filter(p=>{
    const matchesText=!query||[p.name,p.case,p.court,p.type].some(v=>v.normalize('NFC').toLocaleLowerCase('ko').includes(query));
    const matchesType=state.filter==='전체'||p.type===state.filter;
    const matchesRegion=state.region==='전체'||p.name.startsWith(state.region);
    const price=DEMO_PRICES[p.id];
    return matchesText&&matchesType&&matchesRegion&&(min===null||price>=min)&&(max===null||price<=max);
  });
}
function search(){
  const rows=matchingProperties();
  const tags=[state.region!=='전체'?state.region:null,state.minPrice!==''?prettyPrice(state.minPrice)+' 이상':null,state.maxPrice!==''?prettyPrice(state.maxPrice)+' 이하':null].filter(Boolean);
  return `<div class="card"><label class="label" for="query">물건 찾아보기</label><form class="search-form" id="searchForm" role="search"><input class="search" id="query" type="search" enterkeyhint="search" autocomplete="off" placeholder="지역, 건물명, 사건번호" value="${escapeHtml(state.search)}"><button type="submit" class="search-submit">검색</button></form><div class="filters">${['전체','아파트','빌라','단독주택'].map(v=>`<button class="chip ${state.filter===v?'active':''}" data-filter="${v}">${v}</button>`).join('')}</div><div class="row"><button class="secondary" id="detailFilters">⚙ 상세검색</button><button class="secondary" id="specialFilters">⚖ 특수물건</button></div>${tags.length?`<div class="applied-filters">${tags.map(x=>`<span class="pill">${escapeHtml(x)}</span>`).join('')}<button class="clear-filter" id="clearFilters">초기화</button></div>`:''}</div><div class="section"><h2>검색 결과 <span class="result-count">${rows.length}건</span></h2><span class="muted">화면 테스트용 가상 물건</span></div><div id="searchResults">${rows.map(card).join('')||'<div class="empty">조건에 맞는 예시 물건이 없어요.<br>검색 조건을 변경해 보세요.</div>'}</div>`;
}
function advanced(){
  const unit=state.priceUnit||'원';
  return `<div class="card search-panel"><div class="search-intro"><strong>원하는 물건을 골라보세요</strong><p>조건을 선택하면 예시 물건에서 검색해요.</p></div>
  <label class="label" for="advRegion">지역</label><select class="select" id="advRegion">${['전체','서울','경기','인천','부산','대구'].map(v=>`<option ${state.region===v?'selected':''} value="${v}">${v==='전체'?'전국':v}</option>`).join('')}</select>
  <label class="label" for="advType">물건 종류</label><select class="select" id="advType">${['전체','아파트','빌라','단독주택'].map(v=>`<option ${state.filter===v?'selected':''} value="${v}">${v==='전체'?'전체 물건':v}</option>`).join('')}</select>
  <div class="line price-unit-line"><label class="label">최저입찰가</label><label class="label unit-picker-label" for="advPriceUnit">입력 단위 <select class="select unit-picker" id="advPriceUnit">${['원','만원','억원'].map(v=>`<option value="${v}" ${unit===v?'selected':''}>${v}</option>`).join('')}</select></label></div>
  <div class="row price-range"><div class="price-field"><input id="advMin" class="search" type="text" inputmode="decimal" autocomplete="off" placeholder="최소 금액" value="${escapeHtml(state.minPrice!==''?prettyPrice(state.minPrice):'')}" data-won="${escapeHtml(state.minPrice)}" data-displayed="1"></div><div class="price-field"><input id="advMax" class="search" type="text" inputmode="decimal" autocomplete="off" placeholder="최대 금액" value="${escapeHtml(state.maxPrice!==''?prettyPrice(state.maxPrice):'')}" data-won="${escapeHtml(state.maxPrice)}" data-displayed="1"></div></div>
  <div class="price-help">예: 2000000000원 = 20억원 · 원/만원/억원 중 선택</div>
  <label class="label" for="advCase">사건번호·주소·건물명</label><input class="search" id="advCase" placeholder="예: 2026타경12345" value="${escapeHtml(state.search)}"><button class="primary" id="applyAdvanced">이 조건으로 검색하기</button><button class="secondary full-secondary" id="resetAdvanced">검색 조건 초기화</button></div><p class="helper">법원 실시간 경매자료는 아직 연동되지 않았으며, 검색 조건은 예시 데이터에만 적용돼요.</p>`;
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
function calendarItems(date){
  return properties.filter(p=>p.date.replaceAll('.','-')===date
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
    const count=properties.filter(p=>p.date.replaceAll('.','-')===date).length;
    const favCount=properties.filter(p=>p.date.replaceAll('.','-')===date&&saved.favorites.includes(p.id)).length;
    const visible=state.calendarFavoritesOnly?favCount:count;
    return `<button type="button" class="day calendar-day ${state.selected===date?'selected':''} ${date===today?'today':''}" data-day="${date}" aria-label="${month}월 ${day}일, 예시 일정 ${visible}건"><span>${day}</span>${visible?'<span class="calendar-dot '+(favCount?'favorite-dot':'')+'"></span>':''}</button>`;
  });
  const chosen=state.selected;
  const items=calendarItems(chosen);
  const actualCount=properties.filter(p=>p.date.replaceAll('.','-')===chosen).length;
  return `<div class="card calendar-shell"><div class="calendar-toolbar"><button type="button" class="calendar-arrow" id="prevMonth" aria-label="이전 달">‹</button><strong>${label}</strong><button type="button" class="calendar-arrow" id="nextMonth" aria-label="다음 달">›</button><button type="button" class="calendar-today" id="todayMonth">오늘</button></div><div class="calendar-caption"><span>● 예시 입찰일</span><span class="favorite-key">● 관심물건</span></div><div class="calendar">${week.map((d,i)=>`<div class="weekday ${i===0?'sun':''}">${d}</div>`).join('')}${Array(offset).fill('<div class="calendar-blank"></div>').join('')}${dates.join('')}</div><div class="calendar-filter"><label><input type="checkbox" id="favCalendarOnly" ${state.calendarFavoritesOnly?'checked':''}> 관심물건 일정만 표시</label><span>예시 일정만 제공</span></div></div><div class="section"><h2>${Number(chosen.slice(5,7))}월 ${Number(chosen.slice(-2))}일 일정</h2><span class="muted">${items.length}건 · 가상 데이터</span></div>${items.map(card).join('')||(state.calendarFavoritesOnly&&actualCount?'<div class="empty">선택한 날짜에 관심물건으로 저장한 예시 일정이 없어요.</div>':'<div class="empty">선택한 날짜에 표시할 예시 입찰일정이 없어요.</div>')}<p class="helper">법원 실시간 일정과 자동 변경 알림은 아직 연동되지 않았어요. 실제 입찰일은 반드시 법원 공고에서 확인해 주세요.</p>`;
}
function sortedFavorites(){
  const selected=new Set(saved.favorites);
  const list=properties.filter(p=>selected.has(p.id));
  if(state.favoriteType!=='전체')list.splice(0,list.length,...list.filter(p=>p.type===state.favoriteType));
  if(state.favoriteSort==='date')list.sort((a,b)=>a.date.localeCompare(b.date));
  else if(state.favoriteSort==='price')list.sort((a,b)=>DEMO_PRICES[a.id]-DEMO_PRICES[b.id]);
  else list.sort((a,b)=>saved.favorites.indexOf(b.id)-saved.favorites.indexOf(a.id));
  return list;
}
function favorites(){
  const list=sortedFavorites();
  const all=properties.filter(p=>saved.favorites.includes(p.id)).length;
  const filters=['전체','아파트','빌라','단독주택'];
  const controls=`<div class="favorites-toolbar"><div class="favorites-title"><h2>내 관심물건 <span>${all}건</span></h2><p>저장한 물건을 날짜와 가격순으로 정리해요.</p></div><label for="favoriteSort" class="favorite-sort-label">정렬 <select class="select favorite-sort" id="favoriteSort"><option value="recent" ${state.favoriteSort==='recent'?'selected':''}>최근 저장순</option><option value="date" ${state.favoriteSort==='date'?'selected':''}>입찰일 빠른순</option><option value="price" ${state.favoriteSort==='price'?'selected':''}>최저가 낮은순</option></select></label></div><div class="filters favorite-type-filters">${filters.map(v=>`<button class="chip ${state.favoriteType===v?'active':''}" type="button" data-favorite-type="${v}">${v}</button>`).join('')}</div>`;
  if(!all)return `${controls}<div class="empty favorites-empty"><div class="empty-symbol">♡</div><strong>아직 저장한 관심물건이 없어요.</strong><p>검색한 물건을 열고 ♡ 관심물건 저장을 눌러주세요.</p><button type="button" class="secondary" data-page="search">물건 찾아보기</button></div>`;
  return `${controls}${list.map(p=>`<article class="favorite-item"><button class="favorite-open" type="button" data-detail="${p.id}" aria-label="${escapeHtml(p.name)} 상세보기"><span class="favorite-icon">⌂</span><span class="favorite-info"><span class="auction-card-top"><span class="auction-type">${escapeHtml(p.type)}</span><span class="auction-demo">예시 물건</span></span><strong>${escapeHtml(p.name)}</strong><span class="favorite-case">${escapeHtml(p.case)}</span><span class="favorite-amount">${prettyPrice(DEMO_PRICES[p.id])}</span><span class="favorite-date">입찰 예정일(예시) · ${escapeHtml(p.date)}</span></span><span class="arrow">›</span></button><div class="favorite-actions"><button type="button" data-favorite-date="${p.id}">일정 보기</button><button type="button" class="favorite-remove" data-remove-favorite="${p.id}"><span class="favorite-heart" aria-hidden="true">♥</span> 관심 해제</button></div></article>`).join('')||'<div class="empty">선택한 종류에 저장된 물건이 없어요.</div>'}<p class="helper favorites-help">표시되는 사건번호·입찰일·가격은 화면 테스트용 가상 정보입니다.</p>`;
}
function detail(){
 const p=properties.find(x=>x.id===state.detail)||properties[0],tab=state.detailTab||'overview';
 const navTabs=[['overview','개요'],['rights','권리'],['market','시세'],['docs','서류']].map(([v,name])=>`<button type="button" class="detail-tab ${tab===v?'selected':''}" data-detail-tab="${v}" aria-pressed="${tab===v}">${name}</button>`).join('');
 let panel='';
 if(tab==='overview'){
  panel=`<div class="row"><div class="metric"><div class="smTitle">감정가</div><b>${escapeHtml(p.value)}</b></div><div class="metric"><div class="smTitle">최저입찰가</div><b class="detail-price">${prettyPrice(DEMO_PRICES[p.id])}</b></div></div><div class="divider"></div><div class="line"><span class="muted">매각기일</span><strong>${escapeHtml(p.date)}</strong></div><div class="divider"></div><div class="line"><span class="muted">물건 종류</span><strong>${escapeHtml(p.type)}</strong></div><div class="divider"></div><div class="status">⚠ 법원 서류와 점유관계는 아직 확인되지 않았어요.</div>`;
 }else if(tab==='rights'){
  panel=`<div class="detail-panel-heading">권리분석</div><div class="status">⚠ 등기·임차인·점유 자료가 연결되지 않았어요.</div><div class="info-row"><span>말소기준권리</span><strong>확인 필요</strong></div><div class="info-row"><span>임차인 현황</span><strong>확인 필요</strong></div><div class="info-row"><span>인수 가능 권리</span><strong>확인 필요</strong></div><button class="secondary full-secondary" id="rightsBtn" type="button">권리분석 상세 보기 →</button>`;
 }else if(tab==='market'){
  panel=`<div class="detail-panel-heading">시세 정보</div><div class="status">ⓘ 실거래가·현재 매물 시세는 아직 연결되지 않았어요.</div><div class="info-row"><span>감정평가액 (예시)</span><strong>${escapeHtml(p.value)}</strong></div><div class="info-row"><span>최근 실거래가</span><strong>자료 미연동</strong></div><div class="info-row"><span>시세 대비 할인율</span><strong>계산 보류</strong></div><p class="helper">감정가를 실제 거래 시세로 표시하지 않아요.</p>`;
 }else{
  panel=`<div class="detail-panel-heading">관련 서류</div><div class="status">ⓘ 법원 원본 서류는 아직 연결되지 않았어요.</div><div class="info-row"><span>매각물건명세서</span><strong>연동 전</strong></div><div class="info-row"><span>현황조사서</span><strong>연동 전</strong></div><div class="info-row"><span>감정평가서</span><strong>연동 전</strong></div><p class="helper">법원 자료를 연결한 뒤 원본 문서와 출처를 제공할 예정이에요.</p>`;
 }
 return `<div class="card auction-detail"><div class="placeholder"><div><div style="font-size:55px">⌂</div>실제 사진 미연동<br>법원 원본 사진 연결 예정</div></div><div class="auction-card-top" style="margin-top:15px"><span class="auction-type">${escapeHtml(p.type)}</span><span class="auction-demo">가상 물건</span></div><h2 class="detailTitle">${escapeHtml(p.name)}</h2><p class="muted">${escapeHtml(p.court)} · ${escapeHtml(p.case)}</p><div class="detail-tabs" role="group" aria-label="물건 상세정보 분류">${navTabs}</div><div class="detail-tab-panel">${panel}</div><button class="primary detail-favorite-btn ${saved.favorites.includes(p.id)?'is-favorite':'is-not-favorite'}" id="favBtn" type="button" aria-pressed="${saved.favorites.includes(p.id)}"><span class="favorite-heart" aria-hidden="true">${saved.favorites.includes(p.id)?'♥':'♡'}</span> ${saved.favorites.includes(p.id)?'관심 해제':'관심물건 저장'}</button></div><p class="helper">사건번호·가격·날짜는 모두 화면 테스트용 가상 정보이며 입찰에 이용하면 안 됩니다.</p>`;
}
function rights(){return `<div class="section"><h2>권리분석 요약</h2><span class="pill risk">자료 미연동</span></div>${[['⚖','말소기준권리','등기 서류 확인 필요'],['♙','임차인','현황조사서 확인 필요'],['♧','인수 가능성','판단 전 원본 자료 필요'],['⚠','위험요약','미확인 항목이 남아 있음']].map(a=>`<div class="card line"><span style="font-size:24px;color:#3477df">${a[0]}</span><div style="flex:1"><strong>${a[1]}</strong><p class="tiny">${a[2]}</p></div><span class="arrow">›</span></div>`).join('')}<p class="helper">임차인 관련 권리와 위험도를 자동으로 판단하지 않습니다. 후속 단계에서 출처와 법률 검증 로직을 연결합니다.</p>`}
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
 const categories=STUDY_CATEGORIES.map(c=>{
  const total=saved.notes.filter(n=>normalizedStudyCategory(n.category)===c.id).length;
  return `<button type="button" class="study-category-card ${state.studyCategory===c.id?'selected':''}" data-study-category="${escapeHtml(c.id)}"><span class="study-category-icon">${c.icon}</span><span class="study-category-text"><strong>${c.id}</strong><small>${c.desc}</small></span><span class="study-category-count">${total}개</span></button>`;
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
 <div id="attachmentViewer" class="attachment-viewer" role="dialog" aria-modal="true" aria-label="첨부파일 보기" hidden><div class="attachment-viewer-bar"><strong id="attachmentViewerName"></strong><button type="button" id="attachmentViewerClose" aria-label="첨부파일 닫기">✕</button></div><div class="attachment-viewer-content" id="attachmentViewerContent"></div><div class="attachment-viewer-controls"><div id="attachmentViewerZoom" class="attachment-zoom" hidden><button type="button" id="attachmentZoomOut" aria-label="축소">−</button><span id="attachmentZoomValue">100%</span><button type="button" id="attachmentZoomIn" aria-label="확대">＋</button><button type="button" id="attachmentZoomReset">원래 크기</button></div><div id="attachmentPdfControls" class="attachment-pdf-controls" hidden><button type="button" id="attachmentPdfPrev">이전</button><span id="attachmentPdfPage">1페이지</span><button type="button" id="attachmentPdfNext">다음</button></div><div class="attachment-pdf-extract-actions" id="attachmentExtractActions" hidden><button type="button" id="attachmentExtractToggle">문장 선택</button><button type="button" id="attachmentExtractInsert" hidden>선택 문장을 노트로</button></div><div id="attachmentExtractHint" class="attachment-extract-hint" hidden></div><button type="button" class="attachment-export" id="attachmentViewerExport">파일 내보내기</button></div></div>
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
function createAttachmentViewer(){
 const overlay=$('#attachmentViewer'),content=$('#attachmentViewerContent'),bar=$('#attachmentViewerName'),zoom=$('#attachmentViewerZoom'),pdfControls=$('#attachmentPdfControls');
 const extractActions=$('#attachmentExtractActions'),extractToggle=$('#attachmentExtractToggle'),extractInsert=$('#attachmentExtractInsert'),extractHint=$('#attachmentExtractHint');
 let url=null,scale=1,page=1,currentFile=null,loadedBlob=null,pdfDocument=null,extractMode=false,extractText='',extractTokens=[],firstToken=null,lastToken=null,viewerSeq=0;
 function resetExtract(){
  pdfDocument=null;extractMode=false;extractText='';extractTokens=[];firstToken=null;lastToken=null;
  extractActions.hidden=true;extractInsert.hidden=true;extractHint.hidden=true;extractToggle.textContent='문장 선택';
 }
 const close=()=>{
  viewerSeq++;
  overlay.hidden=true;content.replaceChildren();
  if(url){URL.revokeObjectURL(url);url=null;}
  currentFile=null;loadedBlob=null;resetExtract();document.body.classList.remove('attachment-viewing');
 };
 function setZoom(next){
  scale=Math.min(4,Math.max(1,Math.round(next*10)/10));
  const img=content.querySelector('img');if(img){img.style.width=scale*100+'%';img.style.maxWidth='none';}
  $('#attachmentZoomValue').textContent=Math.round(scale*100)+'%';
 }
 function showEmbeddedPdf(){
  content.replaceChildren();
  const frame=document.createElement('iframe');
  frame.className='attachment-pdf-frame';frame.title=currentFile?.name||'PDF';frame.src=url+'#page='+page+'&view=FitH';
  content.appendChild(frame);
  extractMode=false;firstToken=null;lastToken=null;
  extractToggle.textContent='문장 선택';extractInsert.hidden=true;extractHint.hidden=true;
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
  const sequence=viewerSeq,filename=currentFile.id;
  extractHint.hidden=false;extractHint.textContent='PDF '+page+'페이지에서 문장을 추출하는 중…';
  extractInsert.hidden=true;content.replaceChildren();
  try{
   const pdfPage=await pdfDocument.getPage(page);
   const textContent=await pdfPage.getTextContent();
   if(sequence!==viewerSeq||currentFile?.id!==filename||!extractMode)return;
   extractText=textContent.items.map(item=>String(item.str||'')+(item.hasEOL?'\n':' ')).join('').replace(/[ \t]+\n/g,'\n').trim();
   extractTokens=splitNoteUnits(extractText,'word');
   firstToken=null;lastToken=null;
   if(!extractText){
    content.innerHTML='<div class="attachment-extract-empty">이 페이지에서 선택할 수 있는 문장을 찾지 못했어요.<p>스캔 PDF라면 별도의 문자 인식(OCR)이 필요해요.</p></div>';
    extractHint.textContent='문장 추출 불가 · 일반 PDF 뷰어는 그대로 사용할 수 있어요.';
    return;
   }
   drawExtractedPage();
  }catch(err){
   if(sequence!==viewerSeq)return;
   content.innerHTML='<div class="attachment-extract-empty">이 페이지의 글자를 읽을 수 없어요. 다른 페이지나 일반 PDF 뷰어를 이용해 주세요.</div>';
   extractHint.textContent='PDF 텍스트 추출 실패';
  }
 }
 async function startExtraction(){
  if(!currentFile||!loadedBlob)return;
  const sequence=viewerSeq,fileId=currentFile.id;
  extractMode=true;extractToggle.disabled=true;
  extractHint.hidden=false;extractHint.textContent='PDF 문자 분석 기능을 불러오는 중…';
  try{
   if(!pdfDocument){
    const engine=await loadPdfTextEngine();
    if(sequence!==viewerSeq||currentFile?.id!==fileId)return;
    const bytes=new Uint8Array(await loadedBlob.arrayBuffer());
    if(sequence!==viewerSeq||currentFile?.id!==fileId)return;
    pdfDocument=await engine.getDocument({data:bytes}).promise;
   }
   if(sequence!==viewerSeq||currentFile?.id!==fileId)return;
   $('#attachmentPdfPage').textContent=page+' / '+pdfDocument.numPages+'페이지';
   await showExtractedPage();extractToggle.textContent='PDF 보기';
  }catch(err){
   if(sequence!==viewerSeq)return;
   extractMode=false;showEmbeddedPdf();
   toast('PDF 글자 분석을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
  }finally{extractToggle.disabled=false;}
 }
 function pageChange(delta){
  if(!currentFile||!(currentFile.type==='application/pdf'||/\.pdf$/i.test(currentFile.name)))return;
  const max=pdfDocument?.numPages||10000;
  page=Math.max(1,Math.min(max,page+delta));
  $('#attachmentPdfPage').textContent=page+(pdfDocument?' / '+pdfDocument.numPages:'')+'페이지';
  if(extractMode)showExtractedPage();
  else{const frame=content.querySelector('iframe');if(frame&&url)frame.src=url+'#page='+page+'&view=FitH';}
 }
 $('#attachmentViewerClose').onclick=close;
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 $('#attachmentZoomIn').onclick=()=>setZoom(scale+.5);
 $('#attachmentZoomOut').onclick=()=>setZoom(scale-.5);
 $('#attachmentZoomReset').onclick=()=>setZoom(1);
 $('#attachmentPdfPrev').onclick=()=>pageChange(-1);
 $('#attachmentPdfNext').onclick=()=>pageChange(1);
 extractToggle.onclick=()=>{if(extractMode){showEmbeddedPdf();}else startExtraction();};
 extractInsert.onclick=()=>{
  const range=selectedRange();if(!range||!extractText)return;
  const quote=extractText.slice(range.start,range.end).trim();
  if(!quote)return;
  const source={fileId:currentFile?.id||'',filename:currentFile?.name||'PDF',page};
  close();
  const editor=activeNoteEditor;
  if(editor&&typeof editor.appendFromPdf==='function')editor.appendFromPdf(quote,source);
  else toast('공부 노트를 열고 다시 시도해 주세요.');
 };
 $('#attachmentViewerExport').onclick=()=>{
  if(!currentFile||!url)return;
  const a=document.createElement('a');a.href=url;a.download=currentFile.name||'첨부파일';a.rel='noopener';
  document.body.appendChild(a);a.click();a.remove();toast('파일 저장 화면이 열리지 않으면 공유 메뉴를 이용해 주세요.');
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
  async open(file,initialPage=1){
   if(!file||typeof file.data!=='string')return toast('첨부파일을 찾지 못했어요.');
   close();currentFile=file;const sequence=viewerSeq;bar.textContent=file.name;page=Math.max(1,Math.floor(Number(initialPage)||1));scale=1;
   content.replaceChildren();zoom.hidden=true;pdfControls.hidden=true;overlay.hidden=false;document.body.classList.add('attachment-viewing');
   try{
    const response=await fetch(file.data),blob=await response.blob();
    if(sequence!==viewerSeq||currentFile?.id!==file.id)return;
    loadedBlob=blob;url=URL.createObjectURL(blob);
    const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
    if(isPdf){
     extractActions.hidden=false;pdfControls.hidden=false;
     $('#attachmentPdfPage').textContent=page+'페이지';showEmbeddedPdf();
    }else{
     const img=document.createElement('img');img.className='attachment-preview-image';img.alt=file.name;img.src=url;
     content.appendChild(img);zoom.hidden=false;setZoom(1);
    }
   }catch(err){if(sequence!==viewerSeq)return;content.textContent='미리보기를 열 수 없어요. 파일 내보내기를 이용해 주세요.';toast('첨부파일 미리보기 실패');}
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
function settings(){const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;const backupDate=localStorage.getItem(STORAGE_STAMP_KEY);return `<div class="card"><strong>앱 정보</strong><p class="helper">부동산 경매 v${APP_VERSION} · ${standalone?'홈 화면 웹앱':'브라우저 실행'}</p><p class="helper" id="appUpdateState">${statusText()}</p><button class="secondary" id="checkUpdate" style="width:100%">${updateState.available?'업데이트 적용':'업데이트 확인'}</button><p id="updateAvailableMessage" class="update-available-message" ${updateState.available?'':'hidden'}>새 버전이 준비돼 있어요. 작성 중인 내용은 먼저 저장해 주세요.</p><div class="divider"></div><strong>개발 상태</strong><p class="helper">화면 탐색 및 샘플 데이터만 제공. 법원 자료·실거래가·실제 사진과 자동 갱신 기능은 미연동.</p><div class="divider"></div><strong>데이터 백업</strong><p class="helper">노트·관심물건·첨부파일을 한 번에 백업합니다. Safari와 홈 화면 웹앱은 저장 데이터가 분리될 수 있으니 홈 화면 웹앱에서 백업하세요.</p><p class="helper">마지막 백업 생성 요청: ${backupDate?new Date(backupDate).toLocaleString('ko-KR'):'기록 없음'}</p><button class="secondary" id="export" style="width:100%">내 데이터 백업</button><label class="upload" style="margin-top:10px">백업 파일 복원<input id="import" type="file" accept="application/json,.json" hidden></label></div><div class="card"><strong>프로젝트 이관</strong><p class="helper">README.md, PROJECT_HANDOFF.md, DESIGN_SPEC.md에 작업 재개 및 배포 방법이 기록돼 있어요.</p></div>`}function render(){if(editorDirty&&state.page==='note')persistNoteDraft();document.onselectionchange=null;activeNoteEditor=null;editorDirty=false;const back=document.getElementById('navBack');if(back){back.hidden=state.page==='home';back.onclick=goBack;}document.title='부동산 경매 · '+titles[state.page];$('#page-title').textContent=titles[state.page];$('#content').innerHTML=({home,search,schedule,favorites,study,advanced,special,detail,rights,note,settings}[state.page])();if($('#noteEditorShell')){
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
 }$('#tabs').innerHTML=tabs();$('#settings').onclick=()=>nav('settings');document.querySelectorAll('[data-page]').forEach(x=>x.onclick=()=>nav(x.dataset.page));document.querySelectorAll('[data-detail]').forEach(x=>x.onclick=()=>nav('detail',{detail:x.dataset.detail,detailTab:'overview'}));document.querySelectorAll('[data-filter]').forEach(x=>x.onclick=()=>{state.filter=x.dataset.filter;render()});document.querySelectorAll('[data-day]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.day;render();});if($('#prevMonth'))$('#prevMonth').onclick=()=>{state.viewMonth=shiftMonth(state.viewMonth,-1);state.selected=state.viewMonth+'-01';render();};if($('#nextMonth'))$('#nextMonth').onclick=()=>{state.viewMonth=shiftMonth(state.viewMonth,1);state.selected=state.viewMonth+'-01';render();};if($('#todayMonth'))$('#todayMonth').onclick=()=>{const now=new Date();state.viewMonth=calendarMonthKey(now);state.selected=state.viewMonth+'-'+String(now.getDate()).padStart(2,'0');render();};if($('#favCalendarOnly'))$('#favCalendarOnly').onchange=e=>{state.calendarFavoritesOnly=e.target.checked;render();};document.querySelectorAll('[data-note]').forEach(x=>x.onclick=()=>nav('note',{note:Number(x.dataset.note)}));if($('#favoriteSort'))$('#favoriteSort').onchange=e=>{state.favoriteSort=e.target.value;render();};
document.querySelectorAll('[data-favorite-type]').forEach(btn=>btn.onclick=()=>{state.favoriteType=btn.dataset.favoriteType;render();});
document.querySelectorAll('[data-remove-favorite]').forEach(btn=>btn.onclick=()=>{
 const id=btn.dataset.removeFavorite;
 const property=properties.find(p=>p.id===id);
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
 const item=properties.find(p=>p.id===btn.dataset.favoriteDate);
 if(!item)return;
 const date=item.date.replaceAll('.','-');
 nav('schedule',{selected:date,viewMonth:date.slice(0,7),calendarFavoritesOnly:true});
});
if($('#homeSearch')){
  const input=$('#homeSearch');
  let composing=false;
  input.addEventListener('compositionstart',()=>{composing=true});
  input.addEventListener('compositionend',()=>{composing=false});
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!composing&&!e.isComposing){
      e.preventDefault();
      state.search=input.value.normalize('NFC').trim();
      input.blur();nav('search');
    }
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
if($('#specialBack'))$('#specialBack').onclick=()=>goBack();if($('#favBtn'))$('#favBtn').onclick=()=>{const wasSaved=saved.favorites.includes(state.detail);saved.favorites=wasSaved?saved.favorites.filter(i=>i!==state.detail):[...saved.favorites,state.detail];write();render();toast(wasSaved?'관심물건에서 해제했어요.':'관심물건에 저장했어요.');};document.querySelectorAll('[data-detail-tab]').forEach(btn=>btn.onclick=()=>{state.detailTab=btn.dataset.detailTab;render();});if($('#rightsBtn'))$('#rightsBtn').onclick=()=>nav('rights');if($('#noteSearchForm')){
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
  const payload={version:2,exportedAt:new Date().toISOString(),data:saved,attachments};
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
  if(payload.data.notes.some(n=>!n||!Number.isFinite(Number(n.id))||typeof n.title!=='string'||typeof n.body!=='string'))throw Error('노트 데이터 형식 오류');
  const attachments=payload.version>=2?payload.attachments:[];
  if(!Array.isArray(attachments)||attachments.some(x=>!verifyAttachment(x)))throw Error('첨부파일 형식 오류');
  const before=await allAttachments();
  const destination=payload.data;
  const summary='백업 파일 ('+backupSummary(destination,attachments)+')\n현재 앱 ('+backupSummary(saved,before)+')';
  if(!confirm(summary+'\n\n복원하면 현재 앱의 저장 자료를 백업 내용으로 교체합니다. 계속할까요?'))return;
  if(destination.notes.length===0&&saved.notes.length>0){
   if(!confirm('주의: 선택한 백업 파일에는 노트가 0개입니다.\n현재 노트 '+saved.notes.length+'개가 모두 없어질 수 있어요.\n\n그래도 빈 노트 백업으로 교체할까요?'))return;
  }
  const oldSaved=saved;
  try{
   await attachmentRestoreAll(attachments);
   saved=destination;
   write();
  }catch(err){
   saved=oldSaved;
   try{await attachmentRestoreAll(before);}catch(rollbackError){toast('복구 실패: 기존 백업 파일을 보존해 주세요.');throw rollbackError;}
   throw err;
  }
  render();showSavedCheck('복원 완료');
 }catch(err){toast('복원 실패: '+(err.message||'파일을 확인해 주세요.'));}
 finally{event.target.value='';}
}}render();initGestureNavigation();if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});initUpdateMonitoring();