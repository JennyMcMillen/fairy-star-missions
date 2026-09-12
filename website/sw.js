/* First-load precache, bounded to this app. No background data upload or remote backup. */
const CACHE='fairy-star-missions-shell-1.9.0-conservatory';
const FILES=["./", "./app.js", "./art.js", "./assets/animations/alba-still.webp", "./assets/animations/franco-cuddle.webp", "./assets/animations/franco-still.webp", "./assets/animations/orion-cuddle.webp", "./assets/animations/orion-still.webp", "./assets/characters/alba.webp", "./assets/characters/franco.webp", "./assets/characters/orion.webp", "./assets/fairies/blossom.webp", "./assets/fairies/bubbles.webp", "./assets/fairies/garden.webp", "./assets/fairies/moon.webp", "./assets/fairies/rainbow.webp", "./assets/fairies/sunshine.webp", "./assets/rooms/aubrey.webp", "./assets/rooms/bathroom.webp", "./assets/rooms/bedroom.webp", "./assets/rooms/conservatory.webp", "./assets/rooms/dining.webp", "./assets/rooms/garden.webp", "./assets/rooms/hallway.webp", "./assets/rooms/kitchen.webp", "./assets/rooms/living.webp", "./assets/rooms/study.webp", "./celebrations.js", "./data.js", "./db.js", "./engine.js", "./fairy-cast.js", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon.svg", "./index.html", "./layout.js", "./lists.js", "./manifest.webmanifest", "./styles.css", "./world.js"];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const file of FILES){const url=new URL(file,self.registration.scope);const response=await fetch(url,{cache:'reload',credentials:'same-origin'});if(!response.ok||response.redirected)throw Error('Could not finish the offline install.');await cache.put(url,response);}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('fairy-star-missions-shell-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok&&!response.redirected){const text=await response.clone().text();if(text.includes('id="app"')&&text.includes('Fairy Star Missions')){const cache=await caches.open(CACHE);await cache.put(new URL('./index.html',self.registration.scope),response.clone());}}return response;}catch{const cached=await caches.match(new URL('./index.html',self.registration.scope));return cached||new Response('Open Fairy Star Missions online once to finish the offline install.',{status:503,headers:{'Content-Type':'text/plain'}});}})());
 }else if(FILES.some(file=>new URL(file,self.registration.scope).href===url.href))event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
