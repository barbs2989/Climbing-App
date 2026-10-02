// Leftovers of the audit:waypoint-distances backlog (2026-10-01, after #2096 and #2104): pins whose
// coordinate or height is wrong although no stored distance is impossible, so the distance script's
// gates (which demand a contradiction be removed) cannot carry them.
//
// Every value written is COPIED from a sibling route's pin of the same place, never computed:
//   copy      lat/lng replaced by the donor pin's; refused unless the donor still holds it.
//   copyElev  elev replaced by the donor pin's; refused unless the donor still holds it AND sits
//             within 0.05 mi of where this pin will be, so the height is of the same spot.
//
// GATES, per route, against the live row at write time — a refused route is reported and skipped:
//   - every edit's pin matches exactly one live pin by TYPE|NAME and still holds its recorded value;
//   - no stored distance becomes impossible (the audit:waypoint-distances test, same thresholds);
//   - trackIsJustTheWaypoints gives the same answer before and after; a sketch line's vertex at a
//     copied pin moves with it, and a recorded track is never touched.
//
//   node scripts/oneoff/fix-waypoint-sibling-pins.mjs            # dry run
//   node scripts/oneoff/fix-waypoint-sibling-pins.mjs --apply    # writes, then re-reads
import { readFileSync, writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const APPLY = process.argv.includes("--apply");
const DIR = new URL("../../audits/waypoint-sibling-pins/", import.meta.url);
const ROLLBACK = new URL("rollback.json", DIR);
const KEY = APPLY ? requireServiceKey() : anonKey();
const EDITS = JSON.parse(readFileSync(new URL("decisions.json", DIR), "utf8")).filter((e) => e.op !== "none");

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const near = (a, b) => a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-7;
const hav = (a, b) => { const R = 3958.7613, r = Math.PI / 180; const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(s))); };
const dp = (n) => { const s = String(n); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
const ok = (w) => w && w.lat != null && w.lng != null && Math.min(dp(w.lat), dp(w.lng)) >= 4;
// The audit:waypoint-distances test: from the trailhead, and from the previous measured pin.
function impossible(w) {
  const d = w.map((x) => (x && x.distMi != null ? Number(x.distMi) : null)), bad = new Set();
  if (!ok(w[0]) || d[0] !== 0) return bad;
  for (let i = 1; i < w.length; i++) {
    if (!Number.isFinite(d[i]) || d[i] === 0 || !ok(w[i])) continue;
    const fromTh = hav(w[0], w[i]) - d[i];
    let leg = -Infinity, j0 = -1;
    for (let j = i - 1; j >= 0; j--) { if (!Number.isFinite(d[j]) || (j > 0 && d[j] === 0) || !ok(w[j])) continue; leg = hav(w[j], w[i]) - (d[i] - d[j]); j0 = j; break; }
    const useLeg = leg > fromTh, short = useLeg ? leg : fromTh, stored = useLeg ? d[i] - d[j0] : d[i];
    if (short > 0.25 && short > Math.max(stored, 0) * 0.1) bad.add(sig(w[i]));
  }
  return bad;
}
const get = async (id) => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,gpx&id=eq.${encodeURIComponent(id)}`, { headers: headers(KEY) })).json())[0];

const plans = [], refused = [];
for (const id of [...new Set(EDITS.map((e) => e.route))]) {
  const row = await get(id);
  if (!row || !Array.isArray(row.waypoints)) { refused.push(`${id}: no row`); continue; }
  const before = JSON.stringify(row.waypoints), wp = JSON.parse(before);
  const gpx = Array.isArray(row.gpx) ? JSON.parse(JSON.stringify(row.gpx)) : row.gpx;
  const sketch = Array.isArray(gpx) && trackIsJustTheWaypoints(gpx, JSON.parse(before));
  let why = null, done = 0;
  for (const e of EDITS.filter((x) => x.route === id)) {
    const hits = wp.filter((w) => sig(w) === e.pin);
    if (hits.length !== 1) { why = `${e.pin} matches ${hits.length} pins`; break; }
    const p = hits[0];
    const donor = (await get(e.fromRoute))?.waypoints?.find((w) => sig(w) === e.fromPin);
    if (!donor) { why = `${e.pin} donor ${e.fromRoute} ${e.fromPin} is gone`; break; }
    if (e.op === "copy") {
      if (near(p.lat, e.lat) && near(p.lng, e.lng)) continue;
      if (!near(donor.lat, e.lat) || !near(donor.lng, e.lng)) { why = `${e.pin} donor moved`; break; }
      if (!near(p.lat, e.oldLat) || !near(p.lng, e.oldLng)) { why = `${e.pin} moved since it was decided`; break; }
      if (sketch) for (const v of gpx) if (near(v[0], p.lat) && near(v[1], p.lng)) { v[0] = e.lat; v[1] = e.lng; }
      p.lat = e.lat; p.lng = e.lng; done++;
    } else if (e.op === "copyElev") {
      if (Number(p.elev) === Number(e.elev)) continue;
      if (Number(donor.elev) !== Number(e.elev)) { why = `${e.pin} donor elev changed`; break; }
      if (Number(p.elev) !== Number(e.oldElev)) { why = `${e.pin} elev changed since it was decided`; break; }
      if (p.lat == null || hav(p, donor) > 0.05) { why = `${e.pin} is not at the donor's spot`; break; }
      p.elev = e.elev; done++;
    } else { why = `unknown op ${e.op}`; break; }
  }
  if (why) { refused.push(`${id}: ${why}`); continue; }
  if (!done) { console.log(`  already applied: ${id}`); continue; }
  const b = impossible(JSON.parse(before)), a = impossible(wp), added = [...a].filter((s) => !b.has(s));
  if (added.length) { refused.push(`${id}: would make ${added.join(", ")} impossible`); continue; }
  if (Array.isArray(gpx) && trackIsJustTheWaypoints(gpx, wp) !== sketch) { refused.push(`${id}: track caption would change`); continue; }
  plans.push({ id, before, wp, gpx, origGpx: row.gpx, gpxChanged: JSON.stringify(gpx) !== JSON.stringify(row.gpx), done });
  console.log(`  plan ${id}: ${done} edit(s)${JSON.stringify(gpx) !== JSON.stringify(row.gpx) ? ", sketch vertex moved" : ""}`);
}
for (const r of refused) console.log(`  REFUSED ${r}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(refused.length ? 1 : 0); }

const rb = existsSync(ROLLBACK) ? JSON.parse(readFileSync(ROLLBACK, "utf8")) : {};
for (const p of plans) if (!(p.id in rb)) rb[p.id] = { waypoints: JSON.parse(p.before), ...(p.gpxChanged ? { gpx: p.origGpx } : {}) };
writeFileSync(ROLLBACK, JSON.stringify(rb, null, 1));
for (const p of plans) await patchRow("routes", p.id, p.gpxChanged ? { waypoints: p.wp, gpx: p.gpx } : { waypoints: p.wp });
let good = 0;
for (const p of plans) if (JSON.stringify((await get(p.id)).waypoints) === JSON.stringify(p.wp)) good++; else console.log(`  MISMATCH on re-read: ${p.id}`);
console.log(`verified: ${good} of ${plans.length} row(s) re-read and match.`);
