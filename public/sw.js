const CACHE_NAME='joexe-shell-v1';
const SHELL=['/','/women','/offline.html','/images/logo.jpeg','/icons/icon-192.png','/icons/icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('joexe-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    if(url.pathname.startsWith('/admin')||url.pathname.startsWith('/checkout'))return;
    event.respondWith(fetch(request).then(response=>{
      if(response.ok&&(url.pathname==='/'||url.pathname==='/women'))caches.open(CACHE_NAME).then(cache=>cache.put(url.pathname,response.clone()));
      return response;
    }).catch(async()=>await caches.match(url.pathname)||await caches.match('/offline.html')));
    return;
  }
  if(url.pathname.startsWith('/icons/')||url.pathname==='/images/logo.jpeg')event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
