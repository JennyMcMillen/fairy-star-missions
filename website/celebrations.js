/* Offline canvas confetti. One bounded animation, celebratory even at zero stars. */
(function(root){'use strict';
let frame=0,timeout=0,canvas=null,particles=[],last=0,started=0;
const colours=['#ff8bb9','#ffce64','#a5daac','#97ceff','#cab1fa','#ffffff','#ff9a6b'];
function stop(){cancelAnimationFrame(frame);frame=0;clearTimeout(timeout);particles=[];canvas=null;document.getElementById('celebration')?.replaceChildren();}
function star(ctx,r){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,s=i%2?r*.43:r;i?ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s):ctx.moveTo(Math.cos(a)*s,Math.sin(a)*s);}ctx.closePath();ctx.fill();}
function burst({stars=0,calm=false}={}){
 stop();const host=document.getElementById('celebration');if(!host)return;
 host.dataset.bursts=String(Number(host.dataset.bursts||0)+1);host.dataset.stars=String(stars);
 const reduced=calm||root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 host.dataset.mode=reduced?'calm':'confetti';
 if(reduced){const el=document.createElement('div');el.className='calm-celebration';el.textContent='✦ Well done! ✦';host.append(el);timeout=setTimeout(stop,2300);return;}
 canvas=document.createElement('canvas');canvas.className='confetti-canvas';host.append(canvas);
 const W=root.innerWidth,H=root.innerHeight,dpr=Math.min(2,root.devicePixelRatio||1);
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);canvas.style.width=W+'px';canvas.style.height=H+'px';
 const ctx=canvas.getContext('2d');if(!ctx){stop();return;}ctx.scale(dpr,dpr);
 const count=W<600?180:240,scale=Math.max(.55,Math.min(1.15,H/800));
 for(let i=0;i<count;i++){const side=i%2;particles.push({x:side?W*.97:W*.03,y:H*.72,vx:(side?-1:1)*(3+Math.random()*12)*Math.max(.6,W/1100),vy:-(9+Math.random()*14)*scale,size:4+Math.random()*5,angle:Math.random()*6.28,spin:(Math.random()-.5)*.22,tilt:Math.random()*6.28,colour:colours[i%colours.length],shape:i%11===0?'star':i%5===0?'ribbon':i%4===0?'circle':'paper',delay:i%3*.085,age:0,life:2.7+Math.random()*1.3});}
 started=last=performance.now();
 function tick(now){const dt=Math.min(.033,Math.max(.001,(now-last)/1000));last=now;const step=dt*60;ctx.clearRect(0,0,W,H);
  for(const p of particles){p.age+=dt;if(p.age<p.delay)continue;p.vx*=Math.pow(.985,step);p.vy+=.28*scale*step;p.x+=p.vx*step;p.y+=p.vy*step;p.angle+=p.spin*step;p.tilt+=.14*step;
   const life=p.age-p.delay;if(life>p.life)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(1,Math.max(.12,Math.abs(Math.cos(p.tilt))));ctx.globalAlpha=Math.min(1,(p.life-life)/.6);ctx.fillStyle=p.colour;
   if(p.shape==='star')star(ctx,p.size*1.3);else if(p.shape==='circle'){ctx.beginPath();ctx.arc(0,0,p.size*.6,0,Math.PI*2);ctx.fill();}else if(p.shape==='ribbon')ctx.fillRect(-p.size*.3,-p.size*1.65,p.size*.6,p.size*3.3);else ctx.fillRect(-p.size*.65,-p.size,p.size*1.3,p.size*2);ctx.restore();}
  if(now-started<4400&&!document.hidden)frame=requestAnimationFrame(tick);else stop();
 }
 frame=requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
root.FairyCelebrations={burst,stop};
})(window);
