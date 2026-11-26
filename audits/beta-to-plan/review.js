// print every changed route in the given out files: old beta, new beta, moves, current target
const fs=require("fs");const D=__dirname+"/batches/";
for(const n of process.argv.slice(2)){const o=JSON.parse(fs.readFileSync(D+"out-"+n+".json"));const i=new Map(JSON.parse(fs.readFileSync(D+"in-"+n+".json")).map(p=>[p.id,p]));
 if(o.length!==i.size)console.log("!! COUNT MISMATCH",n,o.length,i.size);
 for(const d of o){const p=i.get(d.id);if(!p){console.log("!! unknown id",d.id);continue;}if(!d.moves.length&&d.beta_new===p.beta)continue;
  console.log("\n##",n,d.id,p.discipline,"p"+p.pitches);
  if(d.beta_new!==p.beta){console.log("  OLD:",p.beta.slice(0,500).replace(/\n/g," / "));console.log("  NEW:",d.beta_new.slice(0,500).replace(/\n/g," / "));}
  for(const m of d.moves){const cur=p.current[m.to==="rack"?"rack_items":m.to];console.log("  ",m.to,m.action,"| from:",String(m.from||"").slice(0,160),"| value:",JSON.stringify(m.value||"").slice(0,220));if(m.to!=="bolts")console.log("     cur:",JSON.stringify(m.to==="rack"?{ri:p.current.rack_items,dr:p.current.detailed_rack,r:p.current.rack,pn:p.current.pro_needs}:cur).slice(0,220));else console.log("     cur bolts:",p.current.bolts);}}}
