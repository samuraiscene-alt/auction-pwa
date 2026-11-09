// Cloudflare Worker, HTTPS court lookup gateway. No persistence.
const API='https://www.courtauction.go.kr/pgj/pgj15A/selectAuctnCsSrchRslt.on';
const DETAIL_API='https://www.courtauction.go.kr/pgj/pgj15B/selectAuctnCsSrchRslt.on';
const ALLOWED_ORIGIN='https://samuraiscene-alt.github.io';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':ALLOWED_ORIGIN,'access-control-allow-methods':'GET, OPTIONS','vary':'Origin'};
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const normalizeCase=s=>{
 const m=String(s||'').normalize('NFC').replace(/\s+/g,'').match(/^(20\d{2})타경(\d{1,12})$/);
 return m?m[1]+'타경'+String(BigInt(m[2])):null;
};
// Court responses distinguish the readable userCsNo from the 14-digit internal csNo.
const matchingCase=(base,wanted)=>{
 const human=normalizeCase(base?.userCsNo);
 if(human)return human===wanted;
 const m=wanted.match(/^(20\d{2})타경(\d+)$/);
 const internal=String(base?.csNo||'').trim();
 // Verified public court records encode '2023타경4869' as '20230130004869'.
 return !!m && /^\d{14}$/.test(internal) && internal===m[1]+'0130'+m[2].padStart(6,'0');
};

// Restrict auto-entry to documented single-valued fields; ambiguous rounds stay null.
const amount=value=>{
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const raw=String(value).trim().replace(/,/g,'');
 if(!/^\d{1,15}$/.test(raw))return null;
 const num=Number(raw);
 return Number.isSafeInteger(num)&&num>0?num:null;
};
const dateOnly=value=>{
 const s=String(value??'').replace(/[-.]/g,'').trim();
 if(!/^20\d{6}$/.test(s))return null;
 const y=Number(s.slice(0,4)),m=Number(s.slice(4,6)),d=Number(s.slice(6,8));
 const dt=new Date(Date.UTC(y,m-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?
  s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6):null;
};
// Only explicit, single-purpose court object classification labels qualify.
// No guess from address, land-lot number, or sale amount. Mixed objects => null.
const identifyPropertyType=(objects)=>{
 if(!Array.isArray(objects)||objects.length===0)return null;
 const candidates=['objctKndNm','gdsKndNm','dspslObjctKndNm','rletKndNm','rletUseNm','bldgUseNm'];
 const classifications=objects.map(object=>{
  if(!object||typeof object!=='object')return null;
  const labels=candidates.map(k=>object[k]).filter(v=>typeof v==='string'&&v.trim());
  if(labels.length!==1)return null;
  const label=labels[0].trim();
  const exact={'아파트':'아파트','공동주택(아파트)':'아파트','연립주택':'빌라','다세대주택':'빌라',
    '단독주택':'단독주택','다가구주택':'단독주택','근린생활시설':'상가','판매시설':'상가',
    '토지':'토지','대지':'토지','전':'토지','답':'토지','임야':'토지'};
  return exact[label]||null;
 });
 return classifications.every(v=>v&&v===classifications[0])?classifications[0]:null;
};

// Preserve court usage codes exactly as supplied. No guessed hierarchy/codes.
const courtUsageFromItem=(detail,item)=>{
 const fieldNames={large:['lclsUtilCd','lclDspslGdsLstUsgCd'],medium:['mclsUtilCd','mclDspslGdsLstUsgCd'],small:['sclsUtilCd','sclDspslGdsLstUsgCd']};
 const nameKeys={large:['lclsUtilNm','lclDspslGdsLstUsgNm'],medium:['mclsUtilNm','mclDspslGdsLstUsgNm'],small:['sclsUtilNm','sclDspslGdsLstUsgNm']};
 const candidates=[item,detail?.csBaseInfo,detail?.dspslGdsDxdyInfo].filter(v=>v&&typeof v==='object');
 const first=(keys)=>{const vals=[];
  for(const o of candidates)for(const k of keys)if(typeof o[k]==='string'&&o[k].trim())vals.push(o[k].trim());
  const distinct=[...new Set(vals)];
  return distinct.length===1?distinct[0]:null;
 };
 const codes=Object.fromEntries(Object.entries(fieldNames).map(([level,fields])=>[level,first(fields)]));
 const names=Object.fromEntries(Object.entries(nameKeys).map(([level,fields])=>[level,first(fields)]));
 const safeCode=v=>typeof v==='string'&&/^\d{4,15}$/.test(v)?v:null;
 const safeName=v=>typeof v==='string'&&v.length<=80?v:null;
 return {codes:Object.fromEntries(Object.entries(codes).map(([k,v])=>[k,safeCode(v)])),
   names:Object.fromEntries(Object.entries(names).map(([k,v])=>[k,safeName(v)])),
   verifiedBy:'returned-fields-only'};
};


// Read-only cascading court usage taxonomy. No generated classifications.
const USAGE_ENDPOINTS={
 large:{url:'https://www.courtauction.go.kr/pgj/pgj002/selectLclLst.on',body:{dsignUsgDvsCd:''}},
 medium:{url:'https://www.courtauction.go.kr/pgj/pgj002/selectMclLst.on',key:'lclDspslGdsLstUsgCd'},
 small:{url:'https://www.courtauction.go.kr/pgj/pgj002/selectSclLst.on',key:'mclDspslGdsLstUsgCd'}
};
const taxonomyRows=(payload,level,parent)=>{
 const expectedKeys=level==='large'?['lclLst','usgLclLst']:level==='medium'?['mclLst','usgMclLst']:['sclLst','usgSclLst'];
 if(String(payload?.status)!=='200'||payload?.errors||(payload?.data?.ipcheck===false))return null;
 const lists=expectedKeys.map(k=>payload?.data?.[k]).filter(Array.isArray);
 if(lists.length!==1)return null;
 const entries=[];
 for(const item of lists[0]){
  if(!item||typeof item!=='object')return null;
  const code=String(item.code??item.usgCd??item.dspslGdsLstUsgCd??'').trim();
  const name=String(item.name??item.usgNm??item.dspslGdsLstUsgNm??'').trim();
  if(!/^\d{5}$/.test(code)||!name||name.length>80)return null;
  entries.push({code,name,...(parent?{parentCode:parent}:{})});
 }
 if(entries.length>120||new Set(entries.map(x=>x.code)).size!==entries.length)return null;
 return entries;
};
async function fetchTaxonomy(level,parent){
 const conf=USAGE_ENDPOINTS[level];
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const body=conf.key?{[conf.key]:parent}:conf.body;
  const response=await fetch(conf.url,{method:'POST',
   headers:{'Content-Type':'application/json; charset=UTF-8','Accept':'application/json','Referer':'https://www.courtauction.go.kr/pgj/index.on'},
   body:JSON.stringify(body),signal:controller.signal});
  if(!response.ok)return {error:'법원 분류 조회 연결 실패',status:502};
  const rows=taxonomyRows(await response.json(),level,parent);
  if(!rows)return {error:'법원 분류 응답 형식을 확인할 수 없습니다.',status:502};
  return {level,parentCode:parent||null,items:rows,source:'courtauction.go.kr',checkedAt:new Date().toISOString()};
 }catch{return {error:'법원 분류 조회 중 통신 오류가 발생했습니다.',status:502}}
 finally{clearTimeout(timer)}
}

const readItem=(json,courtCode,caseNo,itemNo)=>{
 const data=json?.data,d=data?.dma_result,base=d?.csBaseInfo,item=d?.dspslGdsDxdyInfo;
 if(String(json?.status)!=='200'||json?.errors||!d||!base||!item||data?.ipcheck===false)
   return {error:'물건 상세정보를 확인할 수 없습니다.',status:502};
 if(String(base.cortOfcCd||'').toUpperCase()!==courtCode.toUpperCase()||!matchingCase(base,caseNo))
   return {error:'사건번호 또는 법원이 일치하지 않습니다.',status:409};
 if(String(Number(item.dspslGdsSeq))!==String(itemNo))
   return {error:'물건번호가 일치하지 않습니다.',status:409};
 const prices=['fstPbancLwsDspslPrc','scndPbancLwsDspslPrc','thrdPbancLwsDspslPrc','fothPbancLwsDspslPrc'].map(k=>amount(item[k])).filter(v=>v!==null);
 const addressCandidates=Array.isArray(d.gdsDspslObjctLst)?d.gdsDspslObjctLst.map(x=>String(x?.userPrintSt||'').trim()).filter(Boolean):[];
 const address=addressCandidates.length===1&&addressCandidates[0].length<=250?addressCandidates[0]:null;
 return {verified:true,source:'courtauction.go.kr',courtCode:courtCode.toUpperCase(),caseNo,itemNo,
  checkedAt:new Date().toISOString(),courtName:String(base.cortOfcNm||'').slice(0,100),
  address,propertyType:identifyPropertyType(d.gdsDspslObjctLst),courtUsage:courtUsageFromItem(d,item),appraisalWon:amount(item.aeeEvlAmt),
  minimumWon:prices.length===1?prices[0]:null,
  saleDate:dateOnly(item.dspslDxdyYmd),
  priceAmbiguous:prices.length>1,
  notice:'법원 원문과 비교한 후 빈칸에만 반영하세요. 기일은 변경될 수 있습니다.'};
};
export default {
 async fetch(request) {
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const origin=request.headers.get('origin');
  if(origin&&origin!==ALLOWED_ORIGIN)return respond({error:'Origin not allowed'},403);
  if(request.method!=='GET')return respond({error:'GET only'},405);
  const url=new URL(request.url);
  if(url.pathname==='/taxonomy'){
   const level=url.searchParams.get('level');
   const parent=url.searchParams.get('parentCode');
   if(!Object.prototype.hasOwnProperty.call(USAGE_ENDPOINTS,level))
    return respond({error:'large, medium 또는 small 단계만 지원합니다.'},400);
   if(level==='large'&&parent)return respond({error:'대분류에는 상위 코드가 필요하지 않습니다.'},400);
   if(level!=='large'&&!/^\d{5}$/.test(String(parent||'')))
    return respond({error:'유효한 상위 분류코드가 필요합니다.'},400);
   const result=await fetchTaxonomy(level,parent);
   if(result.error)return respond({error:result.error},result.status);
   return new Response(JSON.stringify(result),{status:200,headers:{...headers,'cache-control':'public, max-age=300'}});
  }
  if(url.pathname!=='/case'&&url.pathname!=='/item')return respond({service:'court-case-gateway',ready:true});
  const courtCode=String(url.searchParams.get('courtCode')||'').trim();
  const caseNo=normalizeCase(url.searchParams.get('caseNo'));
  if(!/^[A-Za-z][A-Za-z0-9]{3,12}$/.test(courtCode)||!caseNo)
    return respond({error:'법원 코드 또는 사건번호를 확인해 주세요.'},400);
  if(url.pathname==='/item'){
   const rawItem=String(url.searchParams.get('itemNo')||'');
   if(!/^[1-9]\d{0,3}$/.test(rawItem))return respond({error:'물건번호를 입력해 주세요.'},400);
   const itemNo=String(Number(rawItem));
   const abortDetail=new AbortController(),timeDetail=setTimeout(()=>abortDetail.abort(),12000);
   try{
    const r=await fetch(DETAIL_API,{method:'POST',
      headers:{'Content-Type':'application/json; charset=UTF-8','Accept':'application/json','Referer':'https://www.courtauction.go.kr/pgj/index.on'},
      body:JSON.stringify({dma_srchGdsDtlSrch:{csNo:caseNo,cortOfcCd:courtCode,dspslGdsSeq:itemNo,pgmId:'PGJ15BM01',srchInfo:''}}),
      signal:abortDetail.signal});
    if(!r.ok)return respond({error:'법원 물건 상세조회에 실패했습니다.'},502);
    const parsed=readItem(await r.json(),courtCode,caseNo,itemNo);
    if(parsed.error)return respond({error:parsed.error},parsed.status);
    return respond(parsed);
   }catch{return respond({error:'법원 물건 상세조회 연결에 실패했습니다.'},502);}
   finally{clearTimeout(timeDetail);}
  }
  const abort=new AbortController(),deadline=setTimeout(()=>abort.abort(),12000);
  try {
   const response=await fetch(API,{method:'POST',
    headers:{'Content-Type':'application/json; charset=UTF-8','Accept':'application/json','Referer':'https://www.courtauction.go.kr/pgj/index.on'},
    body:JSON.stringify({dma_srchCsDtlInf:{cortOfcCd:courtCode,csNo:caseNo}}),signal:abort.signal});
   if(!response.ok)return respond({error:'법원 조회 연결에 실패했습니다.'},502);
   const json=await response.json(),data=json?.data;
   const base=Array.isArray(data?.dma_csBasInf)?data.dma_csBasInf[0]:data?.dma_csBasInf;
   if(String(json?.status)!=='200'||(Array.isArray(json?.errors)&&json.errors.length)||!base||data?.ipcheck===false)
    return respond({error:'법원 응답에서 사건정보를 확인할 수 없습니다.'},502);
   if(String(base.cortOfcCd||'').toUpperCase()!==courtCode.toUpperCase()||!matchingCase(base,caseNo))
    return respond({error:'사건번호 또는 법원 검증에 실패했습니다.'},409);
   // No person names or undocumented auction values are exposed.
   return respond({verified:true,source:'courtauction.go.kr',courtCode:courtCode.toUpperCase(),caseNo,
    checkedAt:new Date().toISOString(),
    courtName:typeof base.cortOfcNm==='string'?base.cortOfcNm.slice(0,100):null,
    notice:'사건번호 확인 완료. 감정가·최저가·매각기일은 추가 필드 검증이 필요합니다.'});
  }catch {return respond({error:'법원 서버 접속에 실패했습니다.'},502);}
  finally{clearTimeout(deadline);}
 }
};