// lookup.mjs + reuse: a group whose first area lies within 1 km of an already-fetched one copies that
// result (4 km radius around a point <=1 km away still covers 3 km around this one). Arg: "rev" for reverse.
import fs from 'node:fs';
const D='/Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/';
const km=(a,b,c,d)=>{const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;const h=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const G=new Map(JSON.parse(fs.readFileSync(D+'groups.json')).map(g=>[g.gid,g]));
const EP='https://maps.mail.ru/osm/tools/overpass/api/interpreter';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let n=0,reused=0;
for(let pass=0;pass<1000;pass++){
  const verdicts=fs.readdirSync(D+'out').filter(f=>/^b\d+\.json$/.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(D+'out/'+f)));
  let want=verdicts.filter(v=>v.v==='wrong').map(v=>v.gid).filter(g=>!fs.existsSync(D+'lookup/'+g+'.json'));
  if(process.argv[2]==='rev') want.reverse();
  if(!want.length){ if(fs.readdirSync(D+'batches').every(f=>fs.existsSync(D+'out/'+f))) break; await sleep(60000); continue; }
  const doneFiles=fs.readdirSync(D+'lookup').filter(f=>/^g\d+\.json$/.test(f)).map(f=>f.slice(0,-5));
  const gid=want[0]; const f=D+'lookup/'+gid+'.json'; const a=G.get(gid).areas[0];
  const nb=doneFiles.map(x=>G.get(x)).find(g=>g&&km(a.lat,a.lng,g.areas[0].lat,g.areas[0].lng)<=1.0);
  if(nb){ fs.copyFileSync(D+'lookup/'+nb.gid+'.json',f); reused++; continue; }
  const q=`[out:json][timeout:40];(nwr["amenity"="parking"](around:4000,${a.lat},${a.lng});nwr["highway"="trailhead"](around:4000,${a.lat},${a.lng});nwr["leisure"="picnic_site"]["name"](around:4000,${a.lat},${a.lng});nwr["tourism"="picnic_site"]["name"](around:4000,${a.lat},${a.lng}););out center tags;`;
  let ok=false;
  for(let t=0;t<4&&!ok;t++){ try{ const r=await fetch(EP,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'climbing-app-parking-audit'},signal:AbortSignal.timeout(100000)});
      if(r.status===200){ const j=await r.json(); if(!fs.existsSync(f)) fs.writeFileSync(f,JSON.stringify((j.elements||[]).map(x=>({lat:x.lat??x.center?.lat,lng:x.lon??x.center?.lon,name:x.tags?.name||null,kind:x.tags?.highway==='trailhead'?'trailhead':x.tags?.amenity==='parking'?'parking':'picnic',access:x.tags?.access||null,road:x.tags?.['addr:street']||null})).filter(x=>x.lat!=null&&x.access!=='private'&&x.access!=='no'))); ok=true; }
      else await sleep(5000*(t+1)); }catch{ await sleep(5000*(t+1)); } }
  if(!ok){ console.log('FAILED',gid); fs.writeFileSync(f,'[]'); }
  console.log(new Date().toISOString(),'fetched',++n,'reused',reused,'left',want.length-1);
  await sleep(1000);
}
console.log('DONE',n,reused);
