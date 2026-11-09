// Cloudflare Worker, HTTPS court lookup gateway. No persistence.
const API='https://www.courtauction.go.kr/pgj/pgj15A/selectAuctnCsSrchRslt.on';
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
export default {
 async fetch(request) {
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const origin=request.headers.get('origin');
  if(origin&&origin!==ALLOWED_ORIGIN)return respond({error:'Origin not allowed'},403);
  if(request.method!=='GET')return respond({error:'GET only'},405);
  const url=new URL(request.url);
  if(url.pathname!=='/case')return respond({service:'court-case-gateway',ready:true});
  const courtCode=String(url.searchParams.get('courtCode')||'').trim();
  const caseNo=normalizeCase(url.searchParams.get('caseNo'));
  if(!/^[A-Za-z][A-Za-z0-9]{3,12}$/.test(courtCode)||!caseNo)
    return respond({error:'법원 코드 또는 사건번호를 확인해 주세요.'},400);
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