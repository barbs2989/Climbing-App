// Classify alpine-filed 5.x candidates (wave-2 chunks 62..190) under the owner's crag rule.
// Usage: node classify.js            -> writes decisions.json + stats to stdout
const fs=require('fs');const path=require('path');
const {cand,T}=require('./load.js');const {scan}=require('./signals.js');
const R='C:/Users/nate_/dev/Climbing-App/research-data/trad-alpine-2026-11-11/';
const P='C:/Users/nate_/dev/Climbing-App/research-data/gpx-tracks-fkt-peaks-2026-10-29/';
const pa=new Map(JSON.parse(fs.readFileSync(P+'peaks.json')).map(p=>[p.id,p]));
const rows=JSON.parse(fs.readFileSync(T+'rows.json'));const byId=new Map(rows.map(r=>[r.id,r]));
// 0413/0418: every row moved TO alpine stays alpine; their areas are alpine evidence too.
const prot=new Set(),protArea=new Map();
for(const f of ['decisions.json','pass2-decisions.json'])for(const d of JSON.parse(fs.readFileSync(R+f))){const fin=d.final||d.decision;if(fin==='alpine'){prot.add(d.id);}}
for(const id of prot){const r=byId.get(id);if(r)protArea.set(r.area_id,id)}
// area research files
const norm=s=>String(s).toLowerCase().replace(/[’'`"]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').replace(/\bthe\b/g,' ').replace(/\s+/g,' ').trim();
const AR={};
for(const f of fs.readdirSync(__dirname+'/research').filter(f=>f.endsWith('.txt'))){let cur=null;
 for(const line of fs.readFileSync(__dirname+'/research/'+f,'utf8').split(/\r?\n/)){if(!line.trim()||line.startsWith('#!'))continue;
  if(line.startsWith('## ')){const [id,url,min,...q]=line.slice(3).split(' | ');const ids=id.trim().split(',');const m=min.trim();
   cur={ids,url:url.trim(),min:/^\d+$/.test(m)?+m:null,verdict:/^\d+$/.test(m)?(+m<=60?'crag':'alpine'):m,quote:q.join(' | ').trim(),routes:new Map(),file:f};for(const i of ids)AR[i]=cur;continue}
  const [nm,tags]=line.split('|');cur.routes.set(norm(nm),{name:nm.trim(),tags:(tags||'').trim()})}}
function matchRoute(rec,name){const k=norm(name);if(/^(unknown|unnamed|project)\b/.test(k))return null;if(rec.routes.has(k))return rec.routes.get(k);
 // prefix match only when UNIQUE: two MP routes sharing a prefix may carry different types
 const pm=[...rec.routes].filter(([kk])=>kk.length>=10&&k.length>=10&&(k.startsWith(kk)||kk.startsWith(k)));if(pm.length===1)return pm[0][1];if(pm.length>1)return null;
 const k2=k.replace(/ \d+$/,'');if(k2!==k&&rec.routes.has(k2))return rec.routes.get(k2);return null}
function typeOf(tags){const t=tags.split(/[ ,]+/);const T_=t.includes('T')||t.includes('TS');const S=t.includes('S')||t.includes('TS');const TR=t.includes('TR');
 if(T_)return 'trad';if(S)return 'sport';if(TR)return 'toprope';return null}
const TAGNAME={T:'Trad',S:'Sport',TS:'Trad, Sport',TR:'TR'};
const STRONG=/^(summit|glacier|crampon\/axe|snow travel|bivy\/camp|heli\/fly\/hut|peak\/ridge finish|long walk \(hours\)|long walk \(miles\)|pass crossing|wilderness\/backcountry)/;
const PEAKNAME=/\b(peak|mount|mt|mountain|spire|pinnacle|needle|tower|matterhorn|horn|crest|ridge|cirque|arete)\b/i;
const out=[];
for(const [id,c] of cand){const r=byId.get(id);const s=scan(r);const area=pa.get(r.area_id)||{};const sig=[];const ev=[];let verdict,nd=null,nds=null;
 const strongAlp=s.alp.filter(x=>STRONG.test(x));
 sig.push(...s.alp.map(x=>'ALPINE: '+x),...s.crag.map(x=>'CRAG: '+x));
 if(area.name)sig.push(`AREA: ${area.name} < ${area.parent_id||'?'}`);
 const rec=AR[r.area_id];
 if(prot.has(id)){verdict='stay_alpine';sig.push('PROTECTED: moved to alpine by 0413/0418');}
 else if(protArea.has(r.area_id)&&rec&&rec.verdict==='crag'){verdict='unsure';ev.push(rec.url);sig.push(`CONFLICT: area research says crag (~${rec.min} min) but 0413/0418 moved ${protArea.get(r.area_id)} in this area TO alpine`);}
 else if(protArea.has(r.area_id)&&!rec){verdict='stay_alpine';sig.push(`AREA DECIDED ALPINE in 0413/0418 (e.g. ${protArea.get(r.area_id)})`);}
 else if(rec&&rec.verdict==='alpine'){verdict='stay_alpine';sig.push(`AREA RESEARCH: alpine — ${rec.quote}`);ev.push(rec.url);}
 else if(rec&&rec.verdict==='crag'){ev.push(rec.url);sig.push(`AREA RESEARCH: crag, ~${rec.min} min on foot — ${rec.quote}`);
  const m=matchRoute(rec,r.name);
  if(!m){verdict='unsure';sig.push('MP route list for the crag does not name this route; protection type not confirmed by a source');}
  else{const t=typeOf(m.tags);sig.push(`MP TYPE: "${m.name}" tagged ${m.tags.split(/[ ,]+/).map(x=>TAGNAME[x]||x).join(', ')}, Alpine`);
   if(!t){verdict='unsure';sig.push('MP type has no Sport/Trad/TR tag')}
   else if(strongAlp.filter(x=>!/^summit/.test(x)||!/tower|perch|pillar|block|formation|boulder|dome|pinnacle|top of the (wall|cliff|crag)/i.test(x)).length){verdict='unsure';sig.push('CONFLICT: crag area but the row text carries a strong alpine signal')}
   else{verdict='to_'+(t==='toprope'?'tr':t);nd=t;
    const tagD=m.tags.split(/[ ,]+/).flatMap(x=>x==='T'?['trad']:x==='S'?['sport']:x==='TS'?['trad','sport']:x==='TR'?['toprope']:[]);
    const old=(Array.isArray(r.disciplines)?r.disciplines:[]).filter(x=>!['alpine','mountaineering','scrambling','scramble'].includes(x));
    nds=[...new Set([t,...tagD,...old])];}}}
 else if(rec&&rec.verdict==='unsure'){verdict='unsure';ev.push(rec.url);sig.push('AREA RESEARCH unsure — '+rec.quote)}
 else{ // row text only
  if(strongAlp.length)verdict='stay_alpine';
  else if(area.name&&PEAKNAME.test(area.name)&&s.alp.length){verdict='stay_alpine';sig.push('area is named as a peak/spire/ridge and the text has an alpine signal')}
  else{verdict='unsure';sig.push(s.crag.length?'row text hints at a crag but no source confirms approach time and protection type':'no approach evidence in the row and no research covers the crag')}}
 out.push({id,area_id:r.area_id,name:r.name,grade:r.grade,state:id.split('_')[0],verdict,new_discipline:nd,new_disciplines:nds,old_disciplines:r.disciplines,signals:sig,evidence_urls:[...new Set(ev)]});}
fs.writeFileSync(__dirname+'/decisions.json',JSON.stringify(out,null,1));
const cnt={};for(const o of out)cnt[o.verdict]=(cnt[o.verdict]||0)+1;console.log(cnt);
const um=out.filter(o=>AR[o.area_id]&&o.verdict==='unsure');console.log('unsure in researched areas',um.length);for(const o of um.slice(0,+process.argv[2]||40))console.log('  ',o.area_id,'|',o.name,'|',o.signals[o.signals.length-1].slice(0,90));
