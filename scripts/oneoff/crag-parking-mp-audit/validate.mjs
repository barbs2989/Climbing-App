import fs from 'node:fs';
const D='/Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/';
const files=fs.readdirSync(D+'batches').sort(); const tally={}; const missing=[], bad=[];
for(const f of files){ const inp=JSON.parse(fs.readFileSync(D+'batches/'+f)); const o=D+'out/'+f;
  if(!fs.existsSync(o)){missing.push(f);continue;}
  let out; try{out=JSON.parse(fs.readFileSync(o))}catch{bad.push(f+' unparseable');continue;}
  const ids=new Set(out.map(x=>x.gid)); const lack=inp.filter(g=>!ids.has(g.gid)).length; if(lack||out.length!==inp.length) bad.push(f+` lacks ${lack}, out ${out.length} vs in ${inp.length}`);
  for(const x of out) tally[x.v]=(tally[x.v]||0)+1; }
console.log({done:files.length-missing.length,missing:missing.length,bad,tally,next:missing.slice(0,12).join(' ')});
