/* Presentation and validation shared by the mission and reward lists.
   Star awards, deductions and cooldown enforcement still belong to FairyEngine. */
(function(root){'use strict';
const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.FairyEngine;
const tiers=[
 {id:'little',name:'Little treats',min:0,max:20,range:'Up to 20 stars'},
 {id:'bigger',name:'Bigger treats',min:21,max:50,range:'21–50 stars'},
 {id:'special',name:'Special rewards',min:51,max:100,range:'51–100 stars'},
 {id:'big',name:'Big wishes',min:101,max:Infinity,range:'101+ stars'}
];
const rewardIcons=['gift','books','moon','chocolate','bath','plate','dress','tv','icecream','teddy','sun','swim','house','crown','coins','flower','tree','star'];
const starText=n=>`${n} ${n===1?'star':'stars'}`;
function groupRewards(rewards){
 return tiers.map(t=>({...t,rewards:rewards.filter(r=>r.price>=t.min&&r.price<=t.max).slice().sort((a,b)=>a.price-b.price||a.name.localeCompare(b.name,'en'))})).filter(t=>t.rewards.length);
}
function missionValue(state,mission){
 const routine=['morning','evening'].includes(mission.kind);
 if(routine){const amount=state.config[mission.kind+'Stars'];return {amount,detail:'routine',label:`${starText(amount)} for the shared ${mission.kind} routine, not per mission.`};}
 const label=mission.kind==='learning'?`${starText(mission.stars)}; learning shares a ${state.config.learningCap}-star daily limit.`:starText(mission.stars);
 return {amount:mission.stars,detail:'',label};
}
function rewardInfo(state,reward,day=E.dayKey()){
 const cost=reward.price,total=Math.max(0,E.balance(state)),saved=Math.min(total,cost),remaining=Math.max(0,cost-total);
 const check=E.canRedeem(state,reward.id,day);
 const cd=reward.cooldown||{type:'none',days:0};
 let limit=cd.type==='week'?'Once each week':cd.type==='month'?'Once each calendar month':cd.type==='days'&&cd.days>0?`${cd.days} ${cd.days===1?'day':'days'} between uses`:'No repeat limit';
 let extra='';
 if(reward.id==='cash'){
  const used=state.redemptions.filter(r=>r.rewardId==='cash'&&E.weekKey(r.day)===E.weekKey(day)).reduce((n,r)=>n+r.cost,0);
  limit=`Weekly limit: ${starText(state.config.cashCap)} · ${Math.max(0,state.config.cashCap-used)} left this week`;
  extra=`£5 saver: ${starText(state.config.cashSaver)}${state.config.cashSaver>state.config.cashCap?' · above the current weekly limit':''}`;
 }
 const progressText=`${saved}/${cost}`;
 const status=!reward.available?'Not available just now':remaining===0&&!check.ok?check.reason:'';
 return {cost,total,saved,remaining,limit,extra,progressText,status,ready:check.ok};
}
function saveReward(state,values,id='new'){
 const name=E.text(values.name,100),price=E.integer(values.price,0,10000),icon=values.icon;
 if(!rewardIcons.includes(icon))throw Error('Choose a reward picture from the list.');
 const note=String(values.note||'').trim();if(note.length>150)throw Error('Keep the note to 150 characters or fewer.');
 const type=values.cooldown?.type;if(!['none','week','month','days'].includes(type))throw Error('Choose a valid reward limit.');
 const days=type==='days'?E.integer(values.cooldown.days,1,3650):0;
 const current=id==='new'?null:E.reward(state,id);
 const result={...(current||{}),id:current?current.id:'reward-'+E.uid(),name,price,icon,note,available:!!values.available,cooldown:{type,days}};
 if(current)state.rewards[state.rewards.indexOf(current)]=result;else state.rewards.push(result);
 return result;
}
const api={tiers,rewardIcons,groupRewards,missionValue,rewardInfo,saveReward};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FairyLists=api;
})(typeof window!=='undefined'?window:globalThis);
