// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node apply_enrich_merge_waypoints.mjs <findings.json>
// Same override/gap-fill semantics as apply_enrich.mjs for every field EXCEPT waypoints.
// waypoints: MERGE, not gap-fill-if-empty — routes in this batch were selected specifically
// because they have SOME waypoints but are missing a Trailhead and/or Summit (or have none at
// all). A plain gap-fill would skip any route with a non-empty array, leaving the gap unfixed.
// Merge rule: never touch/remove an existing waypoint; only ADD a Trailhead/Summit if that
// single-instance type isn't already present, and add other-typed waypoints only if no existing
// entry has the same name. Never invent coordinates -- a waypoint from research without real
// lat/lng is dropped before merging (the research prompt already enforces this, this is belt-
// and-suspenders).
import { readFileSync, writeFileSync } from "node:fs";
const env = readFileSync("/Users/nathanbarber/dev/Climbing-App/.env.local","utf8");
const url = (env.match(/VITE_SUPABASE_URL=(.+)/)||[])[1].trim().replace(/\/$/,"");
const SK = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error("Need SUPABASE_SERVICE_KEY (the service_role secret) set in the environment."); process.exit(1); }
const H = { apikey:SK, Authorization:"Bearer "+SK, "Content-Type":"application/json" };
const findings = JSON.parse(readFileSync(process.argv[2],"utf8"));
const empty = v => v==null || v==="" || (Array.isArray(v)&&!v.length);
const SINGLE_TYPES = new Set(["Trailhead","Summit"]);

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
  gpx:          { db:"gpx",          override:false },
  emergency:    { db:"emergency",    override:false },
};

function mergeWaypoints(existing, incoming) {
  if (!incoming || !incoming.length) return null;
  const ex = existing || [];
  const clean = incoming.filter(w => w && w.lat!=null && w.lng!=null && w.name);
  if (!clean.length) return null;
  const existingSingleTypes = new Set(ex.filter(w=>w && SINGLE_TYPES.has(w.type)).map(w=>w.type));
  const toAdd = [];
  for (const w of clean) {
    if (SINGLE_TYPES.has(w.type)) {
      if (existingSingleTypes.has(w.type)) continue;
      existingSingleTypes.add(w.type);
      toAdd.push(w);
    } else {
      const dup = ex.some(e => e && e.name && e.name.trim().toLowerCase()===w.name.trim().toLowerCase());
      if (!dup) toAdd.push(w);
    }
  }
  if (!toAdd.length) return null;
  return [...ex, ...toAdd];
}

async function patch(path, body){
  const r=await fetch(url+"/rest/v1/"+path,{method:"PATCH",headers:H,body:JSON.stringify(body)});
  return r.status;
}

let filledRoutes=0, filledFields=0, blurbs=0, dbErrs=0, waypointsMerged=0, trailheadsAdded=0, summitsAdded=0;
const corrections=[]; const report=[]; const fieldCount={}; const hierarchyFlagsList=[];

const run = async () => {
 const peakIds = findings.map(f => f.peakId);
 const routeIds = findings.flatMap(f => (f.routes||[]).map(r => r.routeId));
 console.log("Fetching live current data for", peakIds.length, "areas and", routeIds.length, "routes...");
 const aById = await fetchLive("areas", peakIds);
 const rById = await fetchLive("routes", routeIds);

 for (const pk of findings) {
   const a = aById[pk.peakId];
   if (!a) { report.push("  ?? unknown/unfetched peakId "+pk.peakId); continue; }
   if (!empty(pk.hierarchyNote) && !/^none\b/i.test(pk.hierarchyNote.trim())) {
     hierarchyFlagsList.push({ peakId: pk.peakId, name: a.name, note: pk.hierarchyNote });
   }
   if (empty(a.blurb) && pk.blurb && pk.blurb.trim()) { const newBlurb=pk.blurb.trim(); await patch("areas?id=eq."+pk.peakId,{blurb:newBlurb}); a.blurb=newBlurb; blurbs++; }
   for (const rf of (pk.routes||[])) {
     const r = rById[rf.routeId];
     if (!r) { report.push("  ?? unknown/unfetched routeId "+rf.routeId+" (peak "+pk.peakId+")"); continue; }
     const body = {}; const filled=[];
     for (const [cf, m] of Object.entries(MAP)) {
       const val = rf[cf];
       if (empty(val)) continue;
       const out = m.xform ? m.xform(val) : val;
       const hasExisting = !empty(r[m.db]);
       if (hasExisting && !m.override) continue;
       if (hasExisting && m.override) {
         const changed = JSON.stringify(r[m.db]) !== JSON.stringify(out);
         if (!changed) continue;
         corrections.push("  CORRECTED "+r.name+"."+cf+": "+JSON.stringify(r[m.db])+" -> "+JSON.stringify(out));
       }
       body[m.db]=out; r[m.db]=out; filled.push(cf); filledFields++; fieldCount[cf]=(fieldCount[cf]||0)+1;
       if (cf==="rockGrade"){ const n=(""+val).match(/^5\.(\d+)/); if(n){body.grade_num=+n[1];body.grade_system="yds";} }
     }
     if (!empty(rf.routeFt)) {
       const lm = Math.round(rf.routeFt/3.28084);
       if (empty(r.length_m) || Math.round(r.length_m)!==lm) {
         if (!empty(r.length_m)) corrections.push("  CORRECTED "+r.name+".length_m: "+r.length_m+" -> "+lm);
         r.length_m=lm; body.length_m=lm; filled.push("routeFt"); filledFields++; fieldCount.routeFt=(fieldCount.routeFt||0)+1;
       }
     }
     const mergedWp = mergeWaypoints(r.waypoints, rf.waypoints);
     if (mergedWp) {
       const addedTypes = mergedWp.slice((r.waypoints||[]).length).map(w=>w.type);
       if (addedTypes.includes("Trailhead")) trailheadsAdded++;
       if (addedTypes.includes("Summit")) summitsAdded++;
       body.waypoints = mergedWp; r.waypoints = mergedWp; filled.push("waypoints("+addedTypes.join(",")+")");
       filledFields++; fieldCount.waypoints=(fieldCount.waypoints||0)+1; waypointsMerged++;
     }
     if (Object.keys(body).length){ const st=await patch("routes?id=eq."+r.id,body); filledRoutes++; if(st>=300){dbErrs++; report.push("  !! DB "+st+" "+r.name+": "+filled.join(","));} else report.push("  "+r.name+": +"+filled.join(",")+" ("+st+")"); }
   }
 }
 console.log("=== APPLIED (factual=override, prose=gap-fill, waypoints=additive merge, decisions based on LIVE data fetched just now) ===");
 console.log("peaks with new blurb:",blurbs,"| routes touched:",filledRoutes,"| fields written:",filledFields,"| routes w/ waypoints merged:",waypointsMerged,"| trailheads added:",trailheadsAdded,"| summits added:",summitsAdded,"| DB errors:",dbErrs);
 console.log("\n=== fields written (by field) ===");
 Object.entries(fieldCount).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log("  "+k.padEnd(14)+n));
 console.log("\n=== per-route ===");
 report.forEach(l=>console.log(l));
 console.log("\n=== CORRECTIONS applied (old -> new) ===");
 corrections.forEach(c=>console.log(c));
 console.log("\n=== HIERARCHY FLAGS (not auto-applied -- for manual review) ===");
 hierarchyFlagsList.forEach(f=>console.log("  "+f.peakId+" ("+f.name+"): "+f.note));
 writeFileSync("enrichment-wip/hierarchy_flags_batch1.json", JSON.stringify(hierarchyFlagsList,null,2));
};
run();
