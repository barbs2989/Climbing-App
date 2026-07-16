// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node apply_enrich_thin.mjs <findings.json>
// Variant of apply_enrich.mjs for the "thin approach text" re-research pass:
// same factual-override / prose-gap-fill policy as apply_enrich.mjs, EXCEPT
// `approach` is upgraded to a length-aware override — new research replaces the
// live approach text only when the live text is empty OR the new text is
// meaningfully more complete (>100 chars longer), so a genuinely thin/incomplete
// "Getting There" gets replaced but an already-solid one is never clobbered.
// The service_role key is a SECRET (Supabase Dashboard > Project Settings > API > service_role).
// It bypasses RLS — never hardcode it in this file; pass it via env only.
import { readFileSync, writeFileSync } from "node:fs";
const env = readFileSync("/Users/nathanbarber/dev/Climbing-App/.env.local","utf8");
const url = (env.match(/VITE_SUPABASE_URL=(.+)/)||[])[1].trim().replace(/\/$/,"");
const SK = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error("Need SUPABASE_SERVICE_KEY (the service_role secret) set in the environment."); process.exit(1); }
const H = { apikey:SK, Authorization:"Bearer "+SK, "Content-Type":"application/json" };
const RF = "/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/routes.json";
const AF = "/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/areas.json";
const findings = JSON.parse(readFileSync(process.argv[2],"utf8"));
const empty = v => v==null || v==="" || (Array.isArray(v)&&!v.length);

async function fetchLive(table, ids) {
  const byId = {};
  const CHUNK = 50;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const q = table + "?select=*&id=in.(" + chunk.map(id => `"${id}"`).join(",") + ")";
    const r = await fetch(url + "/rest/v1/" + q, { headers: H });
    if (!r.ok) { console.error("!! live fetch failed", table, r.status, await r.text()); continue; }
    const rows = await r.json();
    rows.forEach(row => { byId[row.id] = row; });
  }
  return byId;
}

// MAP: camelField -> { db, xform, override, lengthAware }
// override:true  = always apply (research beats existing data — factual/verifiable fields)
// override:false = gap-fill only (only write if current value is empty — prose fields)
// lengthAware:true = override only if new text is empty-replacing or meaningfully longer
const MAP = {
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
  // "Getting There" — the specific field this pass exists to fix
  approach:     { db:"approach",     override:true, lengthAware:true },
  // prose / structured — gap-fill only (writing here would overwrite hand-authored content)
  overview:     { db:"overview",     override:false },
  beta:         { db:"beta",         override:false },
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
  gpx:          { db:"gpx",          override:false },
  emergency:    { db:"emergency",    override:false },
};

let filledRoutes=0, filledFields=0, blurbs=0, dbErrs=0;
const corrections=[]; const report=[]; const fieldCount={};

async function patch(path, body){
  const r=await fetch(url+"/rest/v1/"+path,{method:"PATCH",headers:H,body:JSON.stringify(body)});
  return r.status;
}

const run = async () => {
 const peakIds = findings.map(f => f.peakId);
 const routeIds = findings.flatMap(f => (f.routes||[]).map(r => r.routeId));
 console.log("Fetching live current data for", peakIds.length, "areas and", routeIds.length, "routes...");
 const aById = await fetchLive("areas", peakIds);
 const rById = await fetchLive("routes", routeIds);

 for (const pk of findings) {
   const a = aById[pk.peakId];
   if (!a) { report.push("  ?? unknown/unfetched peakId "+pk.peakId); continue; }
   if (empty(a.blurb) && pk.blurb && pk.blurb.trim()) { const newBlurb=pk.blurb.trim(); await patch("areas?id=eq."+pk.peakId,{blurb:newBlurb}); a.blurb=newBlurb; blurbs++; }
   for (const rf of (pk.routes||[])) {
     const r = rById[rf.routeId]; if (!r) { report.push("  ?? unknown/unfetched routeId "+rf.routeId); continue; }
     const body = {}; const filled=[];
     for (const [cf, m] of Object.entries(MAP)) {
       const val = rf[cf];
       if (empty(val)) continue;
       const out = m.xform ? m.xform(val) : val;
       const existing = r[m.db];
       const hasExisting = !empty(existing);
       if (m.lengthAware) {
         if (hasExisting) {
           const oldLen = String(existing).length, newLen = String(out).length;
           if (newLen <= oldLen + 100) continue; // not a meaningful improvement — keep live text
           corrections.push("  EXPANDED "+r.name+"."+cf+": "+oldLen+" chars -> "+newLen+" chars");
         }
       } else {
         if (hasExisting && !m.override) continue; // prose: skip if already filled (live check)
         if (hasExisting && m.override) {
           const changed = JSON.stringify(existing) !== JSON.stringify(out);
           if (!changed) continue;
           corrections.push("  CORRECTED "+r.name+"."+cf+": "+JSON.stringify(existing)+" → "+JSON.stringify(out));
         }
       }
       body[m.db]=out; r[m.db]=out; filled.push(cf); filledFields++; fieldCount[cf]=(fieldCount[cf]||0)+1;
       if (cf==="rockGrade"){ const n=(""+val).match(/^5\.(\d+)/); if(n){body.grade_num=+n[1];body.grade_system="yds";} }
     }
     if (!empty(rf.routeFt)) {
       const lm = Math.round(rf.routeFt/3.28084);
       if (empty(r.length_m) || Math.round(r.length_m)!==lm) {
         if (!empty(r.length_m)) corrections.push("  CORRECTED "+r.name+".length_m: "+r.length_m+" → "+lm);
         r.length_m=lm; body.length_m=lm; filled.push("routeFt"); filledFields++; fieldCount.routeFt=(fieldCount.routeFt||0)+1;
       }
     }
     if (Object.keys(body).length){ const st=await patch("routes?id=eq."+r.id,body); filledRoutes++; if(st>=300){dbErrs++; report.push("  !! DB "+st+" "+r.name+": "+filled.join(","));} else report.push("  "+r.name+": +"+filled.join(",")+" ("+st+")"); }
   }
 }
 writeFileSync(RF, JSON.stringify({ routes: Object.values(rById) }, null, 1));
 writeFileSync(AF, JSON.stringify({ areas: Object.values(aById) }, null, 1));
 console.log("=== APPLIED (factual=override, approach=length-aware override, other prose=gap-fill) ===");
 console.log("peaks with new blurb:",blurbs,"| routes touched:",filledRoutes,"| fields written:",filledFields,"| DB errors:",dbErrs);
 console.log("\n=== fields written (by field) ===");
 Object.entries(fieldCount).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log("  "+k.padEnd(14)+n));
 console.log("\n=== per-route (first 100) ===");
 report.slice(0,100).forEach(l=>console.log(l));
 console.log("\n=== CORRECTIONS / EXPANSIONS applied (old → new) ===");
 corrections.forEach(c=>console.log(c));
};
run();
