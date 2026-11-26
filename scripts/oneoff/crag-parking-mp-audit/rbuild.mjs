// Stage 2 input: WRONG groups + their OSM lookup -> rbatches/rNN.json (only groups not yet resolved).
import fs from 'node:fs';
const D='/Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/';
const km=(a,b,c,d)=>{const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;const h=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const brg=(a,b,c,d)=>{const y=Math.sin((d-b)*Math.PI/180)*Math.cos(c*Math.PI/180),x=Math.cos(a*Math.PI/180)*Math.sin(c*Math.PI/180)-Math.sin(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.cos((d-b)*Math.PI/180);const t=(Math.atan2(y,x)*180/Math.PI+360)%360;return ['N','NE','E','SE','S','SW','W','NW'][Math.round(t/45)%8];};
const G=new Map(JSON.parse(fs.readFileSync(D+'groups.json')).map(g=>[g.gid,g]));
const v=fs.readdirSync(D+'out').filter(f=>/^b\d+\.json$/.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(D+'out/'+f)));
fs.mkdirSync(D+'rbatches',{recursive:true}); fs.mkdirSync(D+'rout',{recursive:true});
const done=new Set(fs.readdirSync(D+'rout').flatMap(f=>JSON.parse(fs.readFileSync(D+'rout/'+f)).map(x=>x.gid)));
const queued=new Set(fs.readdirSync(D+'rbatches').flatMap(f=>JSON.parse(fs.readFileSync(D+'rbatches/'+f)).map(x=>x.gid)));
const items=[]; let nolook=0;
for(const x of v){ if(x.v!=='wrong'||done.has(x.gid)||queued.has(x.gid)) continue; const lf=D+'lookup/'+x.gid+'.json'; if(!fs.existsSync(lf)){nolook++;continue;}
  const g=G.get(x.gid), a=g.areas[0];
  const osm=JSON.parse(fs.readFileSync(lf)).map(o=>({name:o.name,kind:o.kind,road:o.road,lat:o.lat,lng:o.lng}));
  const pins=g.cands.filter(c=>c.kind==='pin').map(c=>({name:c.name,kind:'pin',road:null,lat:c.lat,lng:c.lng}));
  const all=[...osm,...pins].map(o=>({...o,km:+km(a.lat,a.lng,o.lat,o.lng).toFixed(2),dir:brg(a.lat,a.lng,o.lat,o.lng)})).filter(o=>!(Math.abs(o.lat-g.pin.lat)<2e-4&&Math.abs(o.lng-g.pin.lng)<2e-4));
  const named=all.filter(o=>o.name).sort((p,q)=>p.km-q.km).slice(0,25), unnamed=all.filter(o=>!o.name).sort((p,q)=>p.km-q.km).slice(0,8);
  const cands=[...named,...unnamed].map((o,k)=>({c:k,...o,lat:+o.lat.toFixed(6),lng:+o.lng.toFixed(6)}));
  fs.writeFileSync(D+'lookup/'+x.gid+'.cands.json',JSON.stringify(cands));
  items.push({gid:x.gid,pin:g.pin.name,park_at:x.park_at,near:x.near,has_note:!!g.our_note,mp:g.mp,areas:g.areas.slice(0,5).map(a=>({name:a.name,pin_km:a.pin_km,pin_dir:a.pin_dir})),cands:cands.map(({lat,lng,...r})=>r)}); }
let n=fs.readdirSync(D+'rbatches').length;
for(let i=0;i<items.length;i+=40){ fs.writeFileSync(D+'rbatches/r'+String(n).padStart(2,'0')+'.json',JSON.stringify(items.slice(i,i+40),null,1)); n++; }
console.log({new:items.length,nolook,rbatches:n});
