// PIN EVERY NAMED WATER SOURCE THAT CAN BE PINNED HONESTLY — the repair half of audit:water-pins.
//
// Owner note, 2026-10-28: "Audit water waypoints. Make sure we have all of them per route."
// audit:water-pins lists each water source a route's own record names (lib/water-sources.mjs) that
// no pin stands for. This places a Water pin for each one whose position can be MEASURED from two
// independent records, and lists the rest with the reason.
//
// A COORDINATE IS NEVER COMPUTED FROM OUR OWN DATA (fabricated-waypoint-pins hub): nothing is
// spaced between pins or snapped onto a line we drew. The feature's geometry comes from
// OpenStreetMap (Overpass), found by the source's exact name inside a box around the route, and:
//   CREEK, TRACK      the pin is where the named waterway CROSSES the route's RECORDED track (the
//                     first crossing walking in). A creek the track only runs beside has no single
//                     point and is refused — "the river the whole way" is not a place.
//   LAKE, TRACK       the shore vertex nearest the recorded track, which must be within WP_TOL.
//   CREEK, NO TRACK   the one place a mapped OSM trail crosses the named waterway inside the route's
//                     corridor (CORRIDOR_M of its own pins). Two or more distinct crossings is
//                     ambiguous and refused.
//   LAKE, NO TRACK    a lake no wider than EXTENT_M, its GNIS point (WA) or else the mean of its
//                     OSM outline, inside the corridor. A wider lake has no point that is "the water".
// Then the GROUND: USGS 3DEP height at the pin, which must lie between the trailhead (less SLACK_FT)
// and the summit — a same-named lake in the next valley fails it, and the height is what we store.
//
// TRAIL DISTANCE (distMi) is written only when MEASURED along a recorded track from the trailhead.
//
//   node scripts/oneoff/add-water-pins.mjs --routes dump.json --audit audit.json          # dry run
//   node scripts/oneoff/add-water-pins.mjs ... --apply                                    # paced writes
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import fs from "fs";
import path from "path";
import os from "os";
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";
import { ident } from "../lib/camp-names.mjs";
import { recordedTrackPts, pointOf, metresBetween } from "../../lib/track.js";
import { orderWaypoints } from "../../lib/waypoints.js";
import { nearestOnTrack, trackLine } from "../lib/track-geometry.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");
const RUN = process.env.WATER_PINS_RUN || path.join(os.homedir(), "dev/water-pins-run");
const ROUTES = arg("routes", path.join(RUN, "routes.json"));
const AUDIT = arg("audit", path.join(RUN, "audit-before.json"));
const LIMIT = Number(arg("limit", "100000"));
const ONLY = arg("only", null); // comma list of route ids
const PACE_MS = Number(arg("pace-ms", "1100"));
const WP_TOL = 500, CORRIDOR_M = 1200, EXTENT_M = 1000, SLACK_FT = 100, MERGE_M = 150, NEAR_PINS_M = 300, PIN_NEAR_M = 1500;
const UA = "ClimbMatch-water-pin-solver/1.0 (climbing route catalog)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const audit = JSON.parse(fs.readFileSync(AUDIT, "utf8"));
const byId = new Map(JSON.parse(fs.readFileSync(ROUTES, "utf8")).map((r) => [r.id, r]));
if (APPLY) {
  const rbs = fs.readdirSync(RUN).filter((f) => f.startsWith("rollback-water-pins-")).map((f) => fs.statSync(path.join(RUN, f)).mtimeMs);
  if (rbs.length && fs.statSync(AUDIT).mtimeMs < Math.max(...rbs)) throw new Error(`${AUDIT} predates the last write — re-dump and rerun audit:water-pins --json first`);
}
const GNIS_FILE = path.join(os.homedir(), "dev/camp-pins-run/gnis/gnis-wa.json");
const gnis = fs.existsSync(GNIS_FILE) ? JSON.parse(fs.readFileSync(GNIS_FILE, "utf8")).filter((x) => /Lake|Reservoir|Spring/.test(x.cls)).map((x) => ({ ...x, id: ident(x.name) })) : [];

// ---- caches (Overpass answers and ground readings), kept in the run dir so a restart repeats nothing
const cacheFile = path.join(RUN, "lookup-cache.json");
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, "utf8")) : { ovp: {}, dem: {} };
const saveCache = () => fs.writeFileSync(cacheFile, JSON.stringify(cache));
async function overpass(ql) {
  if (ql in cache.ovp) return cache.ovp[ql];
  for (let t = 0; t < 5; t++) {
    try {
      const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(ql), signal: AbortSignal.timeout(120000) });
      if (r.ok) { const j = await r.json(); cache.ovp[ql] = j.elements || []; saveCache(); await sleep(1500); return cache.ovp[ql]; }
      console.error(`overpass ${r.status} — backing off`);
    } catch (e) { console.error(`overpass ${e.name} — backing off`); }
    await sleep(30000 * (t + 1));
  }
  return null;
}
async function ground(p) {
  const k = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  if (k in cache.dem) return cache.dem[k];
  const v = await elevationAt(p.lat, p.lng, 6);
  if (v != null) { cache.dem[k] = Math.round(v); saveCache(); }
  return v == null ? null : Math.round(v);
}

// ---- the same OSM features from a local Geofabrik extract (run dir/extract-water.cjs): Overpass
// answered in ~35 s a query, which made 634 lookups a six-hour job. A box the extract does not wholly
// cover (outside Washington) falls back to Overpass.
const OSM_FILE = arg("osm", path.join(RUN, "osm-water.json"));
const OSM = fs.existsSync(OSM_FILE) ? JSON.parse(fs.readFileSync(OSM_FILE, "utf8")).map((f) => {
  const pts = f.pts || [[f.lat, f.lng]];
  const la = pts.map((p) => p[0]), ln = pts.map((p) => p[1]);
  return { ...f, b: [Math.min(...la), Math.min(...ln), Math.max(...la), Math.max(...ln)] };
}) : [];
const WA = [45.54, -124.85, 49.01, -116.91];
function localIn(box) {
  const [s, w, n, e] = box.split(",").map(Number);
  if (!OSM.length || s < WA[0] || w < WA[1] || n > WA[2] || e > WA[3]) return null;
  return OSM.filter((f) => f.b[0] <= n && f.b[2] >= s && f.b[1] <= e && f.b[3] >= w);
}
const asElement = (f) => f.kind === "spring" ? { type: "node", tags: { name: f.name, natural: "spring" }, lat: f.lat, lon: f.lng }
  : { type: f.rel ? "relation" : "way", tags: f.kind === "stream" ? { name: f.name, waterway: "stream" } : f.kind === "water" ? { name: f.name, natural: "water" } : { highway: "path" },
      ...(f.rel ? { members: [{ role: "outer", geometry: f.pts.map(([lat, lon]) => ({ lat, lon })) }] } : { geometry: f.pts.map(([lat, lon]) => ({ lat, lon })) }) };

// ---- geometry, on a local flat plane (segment lengths of metres; error far below the tolerances)
const M = 111320;
const xy = (p, o) => ({ x: (p.lng - o.lng) * Math.cos((o.lat * Math.PI) / 180) * M, y: (p.lat - o.lat) * M });
const ll = (q, o) => ({ lat: o.lat + q.y / M, lng: o.lng + q.x / (Math.cos((o.lat * Math.PI) / 180) * M) });
function crossings(lineA, lineB) {
  if (lineA.length < 2 || lineB.length < 2) return [];
  const o = lineA[0], A = lineA.map((p) => xy(p, o)), B = lineB.map((p) => xy(p, o)), out = [];
  let run = 0;
  for (let i = 0; i < A.length - 1; i++) {
    const a = A[i], b = A[i + 1], segA = Math.hypot(b.x - a.x, b.y - a.y);
    for (let j = 0; j < B.length - 1; j++) {
      const c = B[j], d = B[j + 1];
      const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
      if (!den) continue;
      const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
      const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push({ p: ll({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, o), alongM: run + t * segA });
    }
    run += segA;
  }
  return out.sort((x, y) => x.alongM - y.alongM);
}
const distToLine = (p, line) => (line.length >= 2 ? nearestOnTrack(p, line).d : line.length ? metresBetween(p, line[0]) : Infinity);
const geomOf = (el) => (el.geometry || []).map((g) => ({ lat: g.lat, lng: g.lon }));
const ringsOf = (el) => (el.type === "way" ? [geomOf(el)] : (el.members || []).filter((m) => m.role !== "inner" && m.geometry).map((m) => m.geometry.map((g) => ({ lat: g.lat, lng: g.lon }))));
const extentM = (pts) => { const la = pts.map((p) => p.lat), ln = pts.map((p) => p.lng); return metresBetween({ lat: Math.min(...la), lng: Math.min(...ln) }, { lat: Math.max(...la), lng: Math.max(...ln) }); };
// "Freds Lake" / "Fred's Lake", "Mt" / "Mount": compare names the way agencies spell them.
// "Hardscrabble Lake" / OSM "Hardscrabble Lakes": a plural last word is made singular.
const nameKey = (s) => ident(String(s || "").replace(/['’]/g, "").replace(/\bMt\.?\b/g, "Mount")).replace(/\b(lake|tarn|spring|fall)s$/, "$1");

const elevFt = (w) => (w == null ? null : w.elev != null && w.elev !== "" ? Number(w.elev) : w.elevM != null && w.elevM !== "" ? Number(w.elevM) * 3.28084 : null);
const typeIs = (w, re) => re.test(String((w && w.type) || ""));
const isWaterPin = (w) => typeIs(w, /^(water|lake|lake\/basin)$/i);
function trackOf(r) { const rec = recordedTrackPts(r.gpx, r.waypoints || []); return rec && trackLine(rec).length >= 2 ? trackLine(rec) : null; }

async function solve(r, src) {
  const pins = (r.waypoints || []).filter(Boolean);
  const placed = orderWaypoints(pins.slice()).map(pointOf).filter(Boolean);
  const track = trackOf(r);
  const corridor = track || placed;
  if (!corridor.length) return { why: "the route has no placed pin or track to search around" };
  const la = corridor.map((p) => p.lat), ln = corridor.map((p) => p.lng);
  const box = `${Math.min(...la) - 0.03},${Math.min(...ln) - 0.04},${Math.max(...la) + 0.03},${Math.max(...ln) + 0.04}`;
  const isLake = /\b(lakes?|tarns?|pond)\b/i.test(src.name) && !/\b(creek|river|brook|fork)$/i.test(src.name);
  const rx = src.name.replace(/['’]/g, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "['’]?\\s*").replace(/^Mount\b|^Mt\b/, "M(oun)?t\\.?");
  const local = localIn(box);
  const els = local ? local.filter((e) => e.kind !== "path" && nameKey(e.name) === nameKey(src.name)).map(asElement)
    : await overpass(`[out:json][timeout:90];(way["waterway"]["name"~"^${rx}$",i](${box});way["natural"="water"]["name"~"^${rx}$",i](${box});relation["natural"="water"]["name"~"^${rx}$",i](${box});way["water"]["name"~"^${rx}$",i](${box});node["natural"="spring"]["name"~"^${rx}$",i](${box}););out geom;`);
  if (els == null) return { why: "overpass unavailable" };
  const named = els.filter((e) => nameKey(e.tags && e.tags.name) === nameKey(src.name));
  if (!named.length) return { why: "not found in OpenStreetMap by that name near the route" };
  const water = named.filter((e) => e.tags.natural === "water" || e.tags.water || e.type === "relation");
  const streams = named.filter((e) => e.tags.waterway);
  const springs = named.filter((e) => e.type === "node");
  let cand = null;
  if (springs.length === 1) cand = { p: { lat: springs[0].lat, lng: springs[0].lon }, how: "OSM spring" };
  else if (isLake || (water.length && !streams.length)) {
    if (!water.length) return { why: "named as a lake, but OSM holds only a stream of that name" };
    const rings = water.flatMap(ringsOf).filter((g) => g.length >= 3);
    if (track) {
      let best = null;
      for (const ring of rings) for (const v of ring) { const d = distToLine(v, track); if (!best || d < best.d) best = { v, d }; }
      if (!best || best.d > WP_TOL) return { why: `lake ${best ? Math.round(best.d) : "?"} m from the recorded track` };
      cand = { p: best.v, how: "OSM lake shore nearest the track" };
    } else {
      // Two same-named lakes in the box is not an identity.
      const lakes = water.map((e) => ({ e, pts: ringsOf(e).flat() })).filter((x) => x.pts.length >= 3);
      const distinct = lakes.filter((x, i) => lakes.findIndex((y) => metresBetween(y.pts[0], x.pts[0]) < 2000) === i);
      if (distinct.length !== 1) return { why: `${distinct.length} lakes of that name in reach` };
      const pts = distinct[0].pts;
      if (extentM(pts) > EXTENT_M) return { why: `lake ${Math.round(extentM(pts))} m across and no recorded track — no single point is the water` };
      const mean = { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
      const g = gnis.filter((x) => x.id === nameKey(src.name) && metresBetween(x, mean) < 1500);
      cand = g.length === 1 ? { p: { lat: g[0].lat, lng: g[0].lng }, how: "GNIS lake point (OSM outline confirms)" } : { p: mean, how: "OSM lake outline" };
      const d = distToLine(cand.p, placed);
      if (d > CORRIDOR_M) return { why: `lake ${Math.round(d)} m from the route's own pins` };
    }
  } else {
    const lines = streams.map(geomOf).filter((g) => g.length >= 2);
    if (!lines.length) return { why: "no waterway geometry" };
    if (track) {
      const xs = lines.flatMap((l) => crossings(track, l)).sort((a, b) => a.alongM - b.alongM);
      if (!xs.length) return { why: "the recorded track never crosses it (runs beside it, or the source is off the route)" };
      cand = { p: xs[0].p, how: "where the stream crosses the recorded track", alongM: xs[0].alongM, crossing: true };
    } else {
      const la2 = placed.map((p) => p.lat), ln2 = placed.map((p) => p.lng);
      const box2 = `${Math.min(...la2) - 0.02},${Math.min(...ln2) - 0.025},${Math.max(...la2) + 0.02},${Math.max(...ln2) + 0.025}`;
      const loc2 = localIn(box2);
      const paths = loc2 ? loc2.filter((e) => e.kind === "path").map(asElement)
        : await overpass(`[out:json][timeout:90];way["highway"~"^(path|footway|track|bridleway)$"](${box2});out geom;`);
      if (paths == null) return { why: "overpass unavailable" };
      let xs = [];
      for (const pth of paths.map(geomOf)) for (const l of lines) xs.push(...crossings(pth, l).map((x) => x.p));
      xs = xs.filter((p) => distToLine(p, placed) <= CORRIDOR_M);
      let distinct = xs.filter((p, i) => xs.findIndex((q) => metresBetween(p, q) < 400) === i);
      if (!distinct.length) return { why: "no mapped trail crosses it near the route, and no recorded track" };
      // Several crossings in the corridor: the one that sits on the route's own pins, if only one does.
      const close = distinct.filter((p) => distToLine(p, placed) <= NEAR_PINS_M);
      if (distinct.length > 1 && close.length === 1) distinct = close;
      if (distinct.length > 1) return { why: `${distinct.length} different trail crossings near the route — ambiguous without a track` };
      cand = { p: distinct[0], how: "where a mapped trail crosses the stream", crossing: true };
    }
  }
  // WITHOUT A TRACK, A PIN OF THE ROUTE MUST STAND NEAR IT. The chord between two sparse pins is
  // not where the trail goes: on Fortress Mountain the only crossing within 300 m of the chord was
  // the Chiwawa 4.3 km upstream of the bridge the route actually uses (first full run, 2026-10-30).
  if (!track) {
    const dPin = Math.min(...placed.map((q) => metresBetween(q, cand.p)));
    if (dPin > PIN_NEAR_M) return { why: `no recorded track, and ${Math.round(dPin)} m from every pin of the route` };
  }
  // GROUND and HEIGHT BAND
  const p = { lat: Number(cand.p.lat.toFixed(6)), lng: Number(cand.p.lng.toFixed(6)) };
  const g = await ground(p);
  if (g == null) return { why: "no ground reading" };
  const th = pins.find((w) => typeIs(w, /trailhead/i) && elevFt(w) != null);
  const top = Math.max(...pins.filter((w) => typeIs(w, /summit|topout/i)).map(elevFt).filter((v) => v != null), -Infinity);
  if (th && g < elevFt(th) - SLACK_FT) return { why: `ground ${g} ft is below the trailhead (${Math.round(elevFt(th))} ft) — off the walk` };
  if (Number.isFinite(top) && g > top + 100) return { why: `ground ${g} ft is above the summit` };
  let distMi = null;
  if (track && th && pointOf(th)) {
    const thOn = nearestOnTrack(pointOf(th), track);
    const on = nearestOnTrack(p, track);
    if (thOn && on && thOn.d <= 400 && on.d <= WP_TOL) {
      const mi = Math.abs((cand.alongM ?? on.alongM) - thOn.alongM) / 1609.34;
      if (mi * 1609.34 + 50 >= metresBetween(pointOf(th), p)) distMi = Math.round(mi * 10) / 10;
    }
  }
  return { ok: true, p, elev: g, distMi, how: cand.how, crossing: !!cand.crossing };
}

function insert(wps, pin) {
  const all = wps.every((w) => w && typeof w.distMi === "number" && Number.isFinite(w.distMi));
  if (all && typeof pin.distMi === "number") return [...wps, pin];
  const list = orderWaypoints(wps.slice());
  const thI = list.findIndex((w) => typeIs(w, /trailhead/i));
  let sumI = list.findIndex((w) => typeIs(w, /summit/i));
  if (sumI < 0) sumI = list.length;
  let at = Math.max(thI + 1, 0);
  for (let i = at; i < sumI; i++) { const e = elevFt(list[i]); if (e != null && e <= pin.elev) at = i + 1; }
  return [...list.slice(0, at), pin, ...list.slice(at)];
}

// ---- solve
let work = audit.missing;
if (ONLY) { const s = new Set(ONLY.split(",")); work = work.filter((x) => s.has(x.id)); }
work = work.slice(0, LIMIT);
const plan = new Map(), refused = [];
let n = 0;
for (const item of work) {
  n++;
  const r = byId.get(item.id);
  if (!r) { refused.push({ ...item, why: "route not in the dump" }); continue; }
  const v = await solve(r, { name: item.source });
  if (!v.ok) { refused.push({ ...item, why: v.why }); continue; }
  const cur = plan.get(r.id) || { before: r.waypoints || [], after: (r.waypoints || []).slice(), adds: [] };
  const clash = cur.after.find((w) => isWaterPin(w) && pointOf(w) && metresBetween(pointOf(w), v.p) < MERGE_M);
  if (clash) { refused.push({ ...item, why: `Water pin "${clash.name}" already stands within ${MERGE_M} m` }); continue; }
  const name = v.crossing && !/\bcrossing\b/i.test(item.source) ? `${item.source} crossing` : item.source;
  cur.after = insert(cur.after, { type: "Water", name, ...v.p, elev: v.elev, ...(v.distMi != null ? { distMi: v.distMi } : {}) });
  cur.adds.push({ source: item.source, name, ...v.p, elev: v.elev, distMi: v.distMi, how: v.how });
  plan.set(r.id, cur);
  if (n % 25 === 0) console.error(`solved ${n}/${work.length}  routes ${plan.size}  refused ${refused.length}`);
}
const planFile = path.join(RUN, `plan-${Date.now()}.json`);
fs.writeFileSync(planFile, JSON.stringify({ made: new Date().toISOString(), routes: Object.fromEntries(plan), refused }, null, 1));
const adds = [...plan.values()].flatMap((x) => x.adds);
console.log(`sources worked : ${work.length}`);
console.log(`pinnable       : ${adds.length} on ${plan.size} routes  (${[...new Set(adds.map((a) => a.how))].map((h) => `${h} ${adds.filter((a) => a.how === h).length}`).join("; ")})`);
console.log(`refused        : ${refused.length}`);
const tally = {};
for (const x of refused) { const k = String(x.why).replace(/[\d,.]+/g, "N").slice(0, 80); tally[k] = (tally[k] || 0) + 1; }
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(4)}  ${k}`);
console.log(`plan: ${planFile}`);
if (!APPLY) process.exit(0);

// ---- apply: one PATCH per route, paced, each guarded by a re-read of the live row, rollback first
const H = headers(anonKey());
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : x));
async function q(p) {
  for (let t = 0; t < 4; t++) {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H, signal: AbortSignal.timeout(30000) }); if (r.ok) return r.json(); } catch { /* backed off below */ }
    await sleep(60000 * (t + 1));
  }
  throw new Error(`read failed: ${p.slice(0, 100)}`);
}
async function patchWaypoints(id, waypoints) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id`, {
    method: "PATCH", signal: AbortSignal.timeout(60000),
    headers: headers(requireServiceKey(), { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ waypoints }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH ${id} -> ${res.status} ${text.slice(0, 200)}`);
  const rows = JSON.parse(text);
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`PATCH ${id} changed ${Array.isArray(rows) ? rows.length : "?"} rows, expected 1`);
}
const rollbackFile = path.join(RUN, `rollback-water-pins-${Date.now()}.json`);
const rollback = {};
let written = 0, skipped = 0;
for (const [id, x] of plan) {
  const [now] = await q(`routes?select=id,waypoints&id=eq.${encodeURIComponent(id)}`);
  if (canon((now && now.waypoints) || []) !== canon(x.before)) { skipped++; console.error(`skip ${id}: waypoints changed since the dump`); continue; }
  rollback[id] = x.before;
  fs.writeFileSync(rollbackFile, JSON.stringify(rollback));
  const t0 = Date.now();
  try { await patchWaypoints(id, x.after); } catch (e) {
    console.error(`write failed ${id}: ${e.message} — backing off a minute`);
    delete rollback[id]; fs.writeFileSync(rollbackFile, JSON.stringify(rollback));
    await sleep(60000); continue;
  }
  written++;
  const took = Date.now() - t0;
  if (took > 15000) { console.error(`write took ${took} ms — STOPPING; rerun once the database is healthy`); break; }
  if (written % 20 === 0) {
    for (;;) {
      const h0 = Date.now(); let ok = false;
      try { const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&limit=1`, { headers: H, signal: AbortSignal.timeout(20000) }); await r.text(); ok = r.ok; } catch { ok = false; }
      if (ok && Date.now() - h0 < 3000) break;
      console.error(`app reads slow (${Date.now() - h0} ms) — pausing two minutes`); await sleep(120000);
    }
    console.error(`written ${written}/${plan.size}`);
  }
  if (took > 4000) await sleep(60000);
  await sleep(PACE_MS);
}
let landed = 0;
for (const id of Object.keys(rollback)) {
  const [now] = await q(`routes?select=id,waypoints&id=eq.${encodeURIComponent(id)}`);
  if (canon((now && now.waypoints) || []) === canon(plan.get(id).after)) landed++; else console.error(`NOT LANDED ${id}`);
  await sleep(150);
}
console.log(`written ${written}, skipped ${skipped}, re-read and confirmed ${landed}/${Object.keys(rollback).length}`);
console.log(`rollback: ${rollbackFile}`);
