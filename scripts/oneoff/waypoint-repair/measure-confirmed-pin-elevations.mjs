// Every solver in this pass wrote a COORDINATE and deliberately left the ELEVATION alone, printing
// "that is now the ONLY defect on them, and it is a separate repair against a separate column".
// This measures that set before anyone repairs it.
//
// The scope matters, and it is narrower than audit:waypoint-elevations. That audit runs at TOL=2000
// on purpose: at 400 it reported 1,080 pins, "most of them the data's own precision rather than
// defects", because on a pin whose COORDINATE is itself fabricated a DEM reading is a statement
// about the wrong place. Here the coordinate came from an authority and was verified on re-read, so
// a disagreement is not precision -- it is two records about the same point contradicting.
//
// Read-only. It writes nothing and recommends nothing; a repair here needs its own evidence.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const ro = headers(anonKey());
const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const fab = JSON.parse(fs.readFileSync(`${T}/fab-pins.json`, "utf8"));
const origin = new Map();
for (const r of fab) for (const p of r.pins) origin.set(`${r.id}#${p.i}`, { lat: +p.lat, lng: +p.lng, elev: p.elev });

const ids = fab.map(r => r.id);
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

// A pin counts as REPAIRED when its live coordinate no longer equals the interpolated original.
const repaired = [];
for (const route of fab) {
  const w = (rows[route.id] || {}).waypoints || [];
  for (const pin of route.pins) {
    const live = w[pin.i];
    if (!live || live.lat == null) continue;
    const o = origin.get(`${route.id}#${pin.i}`);
    if (!o) continue;
    const moved = Math.abs(+live.lat - o.lat) > 1e-9 || Math.abs(+live.lng - o.lng) > 1e-9;
    if (moved) repaired.push({ route: route.id, i: pin.i, name: live.name, lat: +live.lat, lng: +live.lng, elev: live.elev });
  }
}
console.log(`pins with a repaired (authority-sourced) coordinate : ${repaired.length}\n`);

const buckets = { noElev: [], agree: [], off400: [], off1000: [], noGround: [] };
for (const p of repaired) {
  const elev = Number(p.elev);
  if (!Number.isFinite(elev) || elev === 0) { buckets.noElev.push(p); continue; }
  const g = await elevationAt(p.lat, p.lng);
  if (g == null) { buckets.noGround.push(p); continue; }
  const d = Math.abs(g - elev);
  p.ground = Math.round(g); p.delta = Math.round(g - elev);
  if (d <= 400) buckets.agree.push(p);
  else if (d <= 1000) buckets.off400.push(p);
  else buckets.off1000.push(p);
}
const n = repaired.length;
const pct = x => n ? ` (${(100 * x / n).toFixed(1)}%)` : "";
console.log(`  ground agrees within 400 ft : ${buckets.agree.length}${pct(buckets.agree.length)}`);
console.log(`  off by 400-1000 ft          : ${buckets.off400.length}${pct(buckets.off400.length)}`);
console.log(`  off by more than 1000 ft    : ${buckets.off1000.length}${pct(buckets.off1000.length)}`);
console.log(`  pin records no elevation    : ${buckets.noElev.length}`);
console.log(`  DEM would not answer        : ${buckets.noGround.length}`);

console.log(`\nthe >1000 ft contradictions, worst first:`);
for (const p of buckets.off1000.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)))
  console.log(`  ${p.route}[${p.i}] ${String(p.name).slice(0, 46)}\n      stored ${p.elev} ft / ground ${p.ground} ft  (${p.delta > 0 ? "+" : ""}${p.delta})`);

console.log(`\nthe 400-1000 ft band:`);
for (const p of buckets.off400.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 40))
  console.log(`  ${p.route}[${p.i}] ${String(p.name).slice(0, 46)}  stored ${p.elev} / ground ${p.ground}  (${p.delta > 0 ? "+" : ""}${p.delta})`);

fs.writeFileSync(`${T}/confirmed-pin-elevations.json`, JSON.stringify(buckets, null, 1));
console.log(`\n-> confirmed-pin-elevations.json. Read-only; nothing written to the database.`);
