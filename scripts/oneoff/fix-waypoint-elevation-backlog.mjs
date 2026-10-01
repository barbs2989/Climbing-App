// The `audit:waypoint-elevations --ground` backlog (2026-10-01): pins whose claimed height lies
// BEYOND what the terrain under their coordinate can explain. The finding convicts the PAIR, not a
// half — so each pin was researched to decide which half is wrong, and every value written is one of
// a published value (source + verbatim quote), a copy from a sibling pin of the same place, or null:
//   setElev   elev -> a published height for the named place, whose coordinate is right.
//   copyElev  elev -> a sibling pin's, when that sibling sits within 0.05 mi of this pin.
//   nullElev  elev -> null: the coordinate is right, the height impossible, and nothing publishes one.
//   copy      lat/lng -> a sibling pin's of the same place, whose ground admits this pin's height.
//   move      lat/lng -> a coordinate a fetched page publishes for that exact feature.
//   clear     lat/lng -> null: the height is right, the coordinate is not, and nothing replaces it.
//             Never a trailhead (the route becomes unmeasurable).
//   setNote   a cleared pin's note that described the coordinate it no longer has loses that clause.
//   none      recorded with its reason; never written.
//
// GATES, per route, against the live row at write time — a refused route is reported and skipped:
//   - every edit's pin matches exactly one live pin by TYPE|NAME and still holds its recorded value;
//   - an edit that leaves a height AND a coordinate on the pin must leave it INSIDE the audit's own
//     margin of the terrain box (max(250 ft, half the relief)) — a repair that is still beyond is
//     not a repair;
//   - no stored distance becomes impossible (the audit:waypoint-distances test, same thresholds);
//   - trackIsJustTheWaypoints gives the same answer before and after; a sketch line's vertex at a
//     moved pin moves with it and at a cleared pin goes with it; a recorded track is never touched.
//
//   node scripts/oneoff/fix-waypoint-elevation-backlog.mjs            # dry run
//   node scripts/oneoff/fix-waypoint-elevation-backlog.mjs --apply    # writes, then re-reads
import { readFileSync, writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";
import { groundBox } from "../lib/ground-box.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const APPLY = process.argv.includes("--apply");
const DIR = new URL("../../audits/waypoint-elevation-backlog/", import.meta.url);
const ROLLBACK = new URL("rollback.json", DIR);
const KEY = APPLY ? requireServiceKey() : anonKey();
const EDITS = JSON.parse(readFileSync(new URL("decisions.json", DIR), "utf8")).filter((e) => e.op !== "none");

// The audit's own box: same slop per type, same margin rule.
const SLOP_M = (t) => (/summit|topout/i.test(String(t || "")) ? 40 : 183);
const inside = (box, h) => { const m = Math.max(250, 0.5 * box.relief); return h >= box.lo - m && h <= box.hi + m; };

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
const donorPin = async (e) => (await get(e.fromRoute))?.waypoints?.find((w) => sig(w) === e.fromPin);

const plans = [], refused = [];
for (const id of [...new Set(EDITS.map((e) => e.route))]) {
  const row = await get(id);
  if (!row || !Array.isArray(row.waypoints)) { refused.push(`${id}: no row`); continue; }
  const before = JSON.stringify(row.waypoints), wp = JSON.parse(before);
  const sketch = Array.isArray(row.gpx) && row.gpx.length <= 40;
  let gpx = Array.isArray(row.gpx) ? row.gpx.map((v) => (Array.isArray(v) ? [...v] : v)) : row.gpx;
  const moveVertex = (lat, lng, to) => {
    if (!sketch || !Array.isArray(gpx)) return;
    const hit = gpx.map((v, i) => (Array.isArray(v) && hav({ lat: v[0], lng: v[1] }, { lat: Number(lat), lng: Number(lng) }) < 0.0031 ? i : -1)).filter((i) => i >= 0);
    if (to) for (const i of hit) gpx[i] = [to.lat, to.lng];
    else gpx = gpx.filter((_, i) => !hit.includes(i));
  };
  let why = null, done = 0;
  const touched = [];
  for (const e of EDITS.filter((x) => x.route === id)) {
    const hits = wp.filter((w) => sig(w) === e.pin);
    if (hits.length !== 1) { why = `${e.pin} matches ${hits.length} pins`; break; }
    const p = hits[0];
    if (e.op === "setElev" || e.op === "copyElev" || e.op === "nullElev") {
      const to = e.op === "nullElev" ? null : Number(e.elev);
      if ((to == null && p.elev == null) || (to != null && Number(p.elev) === to)) continue;
      if (Number(p.elev) !== Number(e.oldElev)) { why = `${e.pin} elev changed since it was decided`; break; }
      if (e.op === "setElev" && (!e.source || !e.quote || !String(e.quote).replace(/,/g, "").includes(String(to)))) { why = `${e.pin} setElev without a source and a quote stating ${to}`; break; }
      if (e.op === "copyElev") {
        const d = await donorPin(e);
        if (!d || Number(d.elev) !== to) { why = `${e.pin} donor gone or its elev changed`; break; }
        if (p.lat == null || d.lat == null || hav(p, d) > 0.05) { why = `${e.pin} is not at the donor's spot`; break; }
      }
      p.elev = to; done++; if (to != null) touched.push(p);
    } else if (e.op === "clear") {
      if (p.lat == null && p.lng == null) continue;
      if (/trailhead/i.test(p.type)) { why = `${e.pin} is a trailhead — never cleared`; break; }
      if (!near(p.lat, e.oldLat) || !near(p.lng, e.oldLng)) { why = `${e.pin} moved since it was decided`; break; }
      moveVertex(p.lat, p.lng, null); p.lat = null; p.lng = null; done++;
    } else if (e.op === "copy" || e.op === "move") {
      if (near(p.lat, e.lat) && near(p.lng, e.lng)) continue;
      if (!near(p.lat, e.oldLat) || !near(p.lng, e.oldLng)) { why = `${e.pin} moved since it was decided`; break; }
      if (e.op === "copy") { const d = await donorPin(e); if (!d || !near(d.lat, e.lat) || !near(d.lng, e.lng)) { why = `${e.pin} donor gone or moved`; break; } }
      if (e.op === "move" && (!e.source || !e.quote)) { why = `${e.pin} move without a source and quote`; break; }
      moveVertex(p.lat, p.lng, { lat: e.lat, lng: e.lng }); p.lat = e.lat; p.lng = e.lng; done++; touched.push(p);
    } else if (e.op === "setNote") {
      if (p.note === e.note) continue;
      if (p.note !== e.oldNote) { why = `${e.pin} note changed since it was decided`; break; }
      p.note = e.note; done++;
    } else { why = `unknown op ${e.op}`; break; }
  }
  if (!why) for (const p of touched) {
    if (p.elev == null || p.lat == null) continue;
    const box = await groundBox(Number(p.lat), Number(p.lng), SLOP_M(p.type));
    if (!box) { why = `${sig(p)}: the ground could not be read, so the repair cannot be checked`; break; }
    if (!inside(box, Number(p.elev))) { why = `${sig(p)}: ${p.elev} ft would still be beyond the box ${Math.round(box.lo)}-${Math.round(box.hi)}`; break; }
  }
  if (why) { refused.push(`${id}: ${why}`); continue; }
  if (!done) { console.log(`  already applied: ${id}`); continue; }
  const b = impossible(JSON.parse(before)), a = impossible(wp), added = [...a].filter((s) => !b.has(s));
  if (added.length) { refused.push(`${id}: would make ${added.join(", ")} impossible`); continue; }
  if (Array.isArray(row.gpx) && trackIsJustTheWaypoints(row.gpx, JSON.parse(before)) !== trackIsJustTheWaypoints(gpx, wp)) { refused.push(`${id}: the sketch-line caption would change`); continue; }
  const gpxChanged = JSON.stringify(gpx) !== JSON.stringify(row.gpx);
  plans.push({ id, before, wp, gpx, origGpx: row.gpx, gpxChanged, done });
  console.log(`  plan ${id}: ${done} edit(s)${gpxChanged ? ", sketch vertex moved" : ""}`);
}
for (const r of refused) console.log(`  REFUSED ${r}`);
if (!APPLY) { console.log(`\nDRY RUN — ${plans.length} route(s) would change. Pass --apply to write.`); process.exit(refused.length ? 1 : 0); }

const rb = existsSync(ROLLBACK) ? JSON.parse(readFileSync(ROLLBACK, "utf8")) : {};
for (const p of plans) if (!(p.id in rb)) rb[p.id] = { waypoints: JSON.parse(p.before), ...(p.gpxChanged ? { gpx: p.origGpx } : {}) };
writeFileSync(ROLLBACK, JSON.stringify(rb, null, 1));
for (const p of plans) await patchRow("routes", p.id, p.gpxChanged ? { waypoints: p.wp, gpx: p.gpx } : { waypoints: p.wp });
let good = 0;
for (const p of plans) if (JSON.stringify((await get(p.id)).waypoints) === JSON.stringify(p.wp)) good++; else console.log(`  MISMATCH on re-read: ${p.id}`);
console.log(`verified: ${good} of ${plans.length} row(s) re-read and match.`);
