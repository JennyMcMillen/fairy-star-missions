/* IndexedDB transactions are the only persistent source of truth. */
(function(root){'use strict';
let db;
const E=root.FairyEngine;
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(root.FSM_PREVIEW?'fairy-star-missions-preview-v1':'fairy-star-missions-v1',1);
 r.onupgradeneeded=()=>{for(const n of ['state','photos','snapshots'])if(!r.result.objectStoreNames.contains(n))r.result.createObjectStore(n);};
 r.onsuccess=()=>{db=r.result;db.onversionchange=()=>db.close();resolve();};r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Please close other copies of Fairy Star Missions and try again.'));});}
function get(store,key){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly');const req=tx.objectStore(store).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function load(){await open();return await get('state','main');}
function save(next,expectedRevision,{photo=null,deletePhoto=null,replacePhotos=null,restore=false,reset=false}={}){return new Promise((resolve,reject)=>{
 const tx=db.transaction(['state','photos','snapshots'],'readwrite');let problem;const st=tx.objectStore('state'),ss=tx.objectStore('snapshots'),ps=tx.objectStore('photos');
 const req=st.get('main');req.onsuccess=()=>{const prev=req.result;if((prev?.revision||0)!==expectedRevision){problem=Error('Another window just changed the app. Please close extra windows and reload before trying again.');tx.abort();return;}
 next.revision=expectedRevision+1;st.put(next,'main');
 if(prev){const key=reset?`before-reset-${Date.now()}`:restore?`before-restore-${Date.now()}`:`auto-${E.dayKey()}`;const check=ss.get(key);check.onsuccess=()=>{if(!check.result||restore||reset)ss.put({at:new Date().toISOString(),state:prev},key);};}
 if(replacePhotos){ps.clear();for(const p of replacePhotos)ps.put(p.blob,p.id);}else{if(photo)ps.put(photo.blob,photo.id);if(deletePhoto)ps.delete(deletePhoto);}
 };
 tx.oncomplete=()=>{resolve(next);pruneSnapshots().catch(()=>{});};tx.onabort=()=>reject(problem||tx.error||Error('Your change was not saved.'));tx.onerror=()=>{};
 });}
function all(store){return new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly'),s=t.objectStore(store),out=[];const r=s.openCursor();r.onsuccess=()=>{const c=r.result;if(c){out.push({key:c.key,value:c.value});c.continue();}else resolve(out);};r.onerror=()=>reject(r.error);});}
async function pruneSnapshots(){const snaps=await all('snapshots');snaps.sort((a,b)=>b.value.at.localeCompare(a.value.at));if(snaps.length<=10)return;const tx=db.transaction('snapshots','readwrite');snaps.slice(10).forEach(x=>tx.objectStore('snapshots').delete(x.key));}
async function snapshotList(){return (await all('snapshots')).sort((a,b)=>b.value.at.localeCompare(a.value.at));}
const readData=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read this photo.'));r.readAsDataURL(blob);});
async function exportFile(state){const photos=[];for(const m of state.memories){const b=await get('photos',m.id);if(!b)throw Error('A scrapbook photo is missing. Remove its empty entry in Backups & photos before exporting. No current records have been changed.');photos.push({id:m.id,data:await readData(b)});}
 const doc={format:'fairy-star-missions-backup',version:1,exportedAt:new Date().toISOString(),state,photos};
 const file=new File([JSON.stringify(doc)],`fairy-stars-${E.dayKey()}-${new Date().toTimeString().slice(0,8).replace(/:/g,'')}.json`,{type:'application/json'});if(file.size>100*1024*1024)throw Error('This full backup is larger than the 100 MB restore limit. Keep original photos in the iPad Photos app and reduce the scrapbook before trying again.');return file;}
async function parseBackup(file){if(file.size>100*1024*1024)throw Error('This backup is larger than 100 MB. Please use a smaller export.');let doc;try{doc=JSON.parse(await file.text());}catch{throw Error('That file is not a readable backup.');}
 if(doc.format!=='fairy-star-missions-backup'||doc.version!==1)throw Error('Choose a Fairy Star Missions .json backup.');E.validateState(doc.state);
 if(!Array.isArray(doc.photos)||doc.photos.length>3000)throw Error('Invalid backup photo list.');const photos=[];const seen=new Set();
 for(const p of doc.photos){if(typeof p.id!=='string'||seen.has(p.id)||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.data)||p.data.length>6*1024*1024)throw Error('The backup contains an invalid photo.');seen.add(p.id);
 const [prefix,b64]=p.data.split(',');let bytes;try{bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));}catch{throw Error('The backup contains unreadable image data.');}
 photos.push({id:p.id,blob:new Blob([bytes],{type:prefix.slice(5,prefix.indexOf(';'))})});}
 for(const m of doc.state.memories)if(!seen.has(m.id))throw Error('A scrapbook photo is missing from this backup. The current app has not been changed.');return {state:doc.state,photos};}
async function compressPhoto(file){if(!file.type.startsWith('image/'))throw Error('Please choose a photo.');if(file.size>40*1024*1024)throw Error('Please choose a photo smaller than 40 MB.');
 const url=URL.createObjectURL(file);try{const image=new Image();await new Promise((r,j)=>{image.onload=r;image.onerror=()=>j(Error('This image format could not be opened. A JPEG photo will work.'));image.src=url;});
 const scale=Math.min(1,1440/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);const c=canvas.getContext('2d');c.fillStyle='#f8f0e4';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(image,0,0,canvas.width,canvas.height);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.78));if(!blob)throw Error('There was not enough space to prepare this photo.');return blob;
 }finally{URL.revokeObjectURL(url);}}
async function photoBytes(){return (await all('photos')).reduce((n,x)=>n+x.value.size,0);}
async function digest(value,salt){if(!crypto.subtle)throw Error('The parent lock needs a secure address. Open the hosted HTTPS app or the localhost preview.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:120000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');}
function randomHex(n){return Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');}
async function createAuth(pin){if(!/^\d{4,8}$/.test(pin))throw Error('Choose a PIN with 4 to 8 digits.');const salt=randomHex(16),recovery=randomHex(8).toUpperCase();return {auth:{salt,hash:await digest(pin,salt),recoveryHash:await digest(recovery,salt)},recovery};}
async function checkPin(pin,auth){return !!auth&&(await digest(pin,auth.salt))===auth.hash;}
async function checkRecovery(code,auth){return !!auth&&(await digest(code.replace(/[^A-Za-z0-9]/g,'').toUpperCase(),auth.salt))===auth.recoveryHash;}
root.FairyDB={load,save,get,all,snapshotList,exportFile,parseBackup,compressPhoto,photoBytes,createAuth,checkPin,checkRecovery};
})(window);
