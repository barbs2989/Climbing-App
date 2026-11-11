// Dumps route rows (with their peak/area name and area type) for a trip-plan research or conversion
// batch. Read-only; ids by id=in.(…) in chunks of 50, as docs/codebase/supabase-scripts.md asks.
// Usage: node scripts/oneoff/dump-routes-for-trip-plan.mjs <ids.json> <out.json>
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const [idsFile, outFile] = process.argv.slice(2);
const ids = JSON.parse(fs.readFileSync(idsFile, "utf8"));
const key = requireServiceKey();
const COLS = "id,name,area_id,discipline,grade,pitches,gain_ft,dist_km,high_point_ft,season,approach,descent,bivy,itinerary,waypoints";
const pause = (ms) => new Promise((s) => setTimeout(s, ms));
async function get(q) {
  const r = await fetch(q, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("STOPPED: " + r.status + " - the database is not answering; do not retry fast");
  return r.json();
}
const rows = [];
for (let i = 0; i < ids.length; i += 50) {
  rows.push(...(await get(SUPABASE_URL + "/rest/v1/routes?select=" + COLS + "&id=in.(" + ids.slice(i, i + 50).map(encodeURIComponent).join(",") + ")")));
  await pause(300);
}
const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areas = new Map();
for (let i = 0; i < areaIds.length; i += 80) {
  for (const a of await get(SUPABASE_URL + "/rest/v1/areas?select=id,name,area_type&id=in.(" + areaIds.slice(i, i + 80).map(encodeURIComponent).join(",") + ")")) areas.set(a.id, a);
  await pause(300);
}
const out = rows.map((r) => ({ ...r, peak: areas.get(r.area_id)?.name ?? null, area_type: areas.get(r.area_id)?.area_type ?? null, waypoints: (r.waypoints || []).map((w) => ({ name: w.name, type: w.type, elev: w.elev ?? w.elevFt ?? null })) }));
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log("wrote " + out.length + " of " + ids.length);
