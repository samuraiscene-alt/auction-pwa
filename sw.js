const CACHE='auction-shell-v072';
const ASSETS=['./','./index.html','./style.css','./app.js','./VERSION.txt','./manifest.webmanifest','./icon.svg','./auction-ios-icon-v034.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('auction-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 const request=event.request;
 // Version probes use unique URLs; avoid filling offline cache with timestamped copies.
 if(new URL(request.url).pathname.endsWith('/VERSION.txt')&&new URL(request.url).searchParams.has('check')){
  event.respondWith(fetch(request));return;
 }
 event.respondWith(fetch(request).then(response=>{
  if(response.ok&&new URL(request.url).origin===location.origin){
   const copy=response.clone();
   event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
  }
  return response;
 }).catch(async()=>{
  const cached=await caches.match(request,{ignoreSearch:request.mode==='navigate'});
  return cached||Response.error();
 }));
});
