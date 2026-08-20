// The route's OWN second copy of its trailhead, applied only where the two copies are talking about
// the SAME PLACE.
//
// 57 still-fabricated pins are a trailhead, nearly all of them waypoint [0] -- where you park, and the
// single most consequential pin on a route. 28 of those routes carry a second, non-fabricated copy in
// approach_logistics, written by a different enrichment pass that never read the first.
//
// TWO THINGS THE RAW MEASUREMENT SHOWS, and they pull in opposite directions:
//
//   MOST MOVE 0 km. The pin already holds the blob's coordinate. Those pins are not misplaced at all
//   -- they were caught by the collinear-run detector as the endpoint of an interpolated run, and the
//   run detector is right that the run is synthetic while being wrong about that particular pin. This
//   is the same class as the 48 pins the in-row pass "repaired" by writing back the value they
//   already held. They are counted as CONFIRMED, never as repaired, because nothing changes.
//
//   THE BIG MOVERS ARE THE DANGEROUS ONES, not the valuable ones. wa_mount_lyall_south_route[1] is
//   named "Holden Village / Holden Lake Trailhead" while its blob says "High Bridge (Stehekin Valley
//   Road)" 20.8 km away -- a different trailhead on a different approach, reached a different way.
//   wa_castle_peak_pasayten_scramble[1] pairs "Ross Lake Dock / Boat Put-in" with "Ross Dam Trailhead
//   (SR-20 milepost 134)", 6.6 km apart and not the same thing either. Copying either would replace a
//   fabricated coordinate with a confidently wrong one, which is worse: a fabricated pin at least
//   looks odd, and a real trailhead in the wrong valley reads as data.
//
// So the blob is copied ONLY when its name agrees with the pin's. A disagreement is reported, because
// which of the two is right is a question about this route's approach and needs reading, not a rule.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const ro = headers(anonKey());
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const DUP_M = 30, R = 6371000, rad = Math.PI / 180;
const m = (a, b) => 2 * R * Math.asin(Math.min(1, Math.sqrt(
  Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
  Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2)));

// Words every trailhead name carries, which therefore distinguish none of them.
const GENERIC = new Set(["trailhead", "trail", "head", "parking", "pullout", "lot", "north", "south",
  "east", "west", "upper", "lower", "the", "and", "access", "road", "creek", "lake", "river", "put",
  "boat", "dock", "milepost", "mile", "exit", "campground", "junction", "roadside", "washout", "end"]);
const norm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const key = s => new Set(norm(s).split(" ").filter(t => t.length > 2 && !GENERIC.has(t)));
// Agreement means the two names share every distinctive token of the SHORTER one. "Upper Dungeness
// Trailhead" vs "Upper Dungeness Trailhead (Trail #833.2, FR-2870)" agrees; "Holden Village / Holden
// Lake Trailhead" vs "High Bridge (Stehekin Valley Road)" shares nothing and must not.
function sameTrailhead(a, b) {
  const A = key(a), B = key(b);
  if (!A.size || !B.size) return false;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  return hit === Math.min(A.size, B.size);
}

const cands = JSON.parse(fs.readFileSync(`${T}/trailhead-inrow.json`, "utf8"));
const ids = [...new Set(cands.map(c => c.route))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

const write = [], alreadyRight = [], nameClash = [], blocked = [];
for (const c of cands) {
  const w = (rows[c.route] || {}).waypoints || [];
  const pin = w[c.i];
  if (!pin || String(pin.name || "") !== String(c.name)) { blocked.push({ c, why: "waypoint changed underneath" }); continue; }
  const moved = Math.abs(+pin.lat - c.lat) > 1e-9 || Math.abs(+pin.lng - c.lng) > 1e-9;
  if (!moved) { alreadyRight.push(c); continue; }
  if (!sameTrailhead(c.name, c.blobName)) { nameClash.push(c); continue; }
  let clash = null;
  for (let j = 0; j < w.length; j++) {
    if (j === c.i || w[j].lat == null) continue;
    if (m({ lat: +w[j].lat, lng: +w[j].lng }, { lat: c.lat, lng: c.lng }) < DUP_M) { clash = w[j].name; break; }
  }
  if (clash) { blocked.push({ c, why: `lands on an existing pin: ${clash}` }); continue; }
  write.push(c);
}

console.log(`trailheads with a usable in-row second copy : ${cands.length}\n`);
console.log(`  ALREADY CORRECT — the two copies agree, nothing to write : ${alreadyRight.length}`);
console.log(`     (flagged by the collinear-run test, but the coordinate is real)`);
console.log(`  TO WRITE — names agree and the copies differ             : ${write.length}`);
console.log(`  NAME CLASH — the two copies describe DIFFERENT places    : ${nameClash.length}`);
console.log(`  blocked                                                  : ${blocked.length}\n`);
for (const c of write) {
  const g = await elevationAt(c.lat, c.lng);
  console.log(`  WRITE  ${c.route}[${c.i}] "${c.name}"\n         -> ${c.lat},${c.lng} (${c.movesKm} km)  blob "${c.blobName}"  ground ${g == null ? "?" : Math.round(g)} ft`);
}
for (const c of nameClash)
  console.log(`  CLASH  ${c.route}[${c.i}] "${c.name}"\n         blob says "${c.blobName}" ${c.movesKm} km away — different place, NOT copied`);
for (const b of blocked) console.log(`  BLOCK  ${b.c.route}[${b.c.i}] ${b.c.name} — ${b.why}`);

if (!APPLY || !write.length) { console.log(`\nDry run — nothing written.`); process.exit(0); }
const svc = requireServiceKey();
let wrote = 0, ok = 0;
const grp = {};
for (const c of write) (grp[c.route] = grp[c.route] || []).push(c);
for (const [id, edits] of Object.entries(grp)) {
  const wps = (rows[id].waypoints || []).slice();
  for (const e of edits) { wps[e.i] = { ...wps[e.i], lat: +e.lat.toFixed(6), lng: +e.lng.toFixed(6) }; wrote++; }
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { ...headers(svc), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ waypoints: wps })
  });
  const back = await pr.json();
  if (pr.ok && Array.isArray(back) && back.length === 1) ok++; else console.log(`FAILED ${id}: ${pr.status}`);
}
console.log(`\nPATCHed ${ok} route(s), ${wrote} pin(s). Re-reading through the ANON role…`);
let good = 0;
for (const c of write) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=waypoints&id=eq.${encodeURIComponent(c.route)}`, { headers: ro });
  const [row] = await r.json();
  const w = (row.waypoints || [])[c.i] || {};
  if (Math.abs(+w.lat - +c.lat.toFixed(6)) < 1e-6) good++; else console.log(`MISMATCH ${c.route}[${c.i}]`);
}
console.log(`${good}/${write.length} verified via anon`);
