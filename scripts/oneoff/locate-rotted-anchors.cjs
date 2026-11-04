// After an extraction: for each ROTTED injection anchor check:injection-anchors reports, where does its
// text live now? (src/components and lib/). A regex anchor is searched literally, so it reads NOWHERE;
// look those up by hand.   node scripts/oneoff/locate-rotted-anchors.cjs
const fs=require("fs"),cp=require("child_process");
let out;try{out=cp.execFileSync("node",["scripts/check-injection-anchors.mjs"],{encoding:"utf8",maxBuffer:1<<26});}catch(e){out=e.stdout;}
const lines=out.split("\n");const cands=[...fs.readdirSync("src/components").map(f=>"src/components/"+f),...fs.readdirSync("lib").filter(f=>/\.(js|jsx)$/.test(f)).map(f=>"lib/"+f)];
const txt=Object.fromEntries(cands.map(f=>[f,fs.readFileSync(f,"utf8")]));
for(let i=0;i<lines.length;i++){const m=lines[i].match(/^ROTTED\s+(\S+)\s+(.*)$/);if(!m)continue;const a=lines[i+1].match(/-> 0 matches in ([^:]*): (.*)$/);if(!a)continue;
 let anchor;try{anchor=JSON.parse(a[2]);}catch{anchor=a[2];}
 const hits=cands.filter(f=>txt[f].includes(anchor));
 console.log(`${m[1]} | ${m[2].slice(0,60)} | was ${a[1]} | now ${hits.join(",")||"NOWHERE: "+anchor.slice(0,160)}`);}
