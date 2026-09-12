/* Local economy. Awards are immediately available; explicit bedtime corrections are recorded. */
(function(root){'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.FairyData;
const clone=x=>JSON.parse(JSON.stringify(x));
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const pad=n=>String(n).padStart(2,'0');
function dayKey(date=new Date()){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
function parseDay(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d))throw Error('Choose a valid date.');const a=new Date(`${d}T12:00:00`);if(!Number.isFinite(+a)||dayKey(a)!==d)throw Error('Choose a valid date.');return a;}
function addDays(d,n){const a=parseDay(d);a.setDate(a.getDate()+n);return dayKey(a);}
function weekKey(d){const a=parseDay(d);return addDays(d,-((a.getDay()+6)%7));}
function correctSiblingNames(s){
 const pairs={nice:['Be kind to Obi','Be kind to Aubrey'],sharing:['Share with Obi','Share with Aubrey'],'help-aubrey':['Help Obi','Help Aubrey']};let changed=false;
 for(const collection of ['missions','claims','ledger'])for(const item of s[collection]||[]){const pair=pairs[collection==='missions'?item.id:item.missionId];if(pair&&item.name===pair[0]){item.name=pair[1];changed=true;}}
 if(s.virtues?.team?.name==='Being a good sibling and friend'){s.virtues.team.name='Being a good sister and friend';changed=true;}return changed;
}
function migrate(s){
 let changed=correctSiblingNames(s);
 if((s.uiRevision||0)<4){
  const table=s.missions.find(m=>m.id==='table');if(table){table.room='kitchen';table.object='table';if(table.name==='Lay the table')table.name='Set the table';}
  const helper=s.missions.find(m=>m.id==='help-someone');if(helper){helper.room='garden';helper.object='tree';}
  if(!s.missions.some(m=>m.id==='tidy-front-room'))s.missions.push(clone(D.missions.find(m=>m.id==='tidy-front-room')));
  s.features={...(s.features||{}),moonButtons:false};s.profile.readAloud=false;
  s.ledger.forEach(a=>a.collected=true);s.uiRevision=4;changed=true;
 }
 if((s.uiRevision||0)<7){
  for(const id of ['table','clothes']){const m=s.missions.find(m=>m.id===id);if(m)m.room=id==='table'?'dining':'bedroom';}
  for(const id of ['clothes-am','help-tea'])if(!s.missions.some(m=>m.id===id))s.missions.push(clone(D.missions.find(m=>m.id===id)));
  const bedtime=s.missions.find(m=>m.id==='bedtime');if(bedtime){bedtime.kind='bonus';bedtime.stars=2;bedtime.repeatable=false;bedtime.room='bedroom';}
  for(const kind of ['morning','evening'])s.config[kind+'Threshold']=Math.min(s.config[kind+'Threshold'],Math.max(1,s.missions.filter(m=>m.kind===kind).length));
  s.uiRevision=7;changed=true;
 }
 if((s.uiRevision||0)<8){
  for(const m of s.missions)if(!['morning','evening'].includes(m.kind))m.repeatable=true;
  s.uiRevision=8;changed=true;
 }
 if((s.uiRevision||0)<9){
  for(const id of ['water-plants','no-screens'])if(!s.missions.some(m=>m.id===id))s.missions.push(clone(D.missions.find(m=>m.id===id)));
  s.uiRevision=9;changed=true;
 }
 return changed;
}
function addOneOff(s,{name,stars,day=dayKey()}){
 name=text(name,100);integer(stars,1,10000);parseDay(day);
 const m={id:'oneoff-'+uid(),name,stars,kind:'bonus',room:'garden',object:'tree',virtues:['helper'],repeatable:false,oneOffDay:day};s.missions.push(m);return m;
}
function record(s,id,day=dayKey()){
 const m=mission(s,id);if(m.oneOffDay&&m.oneOffDay!==day)throw Error('This one-off mission belongs to another day.');
 return directAward(s,id,day,{firstTime:true,unprompted:!!m.unprompted});
}
function previewStars(s,id,day=dayKey()){
 const m=mission(s,id);if(claimStatus(s,id,day)==='approved'&&!m.repeatable)return 0;
 const copy=clone(s);return record(copy,id,day).reduce((n,a)=>n+a.stars,0);
}
function newState(){return {version:1,revision:0,createdAt:new Date().toISOString(),profile:{name:'Alba',sound:true,readAloud:false,calm:false},auth:null,
 config:{morningStars:1,morningThreshold:3,eveningStars:1,eveningThreshold:4,behaviourBonus:2,learningCap:2,weeklyBonus:10,cashCap:30,cashSaver:65,wardrobeWeekly:1},
 missions:clone(D.missions),rewards:clone(D.rewards),virtues:clone(D.virtues),seasons:clone(D.seasons),claims:[],ledger:[],redemptions:[],requests:[],pins:['story','movie'],
 wardrobe:{owned:['rose'],wearing:'rose',wings:true,purchases:[]},cats:{},certificates:{},memories:[],skips:[],lastExternalBackup:null,lastBackupPrompt:null};}
/* Called only after a grown-up explicitly confirms a clean start.
   Definitions, prices, pins, settings and all photo metadata are deliberately retained. */
function clearTestProgress(s,at=new Date().toISOString()){
 const date=new Date(at);if(!Number.isFinite(+date))throw Error('Choose a valid start date.');
 s.claims=[];s.ledger=[];s.redemptions=[];s.requests=[];s.cancelledRedemptions=[];
 s.cats={};s.certificates={};s.skips=[];
 // Keep owned outfits, but do not carry test-currency spending into the empty ledger.
 s.wardrobe.purchases=[];
 s.createdAt=date.toISOString();s.startedFreshAt=s.createdAt;
 s.lastExternalBackup=null;s.lastBackupPrompt=null;
 return s;
}
function mission(s,id){const m=s.missions.find(x=>x.id===id);if(!m)throw Error('That mission could not be found.');return m;}
const earned=(s,d)=>s.ledger.filter(x=>!d||x.day===d).reduce((n,x)=>n+x.stars,0);
const gift=s=>s.ledger.filter(x=>!x.collected).reduce((n,x)=>n+x.stars,0);
const balance=s=>s.ledger.filter(x=>x.collected).reduce((n,x)=>n+x.stars,0)-s.redemptions.reduce((n,x)=>n+x.cost,0);
const hasAward=(s,key)=>s.ledger.some(x=>x.key===key);
function award(s,a){if(hasAward(s,a.key))return null;const entry={id:uid(),createdAt:new Date().toISOString(),collected:true,virtues:[],stars:0,...a};integer(entry.stars,0,10000);s.ledger.push(entry);return entry;}
function claimStatus(s,id,day){const cs=s.claims.filter(x=>x.missionId===id&&x.day===day);return cs.find(x=>x.status==='pending')?.status||cs.find(x=>x.status==='approved')?.status||cs.at(-1)?.status||'none';}
function claim(s,id,day=dayKey()){parseDay(day);const m=mission(s,id);const same=s.claims.filter(x=>x.day===day&&x.missionId===id);
 if(same.some(x=>x.status==='pending'))throw Error('Your fairy is already waiting for this one.');
 if((!m.repeatable||['morning','evening'].includes(m.kind))&&same.some(x=>x.status==='approved'))throw Error('You have already done this one today.');
 const c={id:uid(),day,missionId:id,name:m.name,kind:m.kind,stars:m.stars,virtues:clone(m.virtues),createdAt:new Date().toISOString(),status:'pending'};s.claims.push(c);return c;}
function approve(s,id,options={}){const c=s.claims.find(x=>x.id===id);if(!c)throw Error('Claim not found.');if(c.status!=='pending')throw Error('This claim has already been reviewed.');
 const m=mission(s,c.missionId);if(['morning','evening'].includes(c.kind)&&options.firstTime===false)throw Error('Routine missions only count the first time of asking. Use “Not today”.');
 if(m.unprompted&&!options.unprompted)throw Error('Only award an apology made without prompting.');
 if((!m.repeatable||['morning','evening'].includes(m.kind))&&s.claims.some(x=>x.id!==id&&x.day===c.day&&x.missionId===c.missionId&&x.status==='approved'))throw Error('Already approved for this day.');
 c.status='approved';c.reviewedAt=new Date().toISOString();c.unprompted=!!options.unprompted;
 const start=s.ledger.length;
 if(!['morning','evening'].includes(c.kind)){
  let n=c.stars;
  if(c.kind==='learning'){const used=s.ledger.filter(x=>x.day===c.day&&x.kind==='learning').reduce((a,x)=>a+x.stars,0);n=Math.max(0,Math.min(n,s.config.learningCap-used));}
  c.paid=n;
  if(n>0)award(s,{key:`claim:${c.id}`,day:c.day,missionId:c.missionId,name:c.name,kind:c.kind,stars:n,virtues:c.virtues});
 }
 recomputeDay(s,c.day);return s.ledger.slice(start);
}
function decline(s,id){const c=s.claims.find(x=>x.id===id);if(!c||c.status!=='pending')throw Error('This claim has already been reviewed.');c.status='declined';c.reviewedAt=new Date().toISOString();}
function directAward(s,id,day,options={}){let c=s.claims.find(x=>x.day===day&&x.missionId===id&&x.status==='pending');if(!c)c=claim(s,id,day);return approve(s,c.id,options);}
function rebuildLedger(s){
 const keep=s.ledger.filter(x=>x.kind==='custom').map(clone);
 s.ledger=[];
 for(const entry of keep)s.ledger.push(entry);
 const claims=[...s.claims].filter(x=>x.status==='approved').sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
 const days=[...new Set(claims.map(c=>c.day))].sort();
 for(const c of claims){
  if(!['morning','evening'].includes(c.kind)){
   let n=c.stars;
   if(c.kind==='learning'){const used=s.ledger.filter(x=>x.day===c.day&&x.kind==='learning').reduce((a,x)=>a+x.stars,0);n=Math.max(0,Math.min(n,s.config.learningCap-used));}
   c.paid=n;
   if(n>0)award(s,{key:`claim:${c.id}`,day:c.day,missionId:c.missionId,name:c.name,kind:c.kind,stars:n,virtues:c.virtues});
  }
 }
 for(const day of days)recomputeDay(s,day);
 return s.ledger;
}
function retractClaim(s,id,reason='Asked twice'){
 const c=s.claims.find(x=>x.id===id);if(!c||c.status!=='approved')throw Error('That task is not recorded as done.');
 const day=c.day;const oldLearning=s.ledger.filter(a=>a.day===day&&a.kind==='learning');
 c.status='declined';c.retracted=true;c.removedAt=new Date().toISOString();c.removalReason=text(reason,150);
 s.ledger=s.ledger.filter(a=>a.key!==`claim:${c.id}`);
 if(c.kind==='learning'){
  let remaining=Math.max(s.config.learningCap,oldLearning.reduce((n,a)=>n+a.stars,0));
  s.ledger=s.ledger.filter(a=>!(a.day===day&&a.kind==='learning'));
  for(const other of s.claims.filter(x=>x.day===day&&x.kind==='learning'&&x.status==='approved').sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){
   other.paid=Math.min(other.stars,remaining);remaining-=other.paid;const old=oldLearning.find(a=>a.key===`claim:${other.id}`);
   if(other.paid>0)award(s,{...(old||{}),key:`claim:${other.id}`,day,missionId:other.missionId,name:other.name,kind:'learning',stars:other.paid,virtues:other.virtues});
  }
 }
 for(const k of ['morning','evening']){const p=blockProgress(s,day,k);if(p.approved<p.threshold&&!s.skips.includes(day))s.ledger=s.ledger.filter(a=>a.key!==`${k}:${day}`);}
 const all=s.missions.filter(m=>m.kind==='behaviour').every(m=>s.claims.some(x=>x.day===day&&x.missionId===m.id&&x.status==='approved'));
 if(!all)s.ledger=s.ledger.filter(a=>a.key!==`green:${day}`);
 const week=weekKey(day);if(!Array.from({length:7},(_,i)=>addDays(week,i)).every(d=>hasAward(s,`morning:${d}`)&&hasAward(s,`evening:${d}`)))s.ledger=s.ledger.filter(a=>a.key!==`week:${week}`);
 if(balance(s)<0||wardrobeBalance(s)<0)throw Error('These stars have already been spent. Undo the relevant reward in Star history before removing this task.');return c;
}
function blockProgress(s,day,kind){const ids=s.missions.filter(x=>x.kind===kind).map(x=>x.id);const approved=new Set(s.claims.filter(x=>x.day===day&&x.kind===kind&&x.status==='approved').map(x=>x.missionId)).size;
 const pending=new Set(s.claims.filter(x=>x.day===day&&x.kind===kind&&x.status==='pending').map(x=>x.missionId)).size;
 return {approved,pending,total:ids.length,threshold:s.config[`${kind}Threshold`],awarded:hasAward(s,`${kind}:${day}`),stars:s.ledger.find(a=>a.key===`${kind}:${day}`)?.stars??s.config[`${kind}Stars`]};}
function recomputeDay(s,day){for(const k of ['morning','evening']){const b=blockProgress(s,day,k);if(b.approved>=b.threshold||s.skips.includes(day))award(s,{key:`${k}:${day}`,day,name:`${k==='morning'?'Morning':'Evening'} routine${s.skips.includes(day)?' · day off':''}`,kind:'block',stars:b.stars,virtues:[...new Set(s.missions.filter(m=>m.kind===k).flatMap(m=>m.virtues))]});}
 const b=s.missions.filter(x=>x.kind==='behaviour');if(b.length&&b.every(m=>s.claims.some(x=>x.day===day&&x.missionId===m.id&&x.status==='approved')))award(s,{key:`green:${day}`,day,name:'All five kindnesses',kind:'day-bonus',stars:s.config.behaviourBonus,virtues:[]});
 recomputeWeek(s,weekKey(day));}
function recomputeWeek(s,week){if(Array.from({length:7},(_,i)=>addDays(week,i)).every(d=>hasAward(s,`morning:${d}`)&&hasAward(s,`evening:${d}`)))award(s,{key:`week:${week}`,day:addDays(week,6),name:'A whole week of routines',kind:'week-bonus',stars:s.config.weeklyBonus,virtues:[],tokens:s.config.wardrobeWeekly});}
function collect(s){const n=gift(s);s.ledger.forEach(x=>x.collected=true);return n;}
function customAward(s,{name,stars,virtues,save=false},day){name=text(name,100);integer(stars,0,10000);validVirtues(virtues);parseDay(day);const id=`custom-${uid()}`;
 if(save)s.missions.push({id,name,stars,virtues,kind:'bonus',room:'garden',object:'tree',repeatable:true});
 return award(s,{key:id,day,name,stars,virtues,kind:'custom',missionId:save?id:null});}
function reward(s,id){const r=s.rewards.find(x=>x.id===id);if(!r)throw Error('Reward not found.');return r;}
function price(s,r,variant='single'){return r.id==='cash'&&variant==='saver'?s.config.cashSaver:r.price;}
function canRedeem(s,id,day=dayKey(),variant='single',override=false){const r=reward(s,id);const cost=price(s,r,variant);const prior=s.redemptions.filter(x=>x.rewardId===id&&x.day<=day).sort((a,b)=>b.day.localeCompare(a.day));
 if(!r.available&&!override)return {ok:false,reason:'Ask a grown-up to find a day for this',cost};
 if(balance(s)<cost)return {ok:false,reason:`${cost-balance(s)} more stars to save`,cost};
 if(id==='cash') {const used=s.redemptions.filter(x=>x.rewardId==='cash'&&weekKey(x.day)===weekKey(day)).reduce((a,x)=>a+x.cost,0);if(used+cost>s.config.cashCap)return {ok:false,reason:variant==='saver'&&s.config.cashCap<cost?'A grown-up needs to raise the weekly pocket-money limit for the £5 saver':'Pocket money is finished for this week',cost};}
 if(!override&&prior.length){const last=prior[0],cd=r.cooldown||{type:'none'};
  if(cd.type==='month'&&last.day.slice(0,7)===day.slice(0,7))return {ok:false,reason:'This treat is ready again next month',cost};
  if(cd.type==='week'&&weekKey(last.day)===weekKey(day))return {ok:false,reason:'This treat is ready again next week',cost};
  if(cd.type==='days'&&day<addDays(last.day,cd.days))return {ok:false,reason:`Ready again on ${prettyDay(addDays(last.day,cd.days))}`,cost};
 }
 return {ok:true,cost,reason:'You have enough stars'};}
function requestReward(s,id,day,variant='single'){const check=canRedeem(s,id,day,variant);if(!check.ok)throw Error(check.reason);if(s.requests.some(x=>x.rewardId===id&&x.status==='pending'))throw Error('A grown-up is already looking at this wish.');
 const r={id:uid(),rewardId:id,day,variant,status:'pending',createdAt:new Date().toISOString()};s.requests.push(r);return r;}
function redeem(s,id,day,variant='single',override=false,requestId=null){parseDay(day);const check=canRedeem(s,id,day,variant,override);if(!check.ok)throw Error(check.reason);const r=reward(s,id);
 const receipt={id:uid(),rewardId:id,day,cost:check.cost,name:r.id==='cash'?`Pocket money · ${variant==='saver'?'£5':'£1'}`:r.name,icon:r.icon,variant,override,createdAt:new Date().toISOString()};
 if(requestId){const req=s.requests.find(x=>x.id===requestId);if(!req||req.status!=='pending')throw Error('This request has already been handled.');if(req.rewardId!==id||req.variant!==variant)throw Error('This request does not match the reward.');req.status='approved';}
 s.redemptions.push(receipt);if(id==='skip'){if(!s.skips.includes(day))s.skips.push(day);recomputeDay(s,day);}return receipt;}
function weekly(s,week){const entries=s.ledger.filter(x=>weekKey(x.day)===week);const scores={};for(const [k,v] of Object.entries(s.virtues)){const score=entries.filter(x=>x.virtues.includes(k)).reduce((a,x)=>a+x.stars,0);let tier=0;v.thresholds.forEach((t,i)=>{if(score>=t)tier=i;});scores[k]={score,tier,title:v.tiers[tier],name:v.name,icon:v.icon};}return {week,total:entries.reduce((a,x)=>a+x.stars,0),scores,routineDays:Array.from({length:7},(_,i)=>addDays(week,i)).filter(d=>hasAward(s,`morning:${d}`)&&hasAward(s,`evening:${d}`)).length};}
function bestWeek(s){const ws=[...new Set(s.ledger.map(x=>weekKey(x.day)))];return ws.reduce((best,w)=>{const a=weekly(s,w);return a.total>best.total?a:best;},{total:0,week:null});}
function wardrobeBalance(s){return s.ledger.reduce((a,x)=>a+(x.tokens||0),0)-s.wardrobe.purchases.reduce((a,x)=>a+x.cost,0);}
function buyOutfit(s,id){const o=D.outfits.find(x=>x.id===id);if(!o)throw Error('Outfit not found.');if(!s.wardrobe.owned.includes(id)){if(wardrobeBalance(s)<o.cost)throw Error('A full week of routines brings a new moon button.');s.wardrobe.purchases.push({id,cost:o.cost,at:new Date().toISOString()});s.wardrobe.owned.push(id);}s.wardrobe.wearing=id;}
function easter(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);return dayKey(new Date(year,Math.floor((h+l-7*m+114)/31)-1,(h+l-7*m+114)%31+1,12));}
function activeSeasons(s,day){const md=day.slice(5);return s.seasons.filter(w=>{if(w.kind==='easter'){const d=easter(parseDay(day).getFullYear());return day>=addDays(d,-w.before)&&day<=addDays(d,w.after);}return w.start<=w.end?md>=w.start&&md<=w.end:md>=w.start||md<=w.end;}).sort((a,b)=>a.layer-b.layer);}
function catRooms(day){const d=parseDay(day),ordinal=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000),n=D.rooms.length,first=((ordinal%n)+n)%n,offset=3+((Math.floor(ordinal/n)%4)+4)%4;return {Orion:D.rooms[first].id,Franco:D.rooms[(first+offset)%n].id};}
function findCat(s,name,day){if(!['Orion','Franco'].includes(name))throw Error('Cat not found.');s.cats[day]||=[];if(!s.cats[day].includes(name))s.cats[day].push(name);}
function pendingStars(s,day){let n=s.claims.filter(x=>x.day===day&&x.status==='pending'&&!['morning','evening','learning'].includes(x.kind)).reduce((a,x)=>a+x.stars,0);const used=s.ledger.filter(x=>x.day===day&&x.kind==='learning').reduce((a,x)=>a+x.stars,0);n+=Math.min(Math.max(0,s.config.learningCap-used),s.claims.filter(x=>x.day===day&&x.status==='pending'&&x.kind==='learning').reduce((a,x)=>a+x.stars,0));for(const k of ['morning','evening']){const b=blockProgress(s,day,k);if(!b.awarded&&b.pending)n+=b.stars;}return n;}
function prettyDay(d){return parseDay(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
function integer(x,min=0,max=10000){if(!Number.isSafeInteger(x)||x<min||x>max)throw Error(`Use a whole number between ${min} and ${max}.`);return x;}
function text(x,max=100){if(typeof x!=='string'||!x.trim()||x.length>max)throw Error(`Use a name of 1–${max} characters.`);return x.trim();}
function validVirtues(v){if(!Array.isArray(v)||!v.length||v.some(x=>!Object.hasOwn(D.virtues,x)))throw Error('Choose at least one of the four virtues.');}
function validateState(s){if(!s||s.version!==1)throw Error('This is not a supported Fairy Star Missions backup.');
 const arrays=['missions','rewards','claims','ledger','redemptions','requests','pins','memories','skips','seasons'];for(const a of arrays)if(!Array.isArray(s[a])||s[a].length>100000)throw Error(`Invalid backup: ${a}.`);
 text(s.profile?.name,40);for(const k of ['sound','readAloud','calm'])if(typeof s.profile[k]!=='boolean')throw Error('Invalid profile settings.');if(!s.config||!s.virtues||!s.wardrobe||!s.cats||!s.certificates)throw Error('The backup is incomplete.');
 for(const [k,v] of Object.entries(newState().config))integer(s.config[k],k.endsWith('Threshold')?1:0,k==='morningThreshold'?Math.max(1,s.missions.filter(m=>m.kind==='morning').length):k==='eveningThreshold'?Math.max(1,s.missions.filter(m=>m.kind==='evening').length):10000);
 for(const a of ['missions','rewards','claims','ledger','redemptions','requests']){const ids=s[a].map(x=>x.id);if(ids.some(x=>typeof x!=='string'||x.length>150||!/^[A-Za-z0-9._:-]+$/.test(x))||new Set(ids).size!==ids.length)throw Error('The backup has duplicate or invalid records.');}
 for(const m of s.missions){if(m.oneOffDay)parseDay(m.oneOffDay);text(m.name);integer(m.stars);if(!['morning','evening','behaviour','learning','bonus'].includes(m.kind)||!D.rooms.some(r=>r.id===m.room))throw Error('Invalid mission.');validVirtues(m.virtues);if(typeof m.repeatable!=='boolean'||(m.repeatable&&['morning','evening'].includes(m.kind)))throw Error('Invalid repeat limit.');}
 for(const r of s.rewards){text(r.name);integer(r.price);if(!['none','days','week','month'].includes(r.cooldown?.type))throw Error('Invalid reward cooldown.');integer(r.cooldown.days,0,3650);}
 const keys=new Set();for(const a of s.ledger){text(a.name,150);parseDay(a.day);integer(a.stars);if(typeof a.collected!=='boolean'||!Array.isArray(a.virtues)||a.virtues.some(v=>!D.virtues[v])||typeof a.key!=='string'||keys.has(a.key))throw Error('Invalid star ledger.');keys.add(a.key);if(a.tokens!==undefined)integer(a.tokens);}
 for(const a of s.redemptions){text(a.name,150);parseDay(a.day);integer(a.cost);}
 for(const c of s.claims){parseDay(c.day);text(c.name);integer(c.stars);validVirtues(c.virtues);if(!s.missions.some(m=>m.id===c.missionId)||!['pending','approved','declined'].includes(c.status))throw Error('Invalid mission claim.');}
 for(const r of s.requests){parseDay(r.day);if(!s.rewards.some(a=>a.id===r.rewardId)||!['pending','approved','declined'].includes(r.status)||!['single','saver'].includes(r.variant))throw Error('Invalid reward request.');}
 for(const [k,v] of Object.entries(D.virtues)){const a=s.virtues[k];if(!a||a.thresholds?.length!==4||a.tiers?.length!==4||a.thresholds[0]!==0)throw Error('Invalid rank ladder.');a.thresholds.forEach((t,i)=>{integer(t);if(i&&t<=a.thresholds[i-1])throw Error('Rank thresholds must increase.');});a.tiers.forEach(t=>text(t,60));}
 for(const w of s.seasons){text(w.name);if(!['daffodils','easter','summer','autumn','winter','birthday'].includes(w.art))throw Error('Unknown decoration artwork.');integer(w.layer,0,20);if(w.kind==='easter'){integer(w.before,0,60);integer(w.after,0,60);}else if(w.kind==='fixed'){parseDay(`2024-${w.start}`);parseDay(`2024-${w.end}`);}else throw Error('Invalid decoration window.');}
 if(s.pins.some(id=>!s.rewards.some(r=>r.id===id)))throw Error('Invalid pinned goal.');
 if(!Array.isArray(s.wardrobe.owned)||!Array.isArray(s.wardrobe.purchases)||!s.wardrobe.owned.includes(s.wardrobe.wearing)||s.wardrobe.owned.some(x=>!D.outfits.some(o=>o.id===x)))throw Error('Invalid wardrobe.');s.wardrobe.purchases.forEach(p=>integer(p.cost));
 if(s.auth&&(!/^[0-9a-f]{32}$/.test(s.auth.salt)||!/^[0-9a-f]{64}$/.test(s.auth.hash)||!/^[0-9a-f]{64}$/.test(s.auth.recoveryHash)))throw Error('Invalid parent lock.');
 s.skips.forEach(parseDay);for(const m of s.memories){text(m.id,150);text(m.rewardName,150);parseDay(m.day);}
 if(balance(s)<0||wardrobeBalance(s)<0)throw Error('This backup would create a negative balance.');return true;}
const api={clearTestProgress,clone,uid,dayKey,parseDay,addDays,weekKey,newState,correctSiblingNames,migrate,addOneOff,record,previewStars,mission,earned,gift,balance,hasAward,award,claimStatus,claim,approve,decline,directAward,retractClaim,rebuildLedger,blockProgress,recomputeDay,recomputeWeek,collect,customAward,reward,price,canRedeem,requestReward,redeem,weekly,bestWeek,wardrobeBalance,buyOutfit,easter,activeSeasons,catRooms,findCat,pendingStars,prettyDay,integer,text,validVirtues,validateState};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FairyEngine=api;
})(typeof window!=='undefined'?window:globalThis);
