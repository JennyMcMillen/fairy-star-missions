/* Stable automatic cast: the six supplied fairies rotate across each room's tasks.
   Fairies describe completed missions, not spendable currency. No economy changes. */
(function(root){'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.FairyData;
const variants=['rainbow','moon','sunshine','bubbles','garden','blossom'];
const assignments={};let ordinal=0;
for(const room of D.rooms)for(const m of D.missions.filter(m=>m.room===room.id))assignments[m.id]=ordinal++%variants.length;
function index(id){if(Object.prototype.hasOwnProperty.call(assignments,id))return assignments[id];let hash=0;for(const c of String(id))hash=(hash*31+c.charCodeAt(0))>>>0;return hash%variants.length;}
function name(id){return variants[index(id)];}
function followers(state,day,limit=8){return state.claims.filter(c=>c.day===day&&c.status==='approved').slice(-Math.max(1,Math.min(10,limit))).map(c=>({key:c.id,missionId:c.missionId,fairy:name(c.missionId)}));}
const api={variants,index,name,followers};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FairyCast=api;
})(typeof window!=='undefined'?window:globalThis);
