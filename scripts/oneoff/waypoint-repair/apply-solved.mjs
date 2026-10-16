// Apply a solver's output file, re-checking everything against the LIVE row at write time.
//
// Separate from the solvers because each of them spends ~15 minutes on federal map services, and a
// decision about WHICH results to write should not require re-asking those services.
//
// DEFAULT POLICY: write a pin only when the ground does not contradict the route's own claimed
// elevation. A single mapped crossing in the route's corridor is strong evidence on its own, but
// when the ground disagrees sharply the likelier reading is that the crossing found is not the one
// the route uses -- a logging road meeting the creek near its mouth rather than the trail meeting it
// high up. wa_mount_buckindy_scramble[2] is the clear case: the sole mapped Kindy Creek crossing sits
// at 1,179 ft against a claimed 2,900.
//
// THOSE HELD BACK ARE UNCONFIRMED, NOT WRONG, and the distinction is measured rather than asserted:
// the Napeequa ford -- established independently, twice, at 0 m -- disagrees with its route's claimed
// elevation by 420 ft. So a modest disagreement disproves nothing, and no threshold is invented here
// to pretend otherwise. A threshold fitted until the known-good case passes would prove only that it
// was fitted.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../../lib/supabase-env.mjs";

const FILE = (process.argv.find(a => a.startsWith("--file=")) || "").slice(7);
const APPLY = process.argv.includes("--apply");
const ALL = process.argv.includes("--include-elev-disagreements");
if (!FILE) { console.log("usage: --file=ford-solved.json [--apply] [--include-elev-disagreements]"); process.exit(1); }
const ro = headers(anonKey());
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const DUP_M = 30, R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

const all = JSON.parse(fs.readFileSync(`${T}/${FILE}`, "utf8"));
const want = ALL ? all : all.filter(x => x.elevOk !== false);
const held = ALL ? [] : all.filter(x => x.elevOk === false);

const ids = [...new Set(want.map(x => x.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (ids.length && !Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

// Re-run the duplicate gate at write time: another pass in this effort may have moved a sibling pin
// onto the same place since the solver ran.
const go = [], blocked = [];
for (const e of want) {
  const w = (rows[e.route] || {}).waypoints || [];
  if (!w[e.i] || String(w[e.i].name || "") !== String(e.name)) { blocked.push({ e, why: "waypoint changed underneath" }); continue; }
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === e.i || w[j].lat == null) continue;
    if (m({ lat: +w[j].lat, lng: +w[j].lng }, { lat: e.lat, lng: e.lng }) < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) blocked.push({ e, why: `lands on an existing pin: ${clash}` });
  else go.push(e);
}

console.log(`${FILE}: ${all.length} solved`);
console.log(`  to write                       : ${go.length}`);
console.log(`  held back (ground contradicts) : ${held.length}`);
console.log(`  blocked at write time          : ${blocked.length}`);
for (const h of held) console.log(`    HELD  ${h.route}[${h.i}] ${h.name} — claims ${h.elev} ft, ground ${h.ground} ft`);
for (const b of blocked) console.log(`    BLOCK ${b.e.route}[${b.e.i}] ${b.e.name} — ${b.why}`);
if (!APPLY || !go.length) { console.log(`\nDry run — nothing written.`); process.exit(0); }

const key = requireServiceKey();
const grp = {};
for (const e of go) (grp[e.route] = grp[e.route] || []).push(e);
let wrote = 0, ok = 0;
for (const [id, edits] of Object.entries(grp)) {
  const wps = (rows[id].waypoints || []).slice();
  let touched = 0;
  for (const e of edits) { wps[e.i] = { ...wps[e.i], lat: +e.lat.toFixed(6), lng: +e.lng.toFixed(6) }; touched++; wrote++; }
  if (!touched) continue;
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { ...headers(key), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ waypoints: wps })
  });
  const back = await pr.json();
  if (pr.ok && Array.isArray(back) && back.length === 1) ok++; else console.log(`FAILED ${id}: ${pr.status}`);
}
console.log(`\nPATCHed ${ok} route(s), ${wrote} pin(s). Re-reading through the ANON role…`);
let good = 0;
for (const e of go) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=waypoints&id=eq.${encodeURIComponent(e.route)}`, { headers: ro });
  const [row] = await r.json();
  const w = (row.waypoints || [])[e.i] || {};
  if (Math.abs(+w.lat - +e.lat.toFixed(6)) < 1e-6 && Math.abs(+w.lng - +e.lng.toFixed(6)) < 1e-6) good++;
  else console.log(`MISMATCH ${e.route}[${e.i}]`);
}
console.log(`${good}/${go.length} verified via anon`);
