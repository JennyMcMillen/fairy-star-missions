/* Fairy Star Missions · reference economy, editable on this device. No remote dependencies. */
(function(root){'use strict';
const M=(id,name,kind,stars,room,object,virtues,extra={})=>({id,name,kind,stars,room,object,virtues,repeatable:false,...extra});
const missions=[
 M('make-bed','Make my bed','morning',0,'bedroom','bed',['independent']),
 M('tidy-room','Tidy my room','morning',0,'bedroom','toys',['independent']),
 M('clothes-am','Washing in the basket, pajamas on the bed','morning',0,'bedroom','laundry',['independent','helper']),
 M('teeth-am','Brush my teeth · morning','morning',0,'bathroom','sink',['independent']),
 M('shoes','Put my shoes on','morning',0,'hallway','shoes',['independent']),
 M('table','Set the table','evening',0,'dining','table',['helper']),
 M('pyjamas','Get into my pyjamas','evening',0,'bedroom','chair',['independent']),
 M('clothes','Washing in the basket, clothes on the chair','evening',0,'bedroom','laundry',['independent','helper']),
 M('teeth-pm','Brush my teeth · evening','evening',0,'bathroom','sink',['independent']),
 M('bedtime','Go happily to bed','bonus',2,'bedroom','bed',['independent'],{repeatable:true}),
 M('listen','Listen the first time','behaviour',1,'garden','tree',['independent','team'],{repeatable:true}),
 M('wait','Wait for my turn to talk','behaviour',1,'garden','tree',['team'],{repeatable:true}),
 M('nice','Be kind to Aubrey','behaviour',1,'aubrey','teddy',['team'],{repeatable:true}),
 M('voice','Use my inside voice','behaviour',1,'garden','tree',['team'],{repeatable:true}),
 M('please','Say please and thank you first time','behaviour',1,'garden','tree',['team'],{repeatable:true}),
 M('homework','Do my homework','learning',2,'study','desk',['independent'],{repeatable:true}),
 M('read','Read for 10 minutes','learning',1,'living','books',['independent'],{repeatable:true}),
 M('tidy-front-room','Tidy the front room','bonus',1,'living','toys',['helper'],{repeatable:true}),
 M('maths','Try 5 maths puzzles','learning',1,'study','maths',['independent'],{repeatable:true}),
 M('phonics','Try 5 phonics tests','learning',1,'study','letters',['independent'],{repeatable:true}),
 M('spelling','Try 5 spelling tests','learning',1,'study','letters',['independent'],{repeatable:true}),
 M('food','Try a new food','bonus',1,'dining','plate',['extra'],{repeatable:true}),
 M('help-tea','Help with tea','bonus',1,'kitchen','help',['helper'],{repeatable:true}),
 M('washing','Help put the washing away','bonus',1,'kitchen','laundry',['helper'],{repeatable:true}),
 M('sharing','Share with Aubrey','bonus',1,'aubrey','toys',['team'],{repeatable:true}),
 M('help-aubrey','Help Aubrey','bonus',1,'aubrey','teddy',['team','helper'],{repeatable:true}),
 M('help-someone','Help someone','bonus',2,'garden','tree',['helper'],{repeatable:true}),
 M('sport','Try hard at gymnastics or swimming','bonus',2,'garden','tree',['extra'],{repeatable:true}),
 M('initiative','Do a job before being asked','bonus',2,'garden','tree',['helper','extra'],{repeatable:true}),
 M('sorry','Say sorry without being asked','bonus',2,'garden','tree',['team'],{unprompted:true,repeatable:true}),
 M('try-again','Try again when something is tricky','bonus',3,'garden','tree',['extra'],{repeatable:true}),
 M('truth','Tell the truth when it is hard','bonus',5,'garden','tree',['extra'],{repeatable:true})
];
const R=(id,name,price,icon,note='',cooldown={type:'none',days:0})=>({id,name,price,icon,note,cooldown,available:true});
const rewards=[
 R('story','Extra bedtime story',8,'books'),R('stay-up','Stay up 15 minutes extra',10,'moon'),
 R('chocolate','Chocolate from the shop',10,'chocolate'),R('spa','Spa bath',15,'bath'),
 R('dinner','Pick dinner for everyone',15,'plate'),R('magazine','Get a magazine',18,'books'),
 R('mum-clothes',"Pick mum’s clothes",18,'dress','Mum picks the day'),
 R('movie','Movie night',30,'tv'),R('icecream','Trip for ice cream',35,'icecream'),
 R('playdate','Play date with a friend',40,'teddy','We will find a day together'),
 R('skip','A day off missions',60,'sun','Both routine blocks still earn their stars'),
 R('swim','Swimming with family',85,'swim'),R('nanna',"Sleepover at nanna’s",100,'house','We will find a day together'),
 R('toyshop','Trip to the toy shop',130,'gift'),
 R('in-charge','In charge for the day',160,'crown','Once each calendar month',{type:'month',days:0}),
 R('cash','Pocket money',15,'coins','£1 for 15 stars · save 65 stars for £5')
];
const virtues={
 independent:{name:'Doing it myself',icon:'wing',tiers:['First Flutter','Sky Hopper','Cloud Dancer','Star Flyer'],thresholds:[0,8,18,30]},
 helper:{name:'Helping out',icon:'lantern',tiers:['Spark Carrier','Lantern Lighter','Sunbeam Bringer','Golden Lantern'],thresholds:[0,4,9,16]},
 team:{name:'Being a good sister and friend',icon:'flower',tiers:['Seed Sower','Root Weaver','Blossom Maker','Tree Grower'],thresholds:[0,8,18,32]},
 extra:{name:'Extra special',icon:'star',tiers:['Star Spotter','Star Catcher','Comet Chaser','Moonjumper'],thresholds:[0,2,3,8]}
};
const seasons=[
 {id:'daffodils',name:'Daffodil days',art:'daffodils',kind:'fixed',start:'03-01',end:'03-31',layer:1},
 {id:'easter',name:'Easter magic',art:'easter',kind:'easter',before:7,after:7,layer:2},
 {id:'summer',name:'Sunflower days',art:'summer',kind:'fixed',start:'07-01',end:'08-31',layer:1},
 {id:'autumn',name:'Pumpkin days',art:'autumn',kind:'fixed',start:'10-10',end:'11-02',layer:1},
 {id:'winter',name:'Winter magic',art:'winter',kind:'fixed',start:'12-01',end:'01-06',layer:1},
 {id:'birthday',name:'Birthday magic',art:'birthday',kind:'fixed',start:'03-04',end:'03-04',layer:3}
];
const rooms=[
 {id:'bedroom',name:'My bedroom',label:'A cosy place to begin',icon:'bed'},
 {id:'bathroom',name:'Bathroom',label:'A little sparkle, a lovely smile',icon:'sink'},
 {id:'hallway',name:'Hallway',label:'Ready for a little adventure',icon:'shoes'},
 {id:'dining',name:'Dining room',label:'Good things happen together',icon:'table'},
 {id:'kitchen',name:'Kitchen',label:'Little hands, big help',icon:'laundry'},
 {id:'living',name:'Living room',label:'Stories, snuggles and memories',icon:'books'},
 {id:'study',name:'My desk',label:'Something new to discover',icon:'desk'},
 {id:'aubrey',name:'Aubrey’s room',label:'Kindness makes a happy home',icon:'teddy'},
 {id:'garden',name:'Fairy garden',label:'Where little kindnesses grow',icon:'tree'}
];
const outfits=[
 {id:'rose',name:'Rose petal',cost:0,color:'#d984a4',accent:'#f4c7d7'},
 {id:'sage',name:'Garden fairy',cost:1,color:'#739b7c',accent:'#cbdca9'},
 {id:'blue',name:'Bluebell fairy',cost:2,color:'#779fc2',accent:'#cbd9f0'},
 {id:'gold',name:'Sunbeam fairy',cost:3,color:'#d6a448',accent:'#fbe0a0'},
 {id:'violet',name:'Twilight fairy',cost:4,color:'#9683b5',accent:'#ded1eb'}
];
const data={missions,rewards,virtues,seasons,rooms,outfits};
if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.FairyData=data;
})(typeof window!=='undefined'?window:globalThis);
