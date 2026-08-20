// Write the GROUND elevation onto pins whose COORDINATE is confirmed and whose stored elevation the
// ground contradicts. Dry run by default; --apply writes.
//
// WHY THIS IS SAFE HERE AND NOT IN GENERAL. `audit:waypoint-elevations` runs at TOL = 2000 on
// purpose: at 400 it reported 1,080 pins, "most of them the data's own precision rather than
// defects". That is right when the COORDINATE is itself fabricated -- a DEM reading is then a
// statement about the wrong place, and tightening the bound just measures the fabrication. It does
// not apply once the coordinate is sourced. Every pin here sits 0 m from a named feature in GNIS or
// OSM, re-asked today, so the DEM under it is a fact about a real located point.
//
// The 6 that did NOT confirm are left completely alone -- both halves are in doubt there, and
// writing an elevation would make a possibly-wrong pin internally consistent, which is worse than
// leaving it visibly odd.
//
// `elev` is in FEET. `elevM` is a legacy metric spelling that the READ side converts and the write
// side must never touch: writing metres into `elev` would put a third reading into a column that
// already holds two.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";

const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const APPLY = process.argv.includes("--apply");
const ro = headers(anonKey());
if (APPLY) requireServiceKey();                       // throws rather than degrading to anon

const R = 6371, rad = Math.PI / 180;
const km = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const want = JSON.parse(fs.readFileSync(`${T}/elev-confirmed.json`, "utf8"));
if (!want.length) { console.log("nothing to apply"); process.exit(0); }

const ids = [...new Set(want.map(w => w.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED: read " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

// Re-gate against the LIVE row. The measurement was taken minutes ago and other sessions write to
// this project; a row that has moved since is a row this run knows nothing about.
const go = [], refused = [];
for (const w of want) {
  const wps = (rows[w.route] || {}).waypoints;
  const p = wps && wps[w.i];
  if (!p) { refused.push({ w, why: "the waypoint is gone" }); continue; }
  if (p.lat == null || km({ lat: +p.lat, lng: +p.lng }, w) * 1000 > 1) {
    refused.push({ w, why: "the coordinate has changed since it was confirmed" }); continue;
  }
  if (Number(p.elev) !== Number(w.elev)) {
    refused.push({ w, why: `the stored elevation has changed (${p.elev}, was ${w.elev})` }); continue;
  }
  if (p.elevM != null) { refused.push({ w, why: "the pin carries the legacy elevM spelling — leave it to a pass that handles both" }); continue; }
  go.push({ w, wps, p });
}

console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ground elevation onto confirmed coordinates\n`);
console.log(`  to write : ${go.length}`);
for (const g of go) console.log(`  ${g.w.route}[${g.w.i}] ${g.w.name}\n      ${g.w.elev} ft -> ${g.w.ground} ft   (${g.w.by})`);
console.log(`\n  refused : ${refused.length}`);
for (const r of refused) console.log(`  ${r.w.route}[${r.w.i}] ${r.w.name} — ${r.why}`);
if (!APPLY) { console.log(`\nDry run. Re-run with --apply to write.`); process.exit(0); }

// ONE PATCH PER ROUTE. patchRow writes the whole `waypoints` array, so two pins on the same route
// patched separately each send an array built from the SAME stale read -- and the second write
// reverts the first. That is not hypothetical: wa_mount_duckabush_standard has pins 2 and 3 in this
// batch, pin 3 was written first, and pin 2's patch put the original 3600 back. The verify step
// caught it, which is the whole reason a PATCH returning 200 is never counted as a write.
const byRoute = new Map();
for (const g of go) { if (!byRoute.has(g.w.route)) byRoute.set(g.w.route, { wps: g.wps, edits: [] }); byRoute.get(g.w.route).edits.push(g.w); }
let wrote = 0;
for (const [routeId, { wps, edits }] of byRoute) {
  const next = wps.map((p, i) => { const e = edits.find(x => x.i === i); return e ? { ...p, elev: e.ground } : p; });
  await patchRow("routes", routeId, { waypoints: next });       // throws unless exactly one row came back
  wrote++;
}
console.log(`\nPATCHes issued : ${wrote} (for ${go.length} pin(s) across ${byRoute.size} route(s))`);

// A 200 is not evidence the data changed. Read it back through ANON -- the role the app uses.
const check = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED: verify read " + r.status); process.exit(1); }
  for (const x of await r.json()) check[x.id] = x;
}
let ok = 0, bad = [];
for (const g of go) {
  const p = ((check[g.w.route] || {}).waypoints || [])[g.w.i];
  if (p && Number(p.elev) === Number(g.w.ground)) ok++;
  else bad.push(`${g.w.route}[${g.w.i}] reads ${p ? p.elev : "(gone)"}, expected ${g.w.ground}`);
}
console.log(`verified by re-reading through anon : ${ok} of ${go.length}`);
for (const b of bad) console.log(`  MISMATCH ${b}`);
process.exit(bad.length ? 1 : 0);
