'use strict';
/*
 * Court listing safety gate. It checks integrity and the previous published
 * limited-page snapshot. It does NOT certify legal or current auction status.
 */
const REGIONS=['서울','경기','인천'];
const PREFIX={서울:/^서울/,경기:/^경기/,인천:/^인천/};
const validDate=s=>{
 if(s===null)return true;
 if(typeof s!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+'T00:00:00Z');
 return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;
};
const validPrice=n=>n===null||(Number.isSafeInteger(n)&&n>0&&n<=999999999999999);
function validateSnapshot(data,previous=null,{strict=true}={}){
 const errors=[],warnings=[],changeSamples=[];
 const check=(c,msg)=>{if(!c)errors.push(msg)};
 check(data&&[1,2].includes(data.schemaVersion)&&data.complete===false,'스키마/부분수집 표시 누락');
 if(errors.length)return {ok:false,errors,warnings,changeSamples};
 check(data.scope==='서울·경기·인천'&&data.source==='courtauction.go.kr','수집 출처·지역 불일치');
 check(data.collectionMode==='limited-pages-pilot','시범 수집 유형 불일치');
 check(typeof data.fetchedAt==='string' && /^20\\d{2}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z$/.test(data.fetchedAt) && Number.isFinite(Date.parse(data.fetchedAt)) && Date.parse(data.fetchedAt)<=Date.now()+10*60*1000,'수집 시각 형식 오류 또는 미래 시각');
 check(Array.isArray(data.items)&&data.items.length>0&&data.items.length<=5000,'물건 목록 개수 오류');
 for(const region of REGIONS){
  const r=data.regions?.[region];
  check(r&&Number.isInteger(r.returned)&&r.returned>0&&r.returned<=400,'지역 조회 행 개수 오류: '+region);
  check(r&&Number.isInteger(r.processedPages)&&r.processedPages>=1&&r.processedPages<=8,'페이지 수 오류: '+region);
  check(r&&Number.isInteger(r.returned)&&Number.isInteger(r.processedPages)&&r.returned<=r.processedPages*50,'조회 행수가 페이지 범위를 초과: '+region);
  check(r&&(r.total===null||Number.isSafeInteger(r.total)&&r.total>=r.returned),'총 검색건수 오류: '+region);
 }
 if(!Array.isArray(data.items))return {ok:false,errors,warnings,changeSamples};
 const seen=new Map(),counts={서울:0,경기:0,인천:0};
 for(const item of data.items){
  if(!item||typeof item!=='object'){errors.push('빈 물건행');continue;}
  const id=String(item.id||'');
  const key='court-'+item.courtCode+'|'+item.caseNo+'|'+item.itemNo;
  if(id!==key||!/^court-B\d{6}\|20\d{2}타경\d{1,10}\|[1-9]\d{0,3}$/.test(id))errors.push('물건 고유번호 오류: '+id);
  if(!REGIONS.includes(item.region)||typeof item.address!=='string'||!PREFIX[item.region]?.test(item.address)||item.address.length>260)errors.push('주소/지역 오류: '+id);
  else counts[item.region]++;
  if(!validPrice(item.appraisalWon)||!validPrice(item.minimumWon))errors.push('금액 형식 오류: '+id);
  if(item.appraisalWon!==null&&item.minimumWon!==null&&item.minimumWon>item.appraisalWon)errors.push('최저가가 감정가보다 큼: '+id);
  if(!validDate(item.saleDate))errors.push('매각기일 형식 오류: '+id);
  for(const k of ['largeCode','mediumCode','smallCode']){
   if(item[k]!==null&&!/^\d{5}$/.test(String(item[k])))errors.push('분류코드 오류: '+id+' '+k);
  }
  if(data.schemaVersion===2){
   const components=item.components;
   if(!Array.isArray(components)||components.length===0||components.length>100)
    errors.push('구성요소 목록 개수 오류: '+id);
   else{
    const dedup=new Set();
    for(const part of components){
     if(!part||typeof part.address!=='string'||!PREFIX[item.region]?.test(part.address)||part.address.length>260)
      errors.push('구성요소 주소·지역 오류: '+id);
     for(const k of ['largeCode','mediumCode','smallCode']){
      if(part?.[k]!==null&&!/^\d{5}$/.test(String(part?.[k])))errors.push('구성요소 분류코드 오류: '+id+' '+k);
     }
     const key=JSON.stringify([part.address,part.largeCode,part.mediumCode,part.smallCode]);
     if(dedup.has(key))errors.push('구성요소 중복: '+id);
     dedup.add(key);
    }
    if(components.length>1&&item.smallCode!==null)errors.push('복합물건을 단일 분류로 잘못 표시: '+id);
   }
  }
  if(seen.has(id))errors.push('중복 물건 고유번호: '+id);
  else seen.set(id,item);
 }
 for(const region of REGIONS){
  if(strict&&counts[region]<20)errors.push('지역별 수집 물건이 비정상적으로 적음: '+region+' '+counts[region]);
  if(data.regions[region]&&counts[region]>data.regions[region].returned)errors.push('지역별 물건 개수가 원본 행보다 많음: '+region);
 }
 if(strict&&data.items.length<100)errors.push('물건 총 개수가 비정상적으로 적음');
 const old=previous&&Array.isArray(previous.items)?previous:null;
 let changed=0,overlap=0,missing=0;
 if(old){
  const prevMap=new Map(old.items.map(x=>[x.id,x]));
  for(const item of data.items){
   const prev=prevMap.get(item.id);if(!prev)continue;
   overlap++;
   const fields=['appraisalWon','minimumWon','saleDate','address','smallCode'];
   const differences=fields.filter(field=>{
    if(data.schemaVersion===2&&old.schemaVersion===1&&item.components?.length>1){
     // Previous sample kept one arbitrary land/building/address row per lot.
     // If that legacy address/type is still present, it is not a real change.
     if(field==='smallCode')return !item.components.some(c=>c.smallCode===prev.smallCode);
     if(field==='address')return !item.components.some(c=>c.address===prev.address);
    }
    return prev[field]!==item[field];
   });
   if(differences.length){changed++;if(changeSamples.length<15)changeSamples.push({id:item.id,fields:differences});}
  }
  missing=old.items.filter(x=>!seen.has(x.id)).length;
  // Compare only regions with equal or wider page coverage: a shorter pilot cannot prove disappearance.
  for(const region of REGIONS){
   const before=old.items.filter(x=>x.region===region);
   const after=counts[region];
   const prevPages=old.regions?.[region]?.processedPages;
   const nextPages=data.regions?.[region]?.processedPages;
   if(before.length>=30&&Number.isInteger(prevPages)&&Number.isInteger(nextPages)&&nextPages>=prevPages&&after<Math.ceil(before.length*0.5))
    errors.push('같은 수집 범위에서 지역별 물건이 50% 초과 급감: '+region+' '+before.length+'→'+after);
  }
  if(changed)warnings.push('같은 물건에서 값 변경 감지 '+changed+'건 (가격·기일 등 법원 원문 재확인 권장)');
  if(missing)warnings.push('이전 시범 목록에서 보이지 않는 물건 '+missing+'건 (페이지 이동·수집 범위 차이 가능; 낙찰·취하로 단정 금지)');
  if(overlap>=15&&changed/overlap>0.3)errors.push('동일 물건 값 변경 비율 과다: '+changed+'/'+overlap);
 }
 const result={ok:errors.length===0,errors:errors.slice(0,30),warnings,changeSamples,
  summary:{validatedItems:data.items.length,regions:counts,comparedWithPrevious:!!old,overlap,changed,notSeenInNewSample:missing,
   note:'형식·표본 비교 검사이며 법원 원문 및 현재 매각 상태를 보증하지 않음'}};
 return result;
}
module.exports={validateSnapshot};
