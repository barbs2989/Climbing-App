// node revert.js NNN id[:target] ...  — keep the route's beta whole; its moves to `target` (or all) become copies/no-ops
const fs=require("fs");const D=__dirname+"/batches/";const [n,...ids]=process.argv.slice(2);
const f=D+"out-"+n+".json";const o=JSON.parse(fs.readFileSync(f));const i=new Map(JSON.parse(fs.readFileSync(D+"in-"+n+".json")).map(p=>[p.id,p]));
for(const spec of ids){const [id,t]=spec.split(":");const d=o.find(x=>x.id===id);if(!d){console.log("no",id);continue;}
 d.beta_new=i.get(id).beta;for(const m of d.moves){if(t&&m.to!==t)continue;if(m.action==="add")m.action="copy";if(m.action==="covered")m.action="kept";}
 d.moves=d.moves.filter(m=>m.action!=="kept");if(!t){}console.log("reverted",id);}
fs.writeFileSync(f,JSON.stringify(o,null,1));
