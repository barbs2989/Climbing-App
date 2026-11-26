// 1) apply the verifier's flags; 2) revert any `covered` move whose numbers the target text does not state.
const fs=require("fs");const D=__dirname+"/batches/";const flags=JSON.parse(fs.readFileSync(__dirname+"/../verify/flags.json"));
const files={};const load=n=>files[n]=files[n]||{o:JSON.parse(fs.readFileSync(D+"out-"+n+".json")),i:new Map(JSON.parse(fs.readFileSync(D+"in-"+n+".json")).map(p=>[p.id,p]))};
const log=[];
for(const f of flags){const {o,i}=load(f.batch);const d=o.find(x=>x.id===f.id);if(!d){console.log("missing",f.id);continue;}
 if(f.fix==="edit"&&f.beta_new!=null&&f.moves){d.beta_new=f.beta_new;d.moves=f.moves;}else{d.beta_new=i.get(f.id).beta;d.moves=[];}log.push(["verifier",f.batch,f.id,f.fix,f.problem]);}
const targetText=(p,to)=>{const c=p.current;if(to==="rack")return JSON.stringify([c.rack_items,c.detailed_rack,c.rack,c.pro_needs]);if(to==="approach")return String(c.approach||"")+" "+String(c.area_walk_in||"")+" "+(c.approach_variant_names||[]).join(" ");return JSON.stringify(c[to]||"");};
const nums=s=>(String(s).replace(/,(\d{3})/g,"$1").match(/\d+(\.\d+)?/g)||[]);
for(let k=0;k<51;k++){const n=String(k).padStart(3,"0");const {o,i}=load(n);
 for(const d of o){const p=i.get(d.id);if(!d.moves.some(m=>m.action==="covered"))continue;
  for(const m of d.moves.filter(m=>m.action==="covered")){const tt=targetText(p,m.to).replace(/,(\d{3})/g,"$1");const miss=nums(m.from).filter(x=>!new RegExp("(^|[^0-9.])"+x.replace(".","\\.")+"($|[^0-9])").test(tt));
   if(miss.length){log.push(["numbers",n,d.id,m.to,miss.join(" ")+" :: "+m.from.slice(0,120)]);d.beta_new=p.beta;d.moves=[];break;}}}}
for(const [n,{o}] of Object.entries(files))fs.writeFileSync(D+"out-"+n+".json",JSON.stringify(o,null,1));
fs.writeFileSync(__dirname+"/../verify/reverts.json",JSON.stringify(log,null,1));for(const l of log)console.log(l.join(" | ").slice(0,230));console.log(log.length);
