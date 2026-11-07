const $=s=>document.querySelector(s);const STORE='auction_skeleton_v1';let state={page:'home',filter:'전체',selected:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')+'-'+String(new Date().getDate()).padStart(2,'0'),viewMonth:new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'),calendarFavoritesOnly:false,detail:null,note:null,search:'',region:'전체',minPrice:'',maxPrice:'',priceUnit:'원',detailTab:'overview'};let saved;try{saved=JSON.parse(localStorage.getItem(STORE))||{favorites:[],notes:[]}}catch{saved={favorites:[],notes:[]}}const write=()=>localStorage.setItem(STORE,JSON.stringify(saved));const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
const properties=[{id:'demo1',type:'아파트',name:'서울 강남구 아파트',court:'서울중앙지방법원',case:'2026타경12345',value:'12억 5,000만원',min:'8억 7,500만원',date:'2026.11.17',flag:'2회 유찰'},{id:'demo2',type:'빌라',name:'경기 성남시 다세대주택',court:'수원지방법원',case:'2026타경23456',value:'4억 8,000만원',min:'3억 3,600만원',date:'2026.11.18',flag:'추가 확인'},{id:'demo3',type:'단독주택',name:'서울 성북구 단독주택',court:'서울북부지방법원',case:'2026타경34567',value:'5억 9,000만원',min:'4억 1,300만원',date:'2026.11.20',flag:'1회 유찰'}];const titles={home:'부동산 경매',search:'통합검색',schedule:'경매일정',favorites:'관심물건',study:'경매 공부방',advanced:'상세검색',special:'특수물건 검색',detail:'물건 상세',rights:'권리분석',note:'공부 노트',settings:'설정'};function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(window.tt);window.tt=setTimeout(()=>$('#toast').classList.remove('show'),2200)}const MAIN_TABS=['home','search','schedule','favorites','study'];
let appDepth=0;
const viewHistory=new Map();
function snapshot(){return {page:state.page,filter:state.filter,selected:state.selected,viewMonth:state.viewMonth,calendarFavoritesOnly:state.calendarFavoritesOnly,detail:state.detail,note:state.note,search:state.search,region:state.region,minPrice:state.minPrice,maxPrice:state.maxPrice,priceUnit:state.priceUnit,detailTab:state.detailTab}}
viewHistory.set(0,snapshot());
history.replaceState({auctionApp:true,depth:0,view:snapshot()},'',location.pathname+location.search);
function nav(page,extra={}){
  if(!titles[page])return;
  if(page===state.page&&Object.keys(extra).length===0)return;
  state={...state,...extra,page};
  appDepth++;
  viewHistory.set(appDepth,snapshot());
  history.pushState({auctionApp:true,depth:appDepth,view:snapshot()},'','#'+page);
  render();
  window.scrollTo(0,0);
}
function goBack(){
  if(document.activeElement&&document.activeElement.matches('input,textarea,select'))document.activeElement.blur();
  if(appDepth>0){history.back();return;}
  if(state.page!=='home')nav('home');
}
window.addEventListener('popstate',event=>{
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
function home(){return `<section class="hero dashboard"><div class="dash-heading"><div><p class="dash-kicker">MY AUCTION · 나의 경매 현황</p><h2>오늘도 좋은 물건을<br>차근차근 찾아봐요.</h2></div><span class="dash-mark" aria-hidden="true">⌂</span></div><div class="dash-stats"><button type="button" class="dash-stat" data-page="favorites"><span class="dash-stat-label">♡ 관심물건</span><strong>${saved.favorites.length}<small>건</small></strong></button><button type="button" class="dash-stat" data-page="study"><span class="dash-stat-label">▤ 공부 노트</span><strong>${saved.notes.length}<small>개</small></strong></button></div><p class="dash-disclaimer">현재 예시 경매물건으로 구성된 UI 테스트 버전이에요.</p></section><input id="homeSearch" class="search" placeholder="⌕  지역, 주소, 사건번호로 검색" value="${escapeHtml(state.search)}"><div class="section"><h2>빠른 메뉴</h2></div><div class="grid"><button class="quick" data-page="search"><b>♜</b>법원검색</button><button class="quick" data-page="search"><b>⌖</b>주소검색</button><button class="quick" data-page="search"><b>#</b>사건번호</button><button class="quick" data-page="study"><b>▤</b>공부방</button></div><div class="section"><h2>최근 경매물건</h2><span class="muted">예시 데이터</span></div>${properties.slice(0,2).map(card).join('')}<div class="section"><h2>다가오는 입찰일</h2></div><div class="card line"><div><strong>11월 17일 화요일</strong><p class="tiny">선택 날짜의 가상 일정</p></div><button class="miniButton" data-page="schedule">일정 보기 ›</button></div>`}function matchingProperties(){
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
function favorites(){let list=properties.filter(p=>saved.favorites.includes(p.id));return `<div class="section"><h2>저장한 물건</h2><span class="muted">${list.length}건</span></div>${list.map(card).join('')||'<div class="empty">아직 관심물건이 없어요.<br><br>검색한 물건의 ♡ 버튼으로 저장할 수 있어요.</div>'}`}function detail(){
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
 return `<div class="card auction-detail"><div class="placeholder"><div><div style="font-size:55px">⌂</div>실제 사진 미연동<br>법원 원본 사진 연결 예정</div></div><div class="auction-card-top" style="margin-top:15px"><span class="auction-type">${escapeHtml(p.type)}</span><span class="auction-demo">가상 물건</span></div><h2 class="detailTitle">${escapeHtml(p.name)}</h2><p class="muted">${escapeHtml(p.court)} · ${escapeHtml(p.case)}</p><div class="detail-tabs" role="group" aria-label="물건 상세정보 분류">${navTabs}</div><div class="detail-tab-panel">${panel}</div><button class="primary" id="favBtn" type="button">${saved.favorites.includes(p.id)?'♥ 관심물건 해제':'♡ 관심물건 저장'}</button></div><p class="helper">사건번호·가격·날짜는 모두 화면 테스트용 가상 정보이며 입찰에 이용하면 안 됩니다.</p>`;
}
function rights(){return `<div class="section"><h2>권리분석 요약</h2><span class="pill risk">자료 미연동</span></div>${[['⚖','말소기준권리','등기 서류 확인 필요'],['♙','임차인','현황조사서 확인 필요'],['♧','인수 가능성','판단 전 원본 자료 필요'],['⚠','위험요약','미확인 항목이 남아 있음']].map(a=>`<div class="card line"><span style="font-size:24px;color:#3477df">${a[0]}</span><div style="flex:1"><strong>${a[1]}</strong><p class="tiny">${a[2]}</p></div><span class="arrow">›</span></div>`).join('')}<p class="helper">임차인 관련 권리와 위험도를 자동으로 판단하지 않습니다. 후속 단계에서 출처와 법률 검증 로직을 연결합니다.</p>`}function study(){return `<div class="hero" style="background:linear-gradient(135deg,#eef5ff,#e5eeff);color:#24466c"><p style="color:#376aa7">나만의 경매 학습 공간</p><h2>경매 공부방</h2><p style="color:#376aa7">공부한 내용을 정리하고 기록하세요.</p></div><div class="section"><h2>학습 카테고리</h2></div><div class="row"><div class="card" style="flex:1"><strong>⚖ 권리분석</strong><p class="tiny">기초 개념</p></div><div class="card" style="flex:1"><strong>▤ 경매절차</strong><p class="tiny">입찰부터 낙찰까지</p></div></div><div class="row"><div class="card" style="flex:1"><strong>▦ 세금</strong><p class="tiny">취득세·양도세</p></div><div class="card" style="flex:1"><strong>⌂ 명도</strong><p class="tiny">인도 절차</p></div></div><div class="section"><h2>내 공부 노트</h2><button class="miniButton" id="addNote">＋ 새 노트</button></div>${saved.notes.length?saved.notes.map(n=>`<div class="listItem" data-note="${n.id}"><div class="thumb" style="width:48px;height:48px">▤</div><div class="itemContent"><strong>${escapeHtml(n.title)}</strong><p>${escapeHtml(n.body.slice(0,50))}</p></div><span class="arrow">›</span></div>`).join(''):'<div class="empty">아직 작성한 노트가 없어요.<br>새 노트를 만들어보세요.</div>'}<p class="helper">텍스트 노트는 현재 기기에 저장돼요. 사진·PDF 첨부와 강의 녹음은 후속 버전에서 개발합니다.</p>`}function note(){const n=saved.notes.find(x=>x.id===state.note)||{title:'',body:''};return `<div class="card" style="margin-top:14px"><label class="label">제목</label><input id="noteTitle" class="search" placeholder="노트 제목" value="${escapeHtml(n.title)}"><label class="label">내용</label><textarea class="select noteArea" id="noteBody" placeholder="공부한 내용을 적어보세요.">${escapeHtml(n.body)}</textarea><div class="section"><h2>첨부파일</h2><span class="muted">다음 버전</span></div><div class="upload">▧ 사진 · PDF 첨부 기능 예정</div><button class="primary" id="saveNote">노트 저장</button>${state.note?'<button class="secondary" id="deleteNote" style="width:100%;margin-top:9px;color:#c83d4a">노트 삭제</button>':''}</div>`}function settings(){return `<div class="card"><strong>앱 정보</strong><p class="helper">부동산 경매 PWA UI 골격 v0.2.1</p><div class="divider"></div><strong>개발 상태</strong><p class="helper">화면 탐색 및 샘플 데이터만 제공. 법원 자료·실거래가·실제 사진과 자동 갱신 기능은 미연동.</p><div class="divider"></div><strong>데이터 백업</strong><p class="helper">노트와 관심물건을 JSON 파일로 내보내거나 복원할 수 있어요.</p><button class="secondary" id="export" style="width:100%">내 데이터 백업</button><label class="upload" style="margin-top:10px">백업 파일 복원<input id="import" type="file" accept="application/json,.json" hidden></label></div><div class="card"><strong>프로젝트 이관</strong><p class="helper">README.md, PROJECT_HANDOFF.md, DESIGN_SPEC.md에 작업 재개 및 배포 방법이 기록돼 있어요.</p></div>`}function render(){const back=document.getElementById('navBack');if(back){back.hidden=state.page==='home';back.onclick=goBack;}document.title='부동산 경매 · '+titles[state.page];$('#page-title').textContent=titles[state.page];$('#content').innerHTML=({home,search,schedule,favorites,study,advanced,special,detail,rights,note,settings}[state.page])();$('#tabs').innerHTML=tabs();$('#settings').onclick=()=>nav('settings');document.querySelectorAll('[data-page]').forEach(x=>x.onclick=()=>nav(x.dataset.page));document.querySelectorAll('[data-detail]').forEach(x=>x.onclick=()=>nav('detail',{detail:x.dataset.detail,detailTab:'overview'}));document.querySelectorAll('[data-filter]').forEach(x=>x.onclick=()=>{state.filter=x.dataset.filter;render()});document.querySelectorAll('[data-day]').forEach(x=>x.onclick=()=>{state.selected=x.dataset.day;render();});if($('#prevMonth'))$('#prevMonth').onclick=()=>{state.viewMonth=shiftMonth(state.viewMonth,-1);state.selected=state.viewMonth+'-01';render();};if($('#nextMonth'))$('#nextMonth').onclick=()=>{state.viewMonth=shiftMonth(state.viewMonth,1);state.selected=state.viewMonth+'-01';render();};if($('#todayMonth'))$('#todayMonth').onclick=()=>{const now=new Date();state.viewMonth=calendarMonthKey(now);state.selected=state.viewMonth+'-'+String(now.getDate()).padStart(2,'0');render();};if($('#favCalendarOnly'))$('#favCalendarOnly').onchange=e=>{state.calendarFavoritesOnly=e.target.checked;render();};document.querySelectorAll('[data-note]').forEach(x=>x.onclick=()=>nav('note',{note:Number(x.dataset.note)}));if($('#homeSearch')){
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
if($('#specialBack'))$('#specialBack').onclick=()=>goBack();if($('#favBtn'))$('#favBtn').onclick=()=>{saved.favorites=saved.favorites.includes(state.detail)?saved.favorites.filter(i=>i!==state.detail):[...saved.favorites,state.detail];write();render();toast('관심물건 변경사항을 저장했어요.')};document.querySelectorAll('[data-detail-tab]').forEach(btn=>btn.onclick=()=>{state.detailTab=btn.dataset.detailTab;render();});if($('#rightsBtn'))$('#rightsBtn').onclick=()=>nav('rights');if($('#addNote'))$('#addNote').onclick=()=>nav('note',{note:null});if($('#saveNote'))$('#saveNote').onclick=()=>{const title=$('#noteTitle').value.trim(),body=$('#noteBody').value.trim();if(!title)return toast('제목을 입력하세요.');if(state.note){let n=saved.notes.find(x=>x.id===state.note);Object.assign(n,{title,body})}else saved.notes.unshift({id:Date.now(),title,body});write();nav('study');toast('노트를 저장했어요.')};if($('#deleteNote'))$('#deleteNote').onclick=()=>{if(confirm('노트를 삭제할까요?')){saved.notes=saved.notes.filter(x=>x.id!==state.note);write();nav('study')}};if($('#export'))$('#export').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),data:saved},null,2)],{type:'application/json'}));a.href=url;a.download='auction-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};if($('#import'))$('#import').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(!x.data||!Array.isArray(x.data.favorites)||!Array.isArray(x.data.notes))throw Error('형식 오류');if(confirm('현재 데이터를 백업 파일로 교체할까요?')){saved=x.data;write();render();toast('복원 완료')}}catch{toast('복원 파일을 확인해주세요.')}}}render();initGestureNavigation();if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});