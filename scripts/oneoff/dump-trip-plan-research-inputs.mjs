// Dumps research inputs for the 2026-11-11 WA trip-plan wave (owner note: fill the missing data).
// Read-only. Usage: node scripts/oneoff/dump-trip-plan-research-inputs.mjs <census.json> <outdir>
// <census.json> is the --out of measure-trip-plan-gaps.mjs.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const [census, outdir] = process.argv.slice(2);
const key = requireServiceKey();
const list = JSON.parse(fs.readFileSync(census, "utf8"));
const gap = list.filter((x) => x.kind === "structured" && (x.gaps.hours || x.gaps.miles)).map((x) => x.id);
const none = list.filter((x) => x.kind === "none" && x.id.startsWith("wa_") && ["mountaineering", "scrambling", "alpine"].includes(x.discipline)).map((x) => x.id);
const COLS = "id,name,area_id,discipline,grade,pitches,gain_ft,dist_km,high_point_ft,season,approach,descent,bivy,itinerary,waypoints";
const pause = (ms) => new Promise((s) => setTimeout(s, ms));

async function get(q) {
  const r = await fetch(q, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("STOPPED: " + r.status + " - the database is not answering; do not retry fast");
  return r.json();
}
async function read(ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += 50) {
    rows.push(...(await get(SUPABASE_URL + "/rest/v1/routes?select=" + COLS + "&id=in.(" + ids.slice(i, i + 50).map(encodeURIComponent).join(",") + ")")));
    await pause(300);
  }
  const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
  const areas = new Map();
  for (let i = 0; i < areaIds.length; i += 80) {
    for (const a of await get(SUPABASE_URL + "/rest/v1/areas?select=id,name&id=in.(" + areaIds.slice(i, i + 80).map(encodeURIComponent).join(",") + ")")) areas.set(a.id, a.name);
    await pause(300);
  }
  return rows.map((r) => ({ ...r, peak: areas.get(r.area_id) || null, waypoints: (r.waypoints || []).map((w) => ({ name: w.name, type: w.type, elev: w.elev ?? w.elevFt ?? null })) }));
}

fs.mkdirSync(outdir, { recursive: true });
fs.writeFileSync(outdir + "/gap-routes.json", JSON.stringify(await read(gap), null, 1));
fs.writeFileSync(outdir + "/no-plan-routes.json", JSON.stringify(await read(none), null, 1));
fs.writeFileSync(outdir + "/template.json", JSON.stringify((await read(["wa_bonanza_peak_mary_green_glacier"]))[0].itinerary, null, 1));
console.log("gap " + gap.length + ", none " + none.length);
