// Build agent packets for every route whose beta mentions a Plan-section topic.
const fs=require("fs"),zlib=require("zlib"),path=require("path");
const D=__dirname;const i=require(D+"/index.json");const areas=new Map();const contribs=new Map();
for(const s of Object.values(i.states))for(const p of s.parts){let b=fs.readFileSync(path.join(D,p.file));if(b[0]===0x1f)b=zlib.gunzipSync(b);const j=JSON.parse(b);for(const a of j.areas||[])areas.set(a.id,a);for(const c of j.contribs||[]){if(!contribs.has(c.route_id))contribs.set(c.route_id,[]);contribs.get(c.route_id).push({field:c.field,status:c.status,kind:c.kind});}}
const beta=JSON.parse(fs.readFileSync(D+"/beta.json"));const hits=new Map(JSON.parse(fs.readFileSync(D+"/hits.json")).map(h=>[h.id,h.hit]));
const CRAG=["trad","sport","toprope","aid","bouldering"];
const out=[];
for(const r of beta){if(!hits.has(r.id))continue;
 const crag=CRAG.includes(r.discipline);const multi=(r.pitches||0)>1;
 const descStored=!!((r.descent||"").trim()||(r.descent_text||"").trim());
 const descentSection=!crag||r.discipline==="aid"||multi||descStored;
 const a=String(r.descent||"").trim(),b=String(r.descent_text||"").trim();const descCol=b.length>a.length?"descent_text":"descent";
 const ar=areas.get(r.area_id)||{};
 const targets=["approach"];if(descentSection&&r.discipline!=="bouldering")targets.push("descent");
 if(r.discipline!=="bouldering")targets.push("rack");
 if(["sport","trad","aid"].includes(r.discipline)&&r.bolts==null)targets.push("bolts");
 if(["sport","trad","toprope","aid"].includes(r.discipline)&&!r.anchor)targets.push("anchor");
 if(crag&&!r.location)targets.push("location");
 if(!crag)targets.push("bivy");
 const cf=(contribs.get(r.id)||[]).filter(c=>c.status==="approved"||c.status==="agreed"||c.status==="applied").map(c=>c.field);
 out.push({id:r.id,name:r.name,state:r._st,discipline:r.discipline,pitches:r.pitches,crag,topics:hits.get(r.id),
  beta:r.beta,overview:r.overview||null,
  current:{approach:r.approach||null,area_walk_in:ar.approach||null,approach_variant_names:(r.approach_variants||[]).filter(Boolean).map(v=>v.name),
   descent:descentSection?(descCol==="descent"?a:b)||null:"(no DESCENT section on this route's page)",
   rack_items:r.rack_items||null,detailed_rack:r.detailed_rack||null,rack:(r.rack&&r.rack.length)?r.rack:null,pro_needs:r.pro_needs||null,
   bolts:r.bolts,anchor:r.anchor||null,location:r.location||null,bivy:(r.bivy||[]).map(x=>x&&x.name).filter(Boolean),rope_note:r.rope_note||null},
  allowed_targets:targets,approved_contrib_fields:cf.length?cf:undefined,_descCol:descCol});
}
out.sort((x,y)=>x.state.localeCompare(y.state)||x.id.localeCompare(y.id));
fs.mkdirSync(D+"/batches",{recursive:true});const N=40;let k=0;
for(let s=0;s<out.length;s+=N){fs.writeFileSync(D+"/batches/in-"+String(k).padStart(3,"0")+".json",JSON.stringify(out.slice(s,s+N),null,1));k++;}
console.log(out.length,"packets",k,"batches");const withC=out.filter(o=>o.approved_contrib_fields);console.log("with approved contribs",withC.length,JSON.stringify(withC.slice(0,5).map(o=>[o.id,o.approved_contrib_fields])));
const c0=[...contribs.values()].flat();const st={};for(const c of c0)st[c.status]=(st[c.status]||0)+1;console.log(st);
