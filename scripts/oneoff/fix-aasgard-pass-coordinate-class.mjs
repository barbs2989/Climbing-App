// A bad Aasgard Pass coordinate propagated across routes. I repaired ONE instance by hand
// (wa_dragontail_peak_backbone_ridge); research then found the same wrong point on another row and
// traced it to a low-quality geocoding aggregator rather than a survey. An instance fixed by hand is
// not a class closed, so this asks the catalog how many carry it.
//
// MEASURED: 19 pins named for Aasgard across 15 WA routes, in 6 coordinate clusters.
//   cluster 0  10 pins  47.48030,-120.82060 @ 7,841 ft   MAJORITY, and matches the published point
//   cluster 1   4 pins  47.48280,-120.81750 @ 7,800 ft   363 m out, and a DIFFERENT elevation
//   cluster 2   2 pins  47.47490,-120.81900 @ 7,841 ft   612 m out, the MAJORITY'S OWN elevation
//   clusters 3-5        different elevations AND different names
//
// THE ELEVATION IS THE DISCRIMINATOR, and it is what makes this safe to sweep where the earlier
// classes were not. A pin that is genuinely a different point ON the pass would carry a different
// height — and the ones that do also carry different NAMES ("Aasgard Pass Gully Break" at 6,000 ft,
// "Aasgard Pass trail (south shore)" at 5,800 ft), so they are different features and correct as
// stored. Cluster 2 claims the majority's exact elevation while sitting 612 m from its coordinate:
// that is a coordinate error, not a second location. Cluster 1 is left alone — 41 ft and 363 m is
// consistent with a different point on a broad pass, and this project has already learned (Colchuck
// Lake, batch 80) that a separation alone is a question rather than a verdict.
//
// NOTHING IS TYPED: the replacement coordinate is the catalog's own majority cluster, computed at run
// time from the rows that agree. A repair needing a coordinate the catalog does not already hold
// cannot be expressed by this script.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const NAME = /^aasgard pass$/i;          // exact — a compound name is a different feature
const CLUSTER_M = 150;                   // pins within this of each other are one cluster
const WRONG_M = 300;                     // ...and this far from the majority is a displaced pin
const hav = (a, b) => {
  const R = 6371008.8, r = Math.PI / 180;
  const dLa = (b[0]-a[0])*r, dLo = (b[1]-a[1])*r;
  const h = Math.sin(dLa/2)**2 + Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};

const rows = await selectAll("routes", "id,waypoints", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const pins = [];
for (const r of rows) {
  const w = Array.isArray(r.waypoints) ? r.waypoints : [];
  for (const [i, p] of w.entries()) {
    if (!NAME.test(String(p?.name || "").trim())) continue;
    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
    pins.push({ id: r.id, i, p });
  }
}
if (!pins.length) { console.error("no pins named Aasgard Pass found — refusing"); process.exit(1); }

const clusters = [];
for (const x of pins) {
  const c = clusters.find(c => hav([c.lat, c.lng], [x.p.lat, x.p.lng]) < CLUSTER_M);
  if (c) c.members.push(x); else clusters.push({ lat: x.p.lat, lng: x.p.lng, members: [x] });
}
clusters.sort((a, b) => b.members.length - a.members.length);
const maj = clusters[0];
const majRoutes = new Set(maj.members.map(m => m.id)).size;

// Fail closed: a "majority" of one or two rows is not a consensus and must not become a donor.
if (maj.members.length < 5 || majRoutes < 3) {
  console.error(`majority cluster is only ${maj.members.length} pin(s) on ${majRoutes} route(s) — not a consensus, refusing`);
  process.exit(1);
}
const majElev = maj.members.map(m => m.p.elev).find(e => typeof e === "number");
const donor = maj.members.find(m => m.p.elev === majElev);
console.log(`\nmajority: ${maj.members.length} pins on ${majRoutes} routes at ${donor.p.lat},${donor.p.lng} @ ${majElev} ft`);

const plan = [];
for (const c of clusters.slice(1)) {
  const sep = hav([donor.p.lat, donor.p.lng], [c.lat, c.lng]);
  for (const m of c.members) {
    const sameElev = m.p.elev === majElev;
    const verdict = sep <= WRONG_M ? "within tolerance"
      : !sameElev ? `LEFT ALONE — elevation ${m.p.elev} differs from the majority's ${majElev}, so it may be a different point`
      : "DISPLACED — claims the majority's elevation at a different coordinate";
    console.log(`  ${m.id.padEnd(46)} [${m.i}] ${m.p.lat},${m.p.lng} @ ${m.p.elev}  ${sep.toFixed(0)} m out — ${verdict}`);
    if (sep > WRONG_M && sameElev) plan.push({ ...m, sep });
  }
}
console.log(`\nto repair: ${plan.length}`);
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const live = new Map((await selectAll("routes", "id,waypoints", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let wrote = 0, refused = 0;
for (const m of plan) {
  const r = live.get(m.id);
  const cur = r?.waypoints?.[m.i];
  if (!cur || cur.lat !== m.p.lat || cur.lng !== m.p.lng || String(cur.name).trim() !== String(m.p.name).trim()) {
    console.log(`  REFUSED ${m.id}[${m.i}]: the row has changed since it was read`); refused++; continue;
  }
  const next = r.waypoints.map((p, i) => i === m.i ? { ...p, lat: donor.p.lat, lng: donor.p.lng } : p);
  await patchRow("routes", m.id, { waypoints: next });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

// A 200 is not evidence the data changed.
const after = new Map((await selectAll("routes", "id,waypoints", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const m of plan) {
  const a = after.get(m.id)?.waypoints?.[m.i];
  if (a && a.lat === donor.p.lat && a.lng === donor.p.lng && a.elev === m.p.elev && String(a.name).trim() === String(m.p.name).trim()) ok++;
  else console.log(`  NOT APPLIED: ${m.id}[${m.i}]`);
}
console.log(`verified ${ok} of ${plan.length}`);
for (const m of plan) {
  const before = live.get(m.id).waypoints.length, now = after.get(m.id).waypoints.length;
  if (before !== now) { console.error(`waypoint count changed on ${m.id}: ${before} -> ${now}`); process.exitCode = 1; }
}
