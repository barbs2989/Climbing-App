// Build judge groups: every pinned area whose MP text (own + parents + "as for X") has parking sentences
// and whose pin name is not fully corroborated by that text. Writes groups.json + batches/bNN.json.
import fs from 'node:fs';
const D='/Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/';
const MP='/Users/nathanbarber/dev/mp-data/_mp/';
const areas=JSON.parse(fs.readFileSync(D+'areas.json'));
const mp=JSON.parse(fs.readFileSync(D+'../mptree.json')); const mpParent={};
for(const j of Object.values(mp)) for(const k of j.kids||[]) mpParent[k]=j.id;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/^[a-z]?\d+[a-z]?[.)]\s+/,'').replace(/\(.*?\)/g,'').replace(/['’]/g,'').replace(/\b(the|a)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').sort().join(' ');
const km=(a,b,c,d)=>{const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;const h=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const brg=(a,b,c,d)=>{const y=Math.sin((d-b)*Math.PI/180)*Math.cos(c*Math.PI/180),x=Math.cos(a*Math.PI/180)*Math.sin(c*Math.PI/180)-Math.sin(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.cos((d-b)*Math.PI/180);const t=(Math.atan2(y,x)*180/Math.PI+360)%360;return ['N','NE','E','SE','S','SW','W','NW'][Math.round(t/45)%8];};
const byName=new Map(); for(const j of Object.values(mp)){const n=norm(j.name); if(!byName.has(n)) byName.set(n,[]); byName.get(n).push(j);}
const text=id=>{for(const f of [MP+'_text/'+id+'.json',D+'parents/'+id+'.json']) if(fs.existsSync(f)) try{return JSON.parse(fs.readFileSync(f))}catch{} return null};
const near=(name,lat,lng,max)=>{const c=(byName.get(norm(name))||[]).filter(j=>j.lat!=null).map(j=>({j,d:km(lat,lng,j.lat,j.lng)})).sort((x,y)=>x.d-y.d); return c[0]&&c[0].d<max?c[0].j:null;};
const PARK=/\b(park|parks|parked|parking|lot|pull[- ]?out|pull[- ]?off|turn[- ]?out|trailhead|trail head|shoulder|gate|campground|day[- ]use|picnic|leave (?:your|the) car|drive|road)\b/i;
const sents=t=>String(t||'').replace(/\s+/g,' ').split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/).filter(s=>PARK.test(s)).map(s=>s.slice(0,320));
const STOP=new Set("parking park lot lots area areas trailhead trailheads trail trails th the wall walls rock rocks crag crags boulder boulders bouldering state national forest recreation north south east west upper lower middle main overflow day use access point county road rd sno of and at a an de del el la las los climbing climbers climb site sites public visitor center centre gate loop lookout picnic usfs blm nps dnr wma highway hwy route street st avenue ave drive dr new old pullout pull off turnout small large free fee".split(" "));
const toks=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['’]/g,'').replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w.length>=3&&!STOP.has(w));
const osmCache=new Map(); const osmCell=k=>{ if(!osmCache.has(k)){const f=D+'osm/'+k+'.json'; osmCache.set(k,fs.existsSync(f)?JSON.parse(fs.readFileSync(f)):null);} return osmCache.get(k); };
const osmNear=(lat,lng)=>{const out=[];const i=Math.floor(lat/0.1),j=Math.floor(lng/0.1);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const c=osmCell((i+a)+'_'+(j+b)); if(c) out.push(...c);} const seen=new Set(); return out.filter(x=>{const k=x.lat.toFixed(5)+x.lng.toFixed(5); if(seen.has(k)) return false; seen.add(k); return x.access!=='private';});};
const ourLots=[]; {const s=new Set(); for(const a of areas) if(a.parking_lat!=null){const k=a.parking_lat.toFixed(5)+','+a.parking_lng.toFixed(5); if(!s.has(k)){s.add(k); ourLots.push({lat:a.parking_lat,lng:a.parking_lng,name:a.parking_name});}}}
const stats={pinned:0,noMp:0,noParkText:0,agree:0,judge:0}; const groups=new Map(); const ledger=[];
for(const a of areas){ if(a.parking_lat==null) continue; stats.pinned++;
  const m=a.lat!=null?near(a.name,a.lat,a.lng,3):null; if(!m){stats.noMp++; ledger.push({id:a.id,status:'no-mp-match'}); continue;}
  const ss=[]; let cur=m.id; const own=text(m.id);
  if(own&&own['Getting There']) ss.push('[own Getting There] '+own['Getting There'].replace(/\s+/g,' ').slice(0,700));
  for(const s of sents(own&&own.Description)) ss.push('[own] '+s);
  cur=mpParent[m.id]; const refsrc=[own&&own['Getting There']];
  for(let k=1;k<6&&cur;k++){ const j=mp[cur]; if(!j||!mpParent[cur]) break; const t=text(cur); if(t){ for(const s of sents(t['Getting There'])) ss.push('[parent '+j.name+'] '+s); for(const s of sents(t.Description)) ss.push('[parent '+j.name+'] '+s); refsrc.push(t['Getting There']);} if((j.kids||[]).length>400) break; cur=mpParent[cur]; }
  const refs=new Set(); for(const g of refsrc) if(g) for(const r of g.matchAll(/(?:as for|same as(?: for)?|see|approach for|towards?|past)\s+(?:the\s+)?([A-Z][\w'’ .-]{2,40}?)(?:[.,;:)]| -|\s+and\s|\s+then\s|\s+but\s)/g)) refs.add(r[1].trim());
  for(const r of refs){ const c=near(r,a.lat,a.lng,5); if(c&&c.id!==m.id){const t=text(c.id); if(t&&t['Getting There']) ss.push('[see '+c.name+'] '+t['Getting There'].replace(/\s+/g,' ').slice(0,500));}}
  const all=ss.join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['’]/g,'');
  if(!ss.length || !PARK.test(all)){stats.noParkText++; ledger.push({id:a.id,status:'no-mp-parking-text'}); continue;}
  const t=toks(a.parking_name); const hit=t.filter(w=>new RegExp('\\b'+w+'\\b').test(all));
  void hit;
  stats.judge++;
  const key=a.parking_lat.toFixed(5)+','+a.parking_lng.toFixed(5)+'|'+(a.parking_note||'')+'|'+ss.filter(s=>!s.startsWith('[own')).join('|')+'|'+ss.filter(s=>s.startsWith('[own')).join('|');
  if(!groups.has(key)) groups.set(key,{pin:{name:a.parking_name,lat:a.parking_lat,lng:a.parking_lng},our_note:a.parking_note||null,mp:ss,areas:[]});
  groups.get(key).areas.push({id:a.id,name:a.name,type:a.area_type,lat:a.lat,lng:a.lng,pin_km:+km(a.lat,a.lng,a.parking_lat,a.parking_lng).toFixed(2),pin_dir:brg(a.lat,a.lng,a.parking_lat,a.parking_lng)});
}
const G=[...groups.values()].map((g,i)=>{const c=g.areas[0]; g.gid='g'+i;
  const cands=[...osmNear(c.lat,c.lng).map(x=>({name:x.name,kind:x.kind,lat:x.lat,lng:x.lng})), ...ourLots.map(x=>({name:x.name,kind:'pin',lat:x.lat,lng:x.lng}))]
    .map(x=>({...x,km:+km(c.lat,c.lng,x.lat,x.lng).toFixed(2),dir:brg(c.lat,c.lng,x.lat,x.lng)})).filter(x=>x.km<=4 && !(Math.abs(x.lat-g.pin.lat)<1e-5&&Math.abs(x.lng-g.pin.lng)<1e-5));
  cands.sort((x,y)=>(!!y.name-!!x.name)||x.km-y.km);
  const named=cands.filter(x=>x.name).slice(0,10), unnamed=cands.filter(x=>!x.name).sort((x,y)=>x.km-y.km).slice(0,2);
  g.cands=[...named,...unnamed].map((x,k)=>({c:k,name:x.name||'(unnamed '+x.kind+')',kind:x.kind,km:x.km,dir:x.dir,lat:+x.lat.toFixed(6),lng:+x.lng.toFixed(6)}));
  return g;});
fs.writeFileSync(D+'groups.json',JSON.stringify(G)); fs.writeFileSync(D+'ledger.json',JSON.stringify(ledger));
fs.mkdirSync(D+'batches',{recursive:true});
// batches of ~120 KB of prompt-facing JSON (lat/lng stripped from cands to save tokens)
let b=[],sz=0,bn=0; const flush=()=>{ if(b.length){fs.writeFileSync(D+'batches/b'+String(bn).padStart(2,'0')+'.json',JSON.stringify(b,null,1)); bn++; b=[]; sz=0;} };
for(const g of G){ const v={gid:g.gid,pin:{name:g.pin.name},our_note:g.our_note,mp:g.mp,areas:g.areas.map(x=>({name:x.name,pin_km:x.pin_km,pin_dir:x.pin_dir})).slice(0,8),n_areas:g.areas.length,cands:g.cands.map(({lat,lng,...r})=>r)}; const s=JSON.stringify(v).length; if(sz+s>90000) flush(); b.push(v); sz+=s; }
flush();
console.log(stats,{groups:G.length,batches:bn});
