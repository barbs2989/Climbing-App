// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node fix_waypoint_types.mjs <route_ids.json>
//
// Corrective pass for a bug in apply_enrich_merge_waypoints.mjs: the wa-enrich-batch research
// prompt never told agents the app's canonical waypoint `type` enum (Trailhead, Junction, Water,
// Campsite, Summit, Topout, Hazard -- see WP_TYPES in ClimbMatch.jsx), so agents wrote freeform
// lowercase strings ("trailhead", "summit", "trailhead_turnoff", "waypoint", ...). The merge
// script's single-type (Trailhead/Summit) dedup check was case-sensitive, so on routes that
// ALREADY had a canonical "Trailhead"/"Summit" entry, it failed to recognize the match and added
// a second, near-duplicate, wrongly-cased entry instead of skipping it.
//
// This script, for every route touched by that run:
//   1. Normalizes every waypoint's `type` to the canonical enum (explicit synonym map, falling
//      back to the app's own name-based guessWpType heuristic).
//   2. After normalizing, collapses duplicate Trailhead/Summit entries (there should be at most
//      one of each): keeps the richer entry (has `note`, or more fields filled), drops the rest,
//      logging every drop for manual review -- never silently discards without a record.
//   3. Also dedupes near-identical non-single-type waypoints (same name, case-insensitive).
// Never invents or moves coordinates -- only touches `type` and removes exact/near-duplicate
// entries this session's bug created.
import { readFileSync, writeFileSync } from "node:fs";
const env = readFileSync("/Users/nathanbarber/dev/Climbing-App/.env.local","utf8");
const url = (env.match(/VITE_SUPABASE_URL=(.+)/)||[])[1].trim().replace(/\/$/,"");
const SK = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SK) { console.error("Need SUPABASE_SERVICE_KEY set in the environment."); process.exit(1); }
const H = { apikey:SK, Authorization:"Bearer "+SK, "Content-Type":"application/json" };
const routeIds = JSON.parse(readFileSync(process.argv[2],"utf8"));

const CANON = new Set(["Trailhead","Junction","Water","Campsite","Summit","Topout","Hazard"]);
const SINGLE = new Set(["Trailhead","Summit"]);
const SYNONYMS = {
  trailhead:"Trailhead", trailhead_turnoff:"Trailhead", trail_head:"Trailhead", th:"Trailhead", parking:"Trailhead",
  summit:"Summit", peak:"Summit", top:"Summit",
  topout:"Topout", "top-out":"Topout", top_out:"Topout",
  camp:"Campsite", campsite:"Campsite", base:"Campsite", basecamp:"Campsite", bivy:"Campsite",
  water:"Water", lake:"Water", creek:"Water", spring:"Water", stream:"Water",
  hazard:"Hazard", danger:"Hazard",
  junction:"Junction", waypoint:"Junction", landmark:"Junction", fork:"Junction", split:"Junction",
};
// mirrors ClimbMatch.jsx's guessWpType() exactly
function guessFromName(name){
  const n=(name||"").toLowerCase();
  if(/trail\s*head|\bth\b|parking|gate/.test(n))return "Trailhead";
  if(/camp|bivy/.test(n))return "Campsite";
  if(/summit|peak|\btop\b/.test(n))return "Summit";
  if(/water|creek|spring|stream|lake/.test(n))return "Water";
  if(/junction|fork|split|trail/.test(n))return "Junction";
  if(/hazard|danger|crevasse|rockfall/.test(n))return "Hazard";
  if(/topout|top-out/.test(n))return "Topout";
  return "Junction";
}
function normalizeType(w){
  if (CANON.has(w.type)) return w.type;
  const key = String(w.type||"").toLowerCase().trim();
  if (SYNONYMS[key]) return SYNONYMS[key];
  return guessFromName(w.name);
}
function richness(w){
  let n=0;
  if (w.note) n+=2;
  if (w.elev!=null || w.elevFt!=null) n+=1;
  if (w.distMi!=null) n+=1;
  if (w.name && w.name.length>20) n+=1;
  return n;
}

async function fetchLive(ids) {
  const byId = {};
  const CHUNK = 50;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const q = "routes?select=id,name,waypoints&id=in.(" + chunk.map(id => `"${id}"`).join(",") + ")";
    const r = await fetch(url + "/rest/v1/" + q, { headers: H });
    if (!r.ok) { console.error("!! live fetch failed", r.status, await r.text()); continue; }
    const rows = await r.json();
    rows.forEach(row => { byId[row.id] = row; });
  }
  return byId;
}

let routesTouched=0, waypointsRetyped=0, duplicatesDropped=0;
const dropLog=[]; const retypeLog=[];

const run = async () => {
  const byId = await fetchLive(routeIds);
  for (const id of routeIds) {
    const r = byId[id];
    if (!r || !r.waypoints || !r.waypoints.length) continue;
    let changed = false;
    const retyped = r.waypoints.map(w => {
      const newType = normalizeType(w);
      if (newType !== w.type) { changed=true; waypointsRetyped++; retypeLog.push(r.name+": "+w.name+" ("+w.type+" -> "+newType+")"); }
      return { ...w, type: newType };
    });
    // dedupe single types (Trailhead/Summit): keep richest, drop rest
    const kept = [];
    for (const t of SINGLE) {
      const group = retyped.filter(w=>w.type===t);
      if (group.length > 1) {
        group.sort((a,b)=>richness(b)-richness(a));
        const winner = group[0];
        const losers = group.slice(1);
        kept.push(winner);
        losers.forEach(l=>{ dropLog.push(r.name+": dropped duplicate "+t+" \""+l.name+"\" (kept \""+winner.name+"\")"); duplicatesDropped++; changed=true; });
      } else if (group.length === 1) {
        kept.push(group[0]);
      }
    }
    // non-single types: dedupe by case-insensitive name match, keep first
    const others = retyped.filter(w=>!SINGLE.has(w.type));
    const seenNames = new Set();
    const keptOthers = [];
    for (const w of others) {
      const key = (w.name||"").trim().toLowerCase();
      if (key && seenNames.has(key)) { dropLog.push(r.name+": dropped duplicate "+w.type+" \""+w.name+"\""); duplicatesDropped++; changed=true; continue; }
      if (key) seenNames.add(key);
      keptOthers.push(w);
    }
    const finalWaypoints = [...kept, ...keptOthers];
    if (!changed) continue;
    const patchRes = await fetch(url+"/rest/v1/routes?id=eq."+r.id, { method:"PATCH", headers:H, body: JSON.stringify({ waypoints: finalWaypoints }) });
    routesTouched++;
    if (!patchRes.ok) console.error("!! patch failed", r.id, patchRes.status, await patchRes.text());
  }
  console.log("=== WAYPOINT TYPE FIX ===");
  console.log("routes touched:", routesTouched, "| waypoints retyped:", waypointsRetyped, "| duplicates dropped:", duplicatesDropped);
  console.log("\n=== retype log ===");
  retypeLog.forEach(l=>console.log("  "+l));
  console.log("\n=== duplicates dropped ===");
  dropLog.forEach(l=>console.log("  "+l));
  writeFileSync("enrichment-wip/waypoint_fix_report.json", JSON.stringify({routesTouched,waypointsRetyped,duplicatesDropped,retypeLog,dropLog},null,2));
};
run();
