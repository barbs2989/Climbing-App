// Fetch MP parent-area pages (owner's licence, paced-fetch) and save their description sections as JSON
// in the same shape as ~/dev/mp-data/_mp/_text/<id>.json. Resumable.
import fs from 'node:fs';
import { mpGet, mpStats } from '/Users/nathanbarber/dev/wallorder-run/repo/scripts/lib/paced-fetch.mjs';
const D='/Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/';
fs.mkdirSync(D+'parents',{recursive:true});
const ids=process.argv[2]?process.argv.slice(2):JSON.parse(fs.readFileSync(D+'need.json'));
const strip=h=>h.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0?39;|&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,'\n').trim();
let n=0;
for(const id of ids){
  const f=D+'parents/'+id+'.json'; if(fs.existsSync(f)) continue;
  let r; try{ r=await mpGet('https://www.mountainproject.com/area/'+id); }catch(e){ console.log(id,'network',e.message); continue; }
  if(r.status!==200){ console.log(id,'HTTP',r.status); if(r.status===404) fs.writeFileSync(f,'{}'); continue; }
  const out={}; const re=/<h2[^>]*>\s*(?:<a name[^>]*><\/a>\s*)?([A-Z][^<]*?)\s*(?:<!--[\s\S]*?)?<\/h2>\s*<div class="fr-view">([\s\S]*?)<\/div>/g; let m;
  while((m=re.exec(r.body))) out[m[1].trim()]=strip(m[2]);
  const gps=r.body.match(/<td>GPS:<\/td>\s*<td>\s*([-\d.]+),\s*([-\d.]+)/); if(gps) out._gps=[+gps[1],+gps[2]];
  fs.writeFileSync(f,JSON.stringify(out));
  if(++n%100===0) console.log(new Date().toISOString(),n,JSON.stringify(mpStats()));
}
console.log('DONE',n,JSON.stringify(mpStats()));
