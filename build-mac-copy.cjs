/* Build a genuinely standalone HTML preview. Fail on missing artwork. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,base=path.join(root,'website');
const modules=['data.js','engine.js','fairy-cast.js','art.js','layout.js','lists.js','celebrations.js','world.js','db.js','app.js'];
let html=fs.readFileSync(path.join(base,'index.html'),'utf8');
html=html.replace(/<link[^>]+>/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
const css=fs.readFileSync(path.join(base,'styles.css'),'utf8');
let code=modules.map(file=>fs.readFileSync(path.join(base,file),'utf8')).join('\n');
const refs=[...new Set((code+'\n'+css).match(/assets\/[A-Za-z0-9_./-]+\.(?:webp|png|jpg|svg)/g)||[])];
if(refs.filter(x=>x.startsWith('assets/rooms/')).length!==9)throw Error('Expected all nine rooms.');
if(refs.filter(x=>x.startsWith('assets/characters/')).length!==3)throw Error('Expected Alba and both cats.');
if(refs.filter(x=>x.startsWith('assets/fairies/')).length!==6)throw Error('Expected all six supplied fairies.');
let embeddedCSS=css;
for(const ref of refs){const file=path.join(base,ref);if(!fs.existsSync(file))throw Error('Missing asset: '+ref);const mime={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file)],url=`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;code=code.replaceAll(ref,url);embeddedCSS=embeddedCSS.replaceAll(ref,url);}
if(/assets\/.*\.(webp|png|jpg)/.test(code))throw Error('An artwork path was not embedded.');
html=html.replace('</head>',()=>`<style>${embeddedCSS}</style></head>`);
html=html.replace('<title>Fairy Star Missions</title>','<title>Fairy Star Missions · Clean-start Mac copy</title>');
html=html.replace('</body>',()=>`<script>window.FSM_PREVIEW=true;\n${code.replace(/<\/script/gi,'<\\/script')}</script></body>`);
const destination=path.join(root,'Mac - clear test progress.html');fs.writeFileSync(destination,html);
console.log(`Standalone preview: ${refs.length} artwork files, ${(Buffer.byteLength(html)/1048576).toFixed(2)} MB`);
