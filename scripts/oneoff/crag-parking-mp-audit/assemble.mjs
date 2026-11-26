// Assemble per-AREA decisions from stage 1 (move) and stage 2 (resolve) into decisions.json for the
// apply script. Refuses a note that shares 6+ consecutive words with any MP sentence or is malformed.
import fs from 'node:fs';
const D='/Users/nathanbarber/.claude/jobs/c95e2347/tmp/pk/';
const G=new Map(JSON.parse(fs.readFileSync(D+'groups.json')).map(g=>[g.gid,g]));
const v1=fs.readdirSync(D+'out').filter(f=>/^b\d+\.json$/.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(D+'out/'+f)));
const v2=new Map(fs.readdirSync(D+'rout').flatMap(f=>JSON.parse(fs.readFileSync(D+'rout/'+f))).map(x=>[x.gid,x]));
const applied=new Set(fs.existsSync(D+'applied.json')?JSON.parse(fs.readFileSync(D+'applied.json')):[]);
const w=s=>String(s).toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean);
const copied=(note,mp)=>{const n=w(note); const src=w(mp.join(' ')).join(' '); for(let i=0;i+8<=n.length;i++) if((' '+src+' ').includes(' '+n.slice(i,i+8).join(' ')+' ')) return n.slice(i,i+8).join(' '); return null;};
const SOURCEY=/mountain ?project|\bMP\b|guide ?book|openstreetmap|\bOSM\b|according|source/i;
const out=[], rej=[]; const tally={move:0,placed:0,cleared:0,notes:0};
for(const x of v1){ const g=G.get(x.gid); if(!g) continue;
  let nw, note=null, why;
  if(x.v==='move'){ const c=g.cands[x.c]; if(!c){rej.push([x.gid,'bad c']);continue;} nw={lat:c.lat,lng:c.lng,name:c.name.startsWith('(unnamed')?null:c.name}; why='move: '+x.why; tally.move++; }
  else if(x.v==='wrong'){ const r=v2.get(x.gid); if(!r) continue; // not resolved yet
    const cf=D+'lookup/'+x.gid+'.cands.json'; const cands=fs.existsSync(cf)?JSON.parse(fs.readFileSync(cf)):[];
    if(r.c===-1){ if(!r.name){rej.push([x.gid,'rename without name']);continue;} nw={lat:g.pin.lat,lng:g.pin.lng,name:r.name}; tally.renamed=(tally.renamed||0)+1; }
    else if(r.c!=null){ const c=cands[r.c]; if(!c){rej.push([x.gid,'bad rc']);continue;} nw={lat:c.lat,lng:c.lng,name:(r.name||c.name||null)}; tally.placed++; } else { nw=null; tally.cleared++; }
    why='wrong: '+x.why+' | '+(r.why||'');
    if(r.note && !g.our_note){ const cp=copied(r.note,g.mp); if(cp||SOURCEY.test(r.note)||r.note.length<20||r.note.length>300||/\b[A-Z]{5,}\b/.test(r.note)) rej.push([x.gid,'note refused: '+(cp||r.note)]); else { note=r.note; tally.notes++; } }
    if(nw&&nw.name&&(SOURCEY.test(nw.name)||nw.name.length>80)) { rej.push([x.gid,'name refused '+nw.name]); nw.name=null; }
  } else continue;
  for(const a of g.areas){ if(applied.has(a.id)) continue; out.push({id:a.id,gid:x.gid,old:{lat:g.pin.lat,lng:g.pin.lng,name:g.pin.name},new:nw,...(note?{note}:{}),why}); }
}
fs.writeFileSync(D+'decisions.json',JSON.stringify(out,null,1));
console.log(tally,{areaRows:out.length,rejected:rej.length}); for(const r of rej.slice(0,20)) console.log('  REJ',r.join(' | '));
