// node dropmove.js NNN id target — drop the route's moves to `target` and put their `from` text back into beta_new
// (appended at the end of the paragraph it came from is not knowable, so it is re-inserted where it stood in the old beta
// by rebuilding beta_new from the old beta minus the remaining moves' `from` strings).
const fs=require("fs");const D=__dirname+"/batches/";const [n,id,t]=process.argv.slice(2);
const f=D+"out-"+n+".json";const o=JSON.parse(fs.readFileSync(f));const p=JSON.parse(fs.readFileSync(D+"in-"+n+".json")).find(x=>x.id===id);
const d=o.find(x=>x.id===id);d.moves=d.moves.filter(m=>m.to!==t);
let b=p.beta;for(const m of d.moves){if(m.action==="copy"||!m.from)continue;const s=m.from.trim();if(!b.includes(s)){console.log("cannot place",s);process.exit(1);}b=b.replace(s,"");}
b=b.replace(/\s*;\s*,/g,";").replace(/;\s*\./g,".").replace(/\s+([.,;])/g,"$1").replace(/,\s*and\s*\./,".").replace(/ {2,}/g," ").trim();
d.beta_new=b;fs.writeFileSync(f,JSON.stringify(o,null,1));console.log(id,"→",b);
