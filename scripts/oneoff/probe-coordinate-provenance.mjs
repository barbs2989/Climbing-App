// Which waypoint coordinates were SOURCED, and which were COMPUTED?
//
// Three agents writing directions tonight independently reported the same two fingerprints,
// on different routes. Neither is a judgement call — both are arithmetic:
//
//   A. AVERAGED. wa_spectre_peak_south_route stores 48.844021233333336 and -121.37145793750001.
//      A GPS fix, a map read, or a hand-typed coordinate never has 15 decimal places. That tail
//      is IEEE-754 residue from dividing a sum by 3 or by 8 — the number is the mean of several
//      other numbers. At 6 decimals you are already at ~0.1 m; anything past 8 is not precision,
//      it is provenance, and it says the point was interpolated rather than observed.
//
//   B. COPIED. wa_mount_larrabee_south_ridge stores High Pass at longitude -121.6358, which is
//      byte-identical to the trailhead's. The result is a visible zigzag: the chain runs out on
//      bearing 242 and then reverses to 062, while every prose column says the stretch runs
//      north. wa_chianti_spire_east_face is the stronger form — a Campsite carrying the summit's
//      exact lat AND lng, which cannot be true of two different places.
//
// This matters because it explains the OTHER numbers. The directions writer's six gates are all
// geometric, so a fabricated coordinate does not merely sit there being wrong: it makes every
// gate reach a confident conclusion from a made-up premise. "Coordinate impossible" (51 routes)
// and "backtracks toward the start" (88) are both computed from these values.
//
// Read-only. Fails closed on a read that never succeeds.
import { selectAll as _selectAll } from "../lib/supabase-env.mjs";

// The first call of a run pays ~3.7s of connection setup against 0.3-0.7s warm, and anon
// carries a 3s statement_timeout — so a cold run intermittently dies with 57014 before
// fetching anything. Pay a tiny warm-up first. Retries are PRINTED: a silent retry turns a
// database signal into noise, and with many sessions live the retry rate IS the signal.
let retried = 0;
async function selectAll(t, s, f, o) {
  let last;
  for (let a = 1; a <= 8; a++) {
    try { const r = await _selectAll(t, s, f, o); if (a > 1) { retried++; console.error(`  (retry ${a - 1} succeeded for ${f || t})`); } return r; }
    catch (e) { last = e; if (a < 8) await new Promise((x) => setTimeout(x, 2000 * a)); }
  }
  throw new Error(`read failed after 8 attempts (${f || t}): ${last?.message}`);
}
await selectAll("areas", "id", "id=eq.__warmup__", { pageSize: 1 }).catch(() => {});

// Count decimals from the value's own shortest round-trip string, which is what JSON holds.
const decimals = (v) => {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const s = String(v);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
};

// The `areas` scan is 47k rows and it is the ONLY part of this probe that has failed under
// contention — eight attempts, every one 57014. Cache the WA id list on first success so a
// re-run costs nothing. The cache is a list of ids, not measurements, so a stale one can only
// omit an area added since; the probe prints its age rather than hiding it.
import fs from "fs";
import os from "os";
import path from "path";
const CACHE = path.join(os.tmpdir(), "climbmatch-wa-area-ids.json");
let waIds;
if (fs.existsSync(CACHE)) {
  const c = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  waIds = c.ids;
  console.log(`using cached WA area ids (${waIds.length}, written ${c.at})\n`);
} else {
  const areas = await selectAll("areas", "id,path", null, { pageSize: 1000 });
  waIds = areas.filter((a) => (a.path || "").includes("washington")).map((a) => a.id);
  fs.writeFileSync(CACHE, JSON.stringify({ at: new Date().toISOString(), ids: waIds }));
}
const rows = [];
for (let i = 0; i < waIds.length; i += 40)
  rows.push(...await selectAll("routes", "id,name,waypoints", `area_id=in.(${waIds.slice(i, i + 40).join(",")})`, { pageSize: 200 }));

const withWp = rows.filter((r) => Array.isArray(r.waypoints) && r.waypoints.length);
let pins = 0;
const dist = new Map();          // decimals -> count
const averaged = [];             // routes carrying a >8dp pin
const bothSame = [];             // two pins, identical lat AND lng
const oneSame = [];              // two pins sharing exactly one component

for (const r of withWp) {
  const wps = r.waypoints;
  let avgHere = 0;
  for (const w of wps) {
    if (!w || w.lat == null || w.lng == null) continue;
    pins++;
    const d = Math.max(decimals(w.lat) ?? 0, decimals(w.lng) ?? 0);
    dist.set(d, (dist.get(d) || 0) + 1);
    if (d > 8) avgHere++;
  }
  if (avgHere) averaged.push({ id: r.id, n: avgHere, of: wps.length });

  for (let i = 0; i < wps.length; i++) for (let j = i + 1; j < wps.length; j++) {
    const a = wps[i], b = wps[j];
    if (!a || !b || a.lat == null || b.lat == null || a.lng == null || b.lng == null) continue;
    const sameLat = a.lat === b.lat, sameLng = a.lng === b.lng;
    if (sameLat && sameLng) bothSame.push({ id: r.id, i, j, a: a.name, b: b.name, at: `${a.lat},${a.lng}` });
    else if (sameLat || sameLng) oneSame.push({ id: r.id, i, j, a: a.name, b: b.name, which: sameLat ? "lat" : "lng", v: sameLat ? a.lat : a.lng });
  }
}

console.log(`WA routes carrying waypoints: ${withWp.length}   located pins: ${pins}\n`);

console.log(`--- decimal places, i.e. how the number was PRODUCED ---`);
for (const d of [...dist.keys()].sort((a, b) => a - b))
  console.log(`  ${String(d).padStart(2)} dp : ${String(dist.get(d)).padStart(5)}${d > 8 ? "   <- arithmetic residue, not a measurement" : ""}`);

console.log(`\n=== A. AVERAGED (a pin with >8 decimal places): ${averaged.length} routes ===`);
for (const a of averaged.sort((x, y) => y.n - x.n).slice(0, 20))
  console.log(`  ${a.id.padEnd(48)} ${a.n} of ${a.of} pins computed`);
if (averaged.length > 20) console.log(`  … and ${averaged.length - 20} more`);

const bothRoutes = new Set(bothSame.map((x) => x.id));
console.log(`\n=== B1. TWO PINS AT THE SAME POINT (identical lat AND lng): ${bothSame.length} pairs across ${bothRoutes.size} routes ===`);
for (const p of bothSame.slice(0, 20))
  console.log(`  ${p.id.padEnd(44)} [${p.i}] "${String(p.a || "").slice(0, 26)}" == [${p.j}] "${String(p.b || "").slice(0, 26)}"  @ ${p.at}`);
if (bothSame.length > 20) console.log(`  … and ${bothSame.length - 20} more`);

const oneRoutes = new Set(oneSame.map((x) => x.id));
console.log(`\n=== B2. TWO PINS SHARING EXACTLY ONE COMPONENT: ${oneSame.length} pairs across ${oneRoutes.size} routes ===`);
console.log(`    (a copy-paste fingerprint — two different places do not share a latitude to the digit)`);
for (const p of oneSame.slice(0, 20))
  console.log(`  ${p.id.padEnd(44)} [${p.i}] "${String(p.a || "").slice(0, 22)}" / [${p.j}] "${String(p.b || "").slice(0, 22)}"  same ${p.which}=${p.v}`);
if (oneSame.length > 20) console.log(`  … and ${oneSame.length - 20} more`);

// Self-check. All three fingerprints were reported by hand tonight; if the probe cannot
// reproduce them it is measuring something other than what it claims.
const want = [
  ["wa_spectre_peak_south_route", averaged.some((a) => a.id === "wa_spectre_peak_south_route"), "averaged pins"],
  ["wa_chianti_spire_east_face", bothRoutes.has("wa_chianti_spire_east_face"), "campsite == summit"],
  ["wa_mount_larrabee_south_ridge", oneRoutes.has("wa_mount_larrabee_south_ridge"), "High Pass shares the trailhead lng"],
];
console.log(`\n--- self-check against the three hand-found cases ---`);
let ok = true;
for (const [id, got, what] of want) { console.log(`  ${got ? "FOUND   " : "MISSED  "} ${id} (${what})`); if (!got) ok = false; }
if (!ok) { console.log(`\nthe probe does not reproduce a case found by hand — do not trust its counts`); process.exit(1); }
console.log(`\nall three reproduced.`);
