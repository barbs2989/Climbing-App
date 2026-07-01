// Usage: node apply_enrich.mjs <findings.json>
// FACTUAL fields (grades, FA, pitches, stats): always override — research wins, old value logged.
// PROSE/OBJECT fields (beta, approach, timing, etc.): gap-fill only — only write if currently empty.
import { readFileSync, writeFileSync } from "node:fs";
const env = readFileSync("/Users/nathanbarber/dev/Climbing-App/.env.local","utf8");
const url = (env.match(/VITE_SUPABASE_URL=(.+)/)||[])[1].trim().replace(/\/$/,"");
const SK = "sb_secret_gaxDbSOA-44NvkTiDLOoiA_qB4R62aP";
const H = { apikey:SK, Authorization:"Bearer "+SK, "Content-Type":"application/json" };
const RF = "/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/routes.json";
const AF = "/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/areas.json";
const rj = JSON.parse(readFileSync(RF,"utf8")), aj = JSON.parse(readFileSync(AF,"utf8"));
const findings = JSON.parse(readFileSync(process.argv[2],"utf8"));
const rById = {}; rj.routes.forEach(r=>rById[r.id]=r);
const aById = {}; aj.areas.forEach(a=>aById[a.id]=a);
const empty = v => v==null || v==="" || (Array.isArray(v)&&!v.length);

// MAP: camelField -> { db, xform, override }
// override:true  = always apply (research beats existing data — factual/verifiable fields)
// override:false = gap-fill only (only write if current value is empty — prose fields)
// Every db column verified against supabase/migrations 0001-0013.
const MAP = {
  // factual — always override
  fa:           { db:"fa",           override:true  },
  rockGrade:    { db:"rock_grade",   override:true  },
  iceGrade:     { db:"ice_grade",    override:true  },
  alpineGrade:  { db:"alpine_grade", override:true  },
  aidGrade:     { db:"aid_grade",    override:true  },
  commitment:   { db:"commitment",   override:true  },
  pitches:      { db:"pitches",      override:true  },
  rappels:      { db:"rappels",      override:true, xform:v=>String(v) },
  objHaz:       { db:"obj_haz",      override:true  },
  season:       { db:"season",       override:true  },
  aspect:       { db:"aspect",       override:true  },
  face:         { db:"face",         override:true  },
  gainFt:       { db:"gain_ft",      override:true  },
  lossFt:       { db:"loss_ft",      override:true  },
  distKm:       { db:"dist_km",      override:true  },
  maxAngle:     { db:"max_angle",    override:true  },
  highPointFt:  { db:"high_point_ft",override:true  },
  // prose / structured — gap-fill only (writing here would overwrite hand-authored content)
  overview:     { db:"overview",     override:false },
  beta:         { db:"beta",         override:false },
  approach:     { db:"approach",     override:false },
  descent:      { db:"descent",      override:false },
  descentText:  { db:"descent_text", override:false },
  itinerary:    { db:"itinerary",    override:false },
  bail:         { db:"bail",         override:false },
  turnaround:   { db:"turnaround",   override:false },
  bestSeason:   { db:"best_season",  override:false },
  comms:        { db:"comms",        override:false },
  detailedRack: { db:"detailed_rack",override:false },
  proNeeds:     { db:"pro_needs",    override:false },
  gear:         { db:"gear",         override:false },
  whatToBring:  { db:"what_to_bring",override:false },
  proTips:      { db:"pro_tips",     override:false },
  watchOut:     { db:"watch_out",    override:false },
  knownHazards: { db:"hazards",      override:false },
  pitchDetail:  { db:"pitch_detail", override:false },
  road:         { db:"road",         override:false },
  climate:      { db:"climate",      override:false },
  access:       { db:"access",       override:false },
  timing:       { db:"timing",       override:false },
  waypoints:    { db:"waypoints",    override:false },
  emergency:    { db:"emergency",    override:false },
};

let filledRoutes=0, filledFields=0, blurbs=0, dbErrs=0;
const corrections=[]; const report=[]; const fieldCount={};

async function patch(path, body){ const r=await fetch(url+"/rest/v1/"+path,{method:"PATCH",headers:H,body:JSON.stringify(body)}); return r.status; }

const run = async () => {
 for (const pk of findings) {
   // peak blurb — gap-fill only
   const a = aById[pk.peakId];
   if (a && empty(a.blurb) && pk.blurb && pk.blurb.trim()) { a.blurb=pk.blurb.trim(); await patch("areas?id=eq."+pk.peakId,{blurb:a.blurb}); blurbs++; }
   for (const rf of (pk.routes||[])) {
     const r = rById[rf.routeId]; if (!r) { report.push("  ?? unknown routeId "+rf.routeId); continue; }
     const body = {}; const filled=[];
     for (const [cf, m] of Object.entries(MAP)) {
       const val = rf[cf];
       if (empty(val)) continue;
       const out = m.xform ? m.xform(val) : val;
       const hasExisting = !empty(r[cf]);
       if (hasExisting && !m.override) continue; // prose: skip if already filled
       if (hasExisting && m.override) {
         // factual correction — log old value then overwrite
         const changed = JSON.stringify(r[cf]) !== JSON.stringify(out);
         if (!changed) continue;
         corrections.push("  CORRECTED "+r.name+"."+cf+": "+JSON.stringify(r[cf])+" → "+JSON.stringify(out));
       }
       body[m.db]=out; r[cf]=out; filled.push(cf); filledFields++; fieldCount[cf]=(fieldCount[cf]||0)+1;
       if (cf==="rockGrade"){ const n=(""+val).match(/^5\.(\d+)/); if(n){body.grade_num=+n[1];body.grade_system="yds";} }
     }
     // routeFt -> length_m (db) + routeFt (staged) — factual, always override
     if (!empty(rf.routeFt)) {
       const lm = Math.round(rf.routeFt/3.28084);
       if (empty(r.routeFt) || r.routeFt!==rf.routeFt) {
         if (!empty(r.routeFt)) corrections.push("  CORRECTED "+r.name+".routeFt: "+r.routeFt+" → "+rf.routeFt);
         r.routeFt=rf.routeFt; body.length_m=lm; filled.push("routeFt"); filledFields++; fieldCount.routeFt=(fieldCount.routeFt||0)+1;
       }
     }
     if (Object.keys(body).length){ const st=await patch("routes?id=eq."+r.id,body); filledRoutes++; if(st>=300){dbErrs++; report.push("  !! DB "+st+" "+r.name+": "+filled.join(","));} else report.push("  "+r.name+": +"+filled.join(",")+" ("+st+")"); }
   }
 }
 writeFileSync(RF,JSON.stringify(rj,null,1)); writeFileSync(AF,JSON.stringify(aj,null,1));
 console.log("=== APPLIED (factual=override, prose=gap-fill) ===");
 console.log("peaks with new blurb:",blurbs,"| routes touched:",filledRoutes,"| fields written:",filledFields,"| DB errors:",dbErrs);
 console.log("\n=== fields written (by field) ===");
 Object.entries(fieldCount).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log("  "+k.padEnd(14)+n));
 console.log("\n=== per-route (first 80) ===");
 report.slice(0,80).forEach(l=>console.log(l));
 console.log("\n=== CORRECTIONS applied (old → new) ===");
 corrections.forEach(c=>console.log(c));
};
run();
