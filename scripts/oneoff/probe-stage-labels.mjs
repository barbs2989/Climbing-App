import { selectAll } from "../lib/supabase-env.mjs";

const routes = await selectAll("routes","id,name,area_id,pitch_detail,discipline",{}, {pageSize:1000});
const withPd = routes.filter(r=>Array.isArray(r.pitch_detail)&&r.pitch_detail.length);
console.log("routes with pitch_detail:", withPd.length);

// A "stage" entry is one whose label is prose rather than a pitch number. Approximate
// the app's pitchEntryKind by asking whether the label parses as a number.
const rows=[];
for(const r of withPd){
  for(const p of r.pitch_detail){
    const lbl=String((p.pitch!=null?p.pitch:p.n)||"").trim();
    if(!lbl) continue;
    if(!isNaN(Number(lbl))) continue;         // numbered -> a roped pitch
    rows.push({route:r.id, disc:r.discipline, lbl, len:lbl.length, grade:p.grade||null, crux:!!p.crux, lengthM:p.lengthM!=null?p.lengthM:null});
  }
}
rows.sort((a,b)=>b.len-a.len);
console.log("stage-style entries:", rows.length, "across", new Set(rows.map(r=>r.route)).size, "routes");
console.log("\n--- 25 LONGEST stage labels (the overlap risk) ---");
for(const r of rows.slice(0,25)) console.log(String(r.len).padStart(4), "|", r.route, "| crux:"+(r.crux?"Y":"n"), "grade:"+r.grade, "| "+JSON.stringify(r.lbl));

console.log("\n--- longest label that ALSO has grade + length + crux (worst case row) ---");
const worst = rows.filter(r=>r.grade&&r.lengthM!=null).sort((a,b)=>b.len-a.len).slice(0,8);
for(const r of worst) console.log(String(r.len).padStart(4),"|",r.route,"| crux:"+(r.crux?"Y":"n"),"| grade:"+r.grade,"| len:"+r.lengthM,"|",JSON.stringify(r.lbl));
