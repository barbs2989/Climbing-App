// Work the audit:waypoint-distances backlog (2026-10-01): 177 pins on 103 WA routes stored a trail
// distance shorter than the straight line between their own two coordinates.
//
// The audit is right that WHICH record is wrong is not decidable from the contradiction alone. So
// every edit here names the second record that decides it, and nothing writes a number somebody had
// to supply:
//   clear     lat/lng -> null. Only on TWO records: the USGS ground (the box verdict of
//             audit:waypoint-elevations --ground — see the rough-terrain note below) AND the geometry
//             (the pin is an endpoint of an impossible distance). A pin in the wrong place, a wrong
//             elevation and a wrong distance are three single defects; only the coordinate explains
//             both contradictions at once. The same op #2075 used. Also by research (`source`).
//   copy      lat/lng replaced by the SAME place as another route pins it, refused unless that
//             sibling pin is still where it was recorded. Name, elev and distMi stay.
//   setDist   distMi replaced by a PUBLISHED trail distance from this route's own trailhead; the
//             decision carries the url and the verbatim quote.
//   move      lat/lng replaced by a coordinate a fetched page PUBLISHES (second pass, for a wrong
//             trailhead no sibling pins right); carries `source` and the verbatim `quote`.
//   nullDist  distMi -> null, where research showed this value is the wrong one and no source gives
//             a replacement. The screen already printed "—" for it (check:impossible-leg).
//
// ROUGH TERRAIN. The box verdict refuses to attribute anything where the 9-point box spans 800 ft or
// more ("not described by 9 points"). That is right for a 600 ft disagreement and absurd for a pin
// claiming 7,400 ft on a valley floor reading 1,600: no extreme the grid missed inside one 183 m box
// explains a claim sitting further outside the box than the box's whole range. So in rough terrain a
// gap also counts when it is >= max(1000 ft, the box's relief). Found on wa_himmelhorn_southeast_route,
// whose five Crescent Basin pins sit on the Goodell Creek valley floor.
//
// GATES, per route, against the live row at write time — a refused route is reported and skipped:
//   - every edit's pin matches exactly one live pin by TYPE|NAME, and still holds the recorded value;
//   - after the edits the list stays measurable and in order, and the impossible pins are a STRICT
//     SUBSET of those before: an edit may only remove contradictions, never move one;
//   - a sketch line (<= 40 vertices, drawn through the pins) loses or moves the vertex at a cleared or
//     copied coordinate, and trackIsJustTheWaypoints gives the same answer before and after, so no
//     route silently stops saying its line is not a recorded track (audit:stranded-track-vertices).
//
//   node scripts/oneoff/fix-waypoint-distance-backlog.mjs            # dry run
//   node scripts/oneoff/fix-waypoint-distance-backlog.mjs --apply    # writes, then re-reads
import { readFileSync, writeFileSync, existsSync } from "fs";
import { SUPABASE_URL, headers, requireServiceKey, anonKey, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const APPLY = process.argv.includes("--apply");
const DIR = new URL("../../audits/waypoint-distance-backlog/", import.meta.url);
const DECISIONS = new URL("decisions.json", DIR);
const ROLLBACK = new URL("rollback.json", DIR);
const KEY = APPLY ? requireServiceKey() : anonKey();
const EDITS = JSON.parse(readFileSync(DECISIONS, "utf8")).filter((e) => e.op !== "unresolved");

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const near = (a, b) => a != null && b != null && Math.abs(Number(a) - Number(b)) < 1e-7;

// --- the detector, as scripts/audit-waypoint-distances.mjs states it (same thresholds) ---
const hav = (a, b) => { const R = 3958.7613, r = Math.PI / 180; const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(s))); };
const dp = (n) => { const s = String(n); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
const pt = (w) => { const lat = Number(w && w.lat), lng = Number(w && w.lng);
  if (w == null || w.lat == null || w.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return Math.min(dp(lat), dp(lng)) < 4 ? { lat, lng, coarse: true } : { lat, lng }; };
function impossible(w) {
  const p = w.map(pt), d = w.map((x) => (x && x.distMi != null ? Number(x.distMi) : null));
  if (!p[0] || p[0].coarse || d[0] !== 0) return { skip: "origin" };
  for (let i = 1; i < d.length; i++) { if (!Number.isFinite(d[i])) continue; const prev = d.slice(0, i).filter(Number.isFinite).pop(); if (prev != null && d[i] < prev) return { skip: "order" }; }
  const bad = new Set();
  for (let i = 1; i < w.length; i++) {
    if (!Number.isFinite(d[i]) || d[i] === 0 || !p[i] || p[i].coarse) continue;
    const fromTh = hav(p[0], p[i]) - d[i];
    let leg = -Infinity;
    for (let j = i - 1; j >= 0; j--) { if (!Number.isFinite(d[j]) || (j > 0 && d[j] === 0) || !p[j] || p[j].coarse) continue; leg = hav(p[j], p[i]) - (d[i] - d[j]); break; }
    const useLeg = leg > fromTh, short = useLeg ? leg : fromTh;
    if (short > 0.25 && short > Math.max(useLeg ? 0 : d[i], 0) * 0.1) bad.add(sig(w[i]));
  }
  return { bad };
}

const routeIds = [...new Set(EDITS.map((e) => e.route))];
const donorIds = [...new Set(EDITS.filter((e) => e.op === "copy").map((e) => e.fromRoute))];
async function read(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 40) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,gpx&id=in.(${ids.slice(i, i + 40).join(",")})`, { headers: headers(KEY) });
    if (!r.ok) throw new Error(`read -> ${r.status}`);
    out.push(...await r.json());
  }
  return new Map(out.map((r) => [r.id, r]));
}
const live = await read([...new Set([...routeIds, ...donorIds])]);

const plan = [], refused = [], done = [];
for (const id of routeIds) {
  const row = live.get(id);
  if (!row) { refused.push(`${id}: not found`); continue; }
  const w = row.waypoints.map((x) => ({ ...x }));
  const sketch = Array.isArray(row.gpx) && row.gpx.length <= 40;
  let gpx = Array.isArray(row.gpx) ? row.gpx.map((v) => (Array.isArray(v) ? [...v] : v)) : row.gpx;
  const moveVertex = (lat, lng, to) => {
    if (!sketch || !Array.isArray(gpx)) return;
    const hit = gpx.map((v, i) => (Array.isArray(v) && hav({ lat: v[0], lng: v[1] }, { lat: Number(lat), lng: Number(lng) }) < 0.0031 ? i : -1)).filter((i) => i >= 0);
    if (to) for (const i of hit) gpx[i] = [to.lat, to.lng];
    else gpx = gpx.filter((_, i) => !hit.includes(i));
  };
  let why = null, changed = 0;
  for (const e of EDITS.filter((x) => x.route === id)) {
    const hits = w.filter((p) => sig(p) === e.pin);
    if (hits.length !== 1) { why = `${hits.length} live pin(s) match ${e.pin}`; break; }
    const p = hits[0];
    // RE-RUNNABLE: the decisions file grows (mechanical clears first, research after), so an edit
    // that is already in place is a no-op rather than a "moved since decided" refusal.
    if (e.op === "clear" && p.lat == null && p.lng == null) continue;
    if ((e.op === "copy" || e.op === "move") && near(p.lat, e.lat) && near(p.lng, e.lng)) continue;
    if (e.op === "setDist" && Number(p.distMi) === Number(e.to)) continue;
    if (e.op === "nullDist" && p.distMi == null) continue;
    changed++;
    if (e.op === "clear") {
      if (!near(p.lat, e.lat) || !near(p.lng, e.lng)) { why = `${e.pin} moved since it was decided`; break; }
      moveVertex(p.lat, p.lng, null); p.lat = null; p.lng = null;
    } else if (e.op === "copy") {
      const donor = live.get(e.fromRoute);
      const src = donor && donor.waypoints.filter((x) => sig(x) === e.fromPin);
      if (!src || src.length !== 1 || !near(src[0].lat, e.lat) || !near(src[0].lng, e.lng)) { why = `donor ${e.fromRoute} ${e.fromPin} not as recorded`; break; }
      if (!near(p.lat, e.oldLat) || !near(p.lng, e.oldLng)) { why = `${e.pin} moved since it was decided`; break; }
      moveVertex(p.lat, p.lng, { lat: src[0].lat, lng: src[0].lng }); p.lat = src[0].lat; p.lng = src[0].lng;
    } else if (e.op === "move") {
      // A PUBLISHED coordinate (e.source, quoted in e.quote), never a computed one.
      if (!e.source || !e.quote) { why = `${e.pin} move without a source and quote`; break; }
      if (!near(p.lat, e.oldLat) || !near(p.lng, e.oldLng)) { why = `${e.pin} moved since it was decided`; break; }
      moveVertex(p.lat, p.lng, { lat: e.lat, lng: e.lng }); p.lat = e.lat; p.lng = e.lng;
    } else if (e.op === "setDist" || e.op === "nullDist") {
      if (Number(p.distMi) !== Number(e.from)) { why = `${e.pin} distMi is ${p.distMi}, decided against ${e.from}`; break; }
      p.distMi = e.op === "setDist" ? e.to : null;
    } else { why = `unknown op ${e.op}`; break; }
  }
  if (why) { refused.push(`${id}: ${why}`); continue; }
  if (!changed) { done.push(id); continue; }
  const before = impossible(row.waypoints), after = impossible(w);
  if (before.skip) { refused.push(`${id}: not measurable before (${before.skip})`); continue; }
  if (after.skip) { refused.push(`${id}: the edits make it unmeasurable (${after.skip})`); continue; }
  // A CLEAR CANNOT CREATE A CONTRADICTION, ONLY RE-ATTRIBUTE ONE. Removing a pin makes the leg
  // across it the direct chord between its neighbours, and by the triangle inequality that chord can
  // only exceed the stored distance if one of the two legs through the removed pin already did. So
  // the flag that appears is the one that was there, now pinned on the right pair — first seen as
  // three refusals on this script's dry run (Fury East's Luna Pass, Mount Tom, Mutchler). A route
  // whose edits are only clears must not GROW its count; a distance edit can genuinely create a
  // contradiction, so anything else must remove one and add none.
  const clearsOnly = EDITS.filter((x) => x.route === id).every((x) => x.op === "clear");
  const added = [...after.bad].filter((s) => !before.bad.has(s));
  if (clearsOnly) {
    if (after.bad.size > before.bad.size) { refused.push(`${id}: clears would grow the count ${before.bad.size} -> ${after.bad.size}`); continue; }
  } else {
    if (added.length) { refused.push(`${id}: would CREATE a contradiction at ${added.join(", ")}`); continue; }
    if (after.bad.size >= before.bad.size) { refused.push(`${id}: removes no contradiction`); continue; }
  }
  if (trackIsJustTheWaypoints(row.gpx, row.waypoints) !== trackIsJustTheWaypoints(gpx, w)) { refused.push(`${id}: the sketch-line caption would change`); continue; }
  const patch = { waypoints: w };
  if (JSON.stringify(gpx) !== JSON.stringify(row.gpx)) patch.gpx = gpx;
  plan.push({ id, patch, before: { waypoints: row.waypoints, gpx: row.gpx }, was: before.bad.size, now: after.bad.size, left: [...after.bad] });
}

const sum = (k) => plan.reduce((s, p) => s + p[k], 0);
console.log(`decisions: ${EDITS.length} edits on ${routeIds.length} routes`);
console.log(`planned: ${plan.length} routes; impossible pins on them ${sum("was")} -> ${sum("now")}; gpx touched on ${plan.filter((p) => p.patch.gpx).length}`);
for (const p of plan) if (p.now) console.log(`  partial ${p.id}: ${p.was} -> ${p.now} (left: ${p.left.join("; ")})`);
if (done.length) console.log(`  already applied: ${done.length} route(s)`);
for (const r of refused) console.log(`  REFUSED ${r}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

// Never overwrite an earlier snapshot: a second run would record the REPAIRED rows as "before".
const prior = existsSync(ROLLBACK) ? JSON.parse(readFileSync(ROLLBACK, "utf8")) : [];
const have = new Set(prior.map((r) => r.id));
writeFileSync(ROLLBACK, JSON.stringify([...prior, ...plan.filter((p) => !have.has(p.id)).map((p) => ({ id: p.id, ...p.before }))], null, 1));
for (const p of plan) await patchRow("routes", p.id, p.patch);
const back = await read(plan.map((p) => p.id));
const bad = plan.filter((p) => JSON.stringify(back.get(p.id).waypoints) !== JSON.stringify(p.patch.waypoints) ||
  (p.patch.gpx && JSON.stringify(back.get(p.id).gpx) !== JSON.stringify(p.patch.gpx)));
console.log(bad.length ? `VERIFY FAILED: ${bad.map((p) => p.id).join(", ")}` : `verified: ${plan.length} row(s) re-read and match.`);
process.exit(bad.length ? 1 : 0);
