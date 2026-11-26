const fs=require("fs");const D=__dirname;const b=JSON.parse(fs.readFileSync(D+"/beta.json"));
const T={
 approach:/\b(approach|trail ?head|parking|park (at|in|on)|hike (in|up)|walk(s|ing)? (in|up|to|along)|minutes? (walk|hike|from the (car|road|lot))|from the (car|lot|road)|bushwhack|scramble up to the base|to reach the base|access(ed)? (via|from|by))\b/i,
 descent:/\b(descen(d|t)|rap(pel)?s?\b|rappel|lower(ing)? off|lower from|walk[- ]?off|walk off|downclimb|down[- ]climb|to get down)\b/i,
 gear:/\b(bring|rack|cams?\b|nuts\b|stoppers|quickdraws|draws\b|#\d|\bC4\b|tricams?|hexes|single rack|double rack|(60|70|50|80) ?m(eter)? rope|two ropes|double ropes|slings)\b/i,
 camp:/\b(camp(site|ing|ed)?|bivy|bivouac|tent)\b/i,
 access:/\b(permit|closure|closed (to|for|from|during)|seasonal closure|raptor|nesting|fee|private property|landowner)\b/i,
 pro:/\b(protection|pro\b|bolts?\b|bolted|gear\b|anchors?\b|chains\b)\b/i,
 time:/\b(\d+(\.\d+)?\s*(-|to)\s*\d+\s*hours?|\d+\s*hours?\b|car[- ]to[- ]car|alpine start|start (early|by))\b/i,
};
const cnt={},ex={};let any=0;const rows=[];
for(const r of b){const sents=String(r.beta).split(/(?<=[.!?])\s+(?=[A-Z])/);const hit={};for(const s of sents)for(const [k,re] of Object.entries(T))if(re.test(s)){(hit[k]=hit[k]||[]).push(s);}
 if(Object.keys(hit).length){any++;rows.push({id:r.id,st:r._st,disc:r.discipline,hit:Object.keys(hit)});}
 for(const k of Object.keys(hit)){cnt[k]=(cnt[k]||0)+1;(ex[k]=ex[k]||[]).push(r.id+" ["+r.discipline+"] :: "+hit[k][0].slice(0,200));}}
console.log("any",any,cnt);for(const k in ex){console.log("\n==",k);for(const e of ex[k].sort(()=>Math.random()-.5).slice(0,8))console.log(" ",e);}
fs.writeFileSync(D+"/hits.json",JSON.stringify(rows));
