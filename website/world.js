/* Pure room geometry. Coordinates refer to the same 4:3 backgrounds as the artwork.
   Random layouts are seeded per local day: no jumping during taps, drags or rerenders. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function seed(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function random(text){let x=seed(text);return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function cover(W,H){const scale=Math.max(W/800,H/600);return {scale,x:(W-800*scale)/2,y:(H-600*scale)/2};}
function project(x,y,W,H){const c=cover(W,H);return {x:c.x+x*800*c.scale,y:c.y+y*600*c.scale};}
function unproject(x,y,W,H){const c=cover(W,H);return {x:(x-c.x)/(800*c.scale),y:(y-c.y)/(600*c.scale)};}
// Verified open floor / rug / decking areas; bathroom anchors are on the bathmat,
// never over the toilet on the right.
const catAnchors={
 bedroom:[[.29,.94],[.73,.93]],bathroom:[[.40,.94],[.49,.94],[.32,.92]],
 hallway:[[.24,.95],[.79,.94]],dining:[[.18,.94],[.80,.95]],
 kitchen:[[.45,.94],[.64,.97]],living:[[.76,.92],[.89,.95]],
 study:[[.28,.96],[.65,.94]],aubrey:[[.32,.94],[.74,.94]],
 garden:[[.34,.94],[.69,.92]]
};
function catPosition(room,name,W,H,cw,ch,actor=null){
 const sites=catAnchors[room]||[[.3,.94],[.7,.94]],candidates=sites.map(([x,y])=>project(x,y,W,H));
 if(name==='Franco')candidates.reverse();
 // A portrait crop may hide the authored spot. The visible foreground is also floor.
 for(const x of [.23,.77,.38,.62])candidates.push({x:W*x,y:H*.945});
 const visible=p=>p.x-cw/2>=4&&p.x+cw/2<=W-4&&p.y-ch>=70&&p.y<=H-6;
 const score=p=>{const q=unproject(p.x,p.y,W,H);let v=0;if(room==='bathroom'&&q.x>.75&&q.y>.68)v+=10000;
 if(actor&&p.x+cw/2>actor.left&&p.x-cw/2<actor.right&&p.y>actor.top&&p.y-ch<actor.bottom)v+=500;
 return v;};
 const choices=candidates.filter(visible).sort((a,b)=>score(a)-score(b));if(choices.length)return choices[0];
 return {x:clamp(W*.25,cw/2+4,W-cw/2-4),y:H*.94};
}
function inFoliage(x,y){return (x<.80&&y>.03&&y<.41)||(x<.25&&y>.34&&y<.70)||(x>.34&&x<.87&&y>.33&&y<.64)||(x>.82&&y>.27&&y<.77);}
function gardenPositions(ids,{W,H,bw,bh,minY,maxY,day,face=null}){
 const rng=random(day+'-fairy-garden-'+W+'-'+H),left=bw/2+10,right=W-bw/2-10;
 const forbidden=p=>face&&p.x+bw/2>face.left&&p.x-bw/2<face.right&&p.y+bh/2>face.top&&p.y-bh/2<face.bottom;
 const pools=[];
 for(let i=0;i<1800;i++){const p={x:left+rng()*Math.max(0,right-left),y:minY+rng()*Math.max(1,maxY-minY)};const q=unproject(p.x,p.y-bh*.12,W,H);if(inFoliage(q.x,q.y)&&!forbidden(p))pools.push(p);}
 // Try several seeded orders, greedily taking the point with most breathing room.
 let best=[];
 for(let attempt=0;attempt<12;attempt++){
  const selected=[];for(let i=0;i<ids.length;i++){
   const allowed=pools.filter(p=>!selected.some(q=>Math.abs(p.x-q.x)<bw+8&&Math.abs(p.y-q.y)<bh+8));if(!allowed.length)break;
   if(!i)selected.push(allowed[Math.floor(rng()*allowed.length)]);
   else {let win=null,score=-1;for(const p of allowed){const d=Math.min(...selected.map(q=>Math.hypot((q.x-p.x)/bw,(q.y-p.y)/bh)))+rng()*.17;if(d>score){score=d;win=p;}}selected.push(win);}
  }
  if(selected.length>best.length)best=selected;if(best.length===ids.length)break;
 }
 // Return null rather than overlap: caller can reduce icon size, then retry.
 if(best.length<ids.length)return null;
 // Shuffle the mission -> location assignment independently of the position selection.
 for(let i=best.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[best[i],best[j]]=[best[j],best[i]];}
 return best;
}
const halo=[[-.32,.12],[-.18,-.015],[.035,-.025],[.25,.035],[.34,.19],[.31,.34],[-.33,.34],[-.035,-.12]];
function followerSettings(i){return {delay:65+(i*37)%225,tau:95+(i*31)%170};}
function nextMidnightDelay(now=new Date()){const next=new Date(now);next.setHours(24,0,0,0);return Math.max(1,next-now);}
const api={seed,random,cover,project,unproject,catAnchors,catPosition,inFoliage,gardenPositions,halo,followerSettings,nextMidnightDelay};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FairyWorld=api;
})(typeof window!=='undefined'?window:globalThis);
