// Two leftovers the multi-approach contradiction fixes noted and did not touch:
//  - Kyes Peak Northeast Ridge now starts at the North Fork Skykomish trailhead (Quartz Creek trail),
//    which is on the Skykomish Ranger District, but access.landManager still named Darrington's.
//  - Huckleberry Mountain West Route's "West Face Talus Basin" waypoint sat at a round coordinate
//    (47.43, -121.355) about 5 km SOUTH of the summit, while its own note puts it northeast of Joe
//    Lake under the west face. No page states its coordinate, so the pin comes off and the point
//    stays in the list as one with no coordinate on file (wpPlaced), rather than a wrong dot.
//
//   node scripts/oneoff/multi-approach-leftovers.mjs [--write | --rollback]
import fs from "node:fs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const BEFORE = new URL("./multi-approach-leftovers.before.json", import.meta.url);
const canon = (x) => Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x;
const read = async () => selectAll("routes", "id,access,waypoints", "id=in.(wa_kyes_peak_northeast_ridge,wa_huckleberry_mountain_west_route)", { key });
if (process.argv.includes("--rollback")) {
  for (const [id, v] of Object.entries(JSON.parse(fs.readFileSync(BEFORE, "utf8")))) await patchRow("routes", id, v);
  console.log("rolled back"); process.exit(0);
}
const rows = await read();
const kyes = rows.find((r) => r.id === "wa_kyes_peak_northeast_ridge"), huck = rows.find((r) => r.id === "wa_huckleberry_mountain_west_route");
const problems = [], next = {}, before = {};

const lm = kyes?.access?.landManager || "";
if (!/Darrington Ranger District/.test(lm)) problems.push(`kyes: landManager no longer names Darrington: "${lm}"`);
else { next[kyes.id] = { access: { ...kyes.access, landManager: lm.replace("Darrington Ranger District", "Skykomish Ranger District") } }; before[kyes.id] = { access: kyes.access }; }

const wps = Array.isArray(huck?.waypoints) ? huck.waypoints : [];
const i = wps.findIndex((w) => w && w.name === "West Face Talus Basin" && +w.lat === 47.43 && +w.lng === -121.355);
if (i < 0) problems.push("huckleberry: the West Face Talus Basin pin is not at 47.43,-121.355 any more");
else { const w = wps.map((x) => ({ ...x })); w[i].lat = null; w[i].lng = null; next[huck.id] = { waypoints: w }; before[huck.id] = { waypoints: huck.waypoints }; }

for (const [id, p] of Object.entries(next)) console.log(id, JSON.stringify(p).slice(0, 300));
if (problems.length) { console.log("PROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
if (!process.argv.includes("--write")) { console.log("dry run — pass --write"); process.exit(0); }
if (!fs.existsSync(BEFORE)) fs.writeFileSync(BEFORE, JSON.stringify(before, null, 1));
for (const [id, p] of Object.entries(next)) await patchRow("routes", id, p);
const after = await read();
let bad = 0;
for (const [id, p] of Object.entries(next)) for (const k of Object.keys(p)) if (JSON.stringify(canon(after.find((r) => r.id === id)[k])) !== JSON.stringify(canon(p[k]))) { bad++; console.log("RE-READ MISMATCH", id, k); }
console.log(`written ${Object.keys(next).length}, re-read mismatches ${bad}`);
process.exit(bad ? 1 : 0);
