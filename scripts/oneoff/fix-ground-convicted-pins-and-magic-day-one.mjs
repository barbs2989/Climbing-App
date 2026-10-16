// Three pin coordinates the ground (USGS EPQS) convicts, and Magic Mountain's Day 1 distance.
//   - Mount Adams, Adams Glacier: "High Camp Trail Junction" sat at (46.265, -121.535), ground 5,650 ft against its stated
//     6,100. Oregon Hikers publishes this junction (PCT / Killen Creek #113 / High Camp #10): "Latitude, Longitude:
//     46.2510, -121.5327", "Elevation: 6080 feet"; ground there 6,080.7 ft. Coordinate moved; elev kept.
//   - South Twin Sister, West Ridge: "Dihedral in the upper cliff band" sat at ground 5,573 ft against the "cliffy band
//     around 6,500 ft" its own note describes, ~250 m south of the notch-summit line. No published coordinate: cleared.
//   - Pinnacle Mountain (Entiat): "Pyramid Mountain Trail (#1433) junction camp", a creekside clearing stated at 4,900 ft,
//     sat at ground 6,861 ft with a computed-looking decimal tail. No published coordinate: cleared.
//   - Magic Mountain NW Ridge / SW Cirque / West Ridge itineraries: Day 1 to Kool-Aid Lake said "about 8 miles"; the owner
//     set the Cascade Pass -> Cache Col -> Kool-Aid Lake approach to 5.9 mi everywhere (#2166).
//   node scripts/oneoff/fix-ground-convicted-pins-and-magic-day-one.mjs [--apply]
import { writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KEY = APPLY ? requireServiceKey() : anonKey();
const ROLLBACK = new URL("../../audits/waypoint-pins-rest/ground-pins-magic-day-one-rollback.json", import.meta.url);

const PINS = [
  { id: "wa_mount_adams_adams_glacier", area: "wa_mount_adams", i: 1, sig: "Junction|High Camp Trail Junction",
    from: [46.265, -121.535], to: [46.251, -121.5327] },
  { id: "wa_south_twin_sister_west_ridge", area: "wa_south_twin_sister", i: 5, sig: "Hazard|Dihedral in the upper cliff band",
    from: [48.707313, -122.001846], to: [null, null] },
  { id: "wa_pinnacle_mountain_entiat_scramble", area: "wa_pinnacle_mountain_entiat", i: 2, sig: "Campsite|Pyramid Mountain Trail (#1433) junction camp",
    from: [48.090536354545456, -120.64580392727272], to: [null, null] },
];
const MAGIC = ["wa_magic_mountain_northwest_ridge", "wa_magic_mountain_southwest_cirque", "wa_magic_mountain_west_ridge"];
const OLD = "(about 8 miles, ~5 hours)", NEW = "(5.9 miles, ~5 hours)";

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const get = async (id, cols) => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,${cols}&id=eq.${id}`, { headers: headers(KEY) })).json())[0];

const rollback = {}, ops = [];
for (const p of PINS) {
  const row = await get(p.id, "waypoints");
  if (!row || row.area_id !== p.area) throw new Error(`${p.id}: not on ${p.area}`);
  const w = row.waypoints[p.i];
  if (sig(w) !== p.sig) throw new Error(`${p.id}[${p.i}] is ${sig(w)}`);
  if (w.lat === p.to[0] && w.lng === p.to[1]) { console.log(`${p.id}: already applied`); continue; }
  if (w.lat !== p.from[0] || w.lng !== p.from[1]) throw new Error(`${p.id}: coordinate moved to ${w.lat},${w.lng}`);
  const wps = structuredClone(row.waypoints);
  wps[p.i] = { ...wps[p.i], lat: p.to[0], lng: p.to[1] };
  rollback[p.id] = { waypoints: row.waypoints };
  ops.push({ id: p.id, patch: { waypoints: wps }, check: (r) => r.waypoints[p.i].lat === p.to[0] && r.waypoints[p.i].lng === p.to[1] });
  console.log(`${p.id}: ${p.sig} (${p.from}) -> (${p.to})`);
}
for (const id of MAGIC) {
  const row = await get(id, "itinerary");
  if (!row || row.area_id !== "wa_magic_mountain") throw new Error(`${id}: not on wa_magic_mountain`);
  if (typeof row.itinerary !== "string") throw new Error(`${id}: itinerary is not a string`);
  const n = row.itinerary.split(OLD).length - 1;
  if (n === 0 && row.itinerary.includes(NEW)) { console.log(`${id}: already applied`); continue; }
  if (n !== 1) throw new Error(`${id}: "${OLD}" occurs ${n} times`);
  rollback[id] = { itinerary: row.itinerary };
  ops.push({ id, patch: { itinerary: row.itinerary.replace(OLD, NEW) }, check: (r) => r.itinerary.includes(NEW) && !r.itinerary.includes(OLD) });
  console.log(`${id}: itinerary "${OLD}" -> "${NEW}"`);
}
if (!ops.length) { console.log("nothing to do"); process.exit(0); }
if (!APPLY) { console.log(`DRY RUN: ${ops.length} rows`); process.exit(0); }

if (!existsSync(ROLLBACK)) writeFileSync(ROLLBACK, JSON.stringify(rollback, null, 1));
let bad = 0;
for (const o of ops) {
  await patchRow("routes", o.id, o.patch);
  const re = await get(o.id, Object.keys(o.patch).join(","));
  const ok = o.check(re);
  console.log(ok ? `verified ${o.id}` : `MISMATCH on re-read: ${o.id}`);
  if (!ok) bad++;
}
if (bad) process.exit(1);
