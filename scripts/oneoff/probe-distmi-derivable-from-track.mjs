// Can the missing `distMi` be COMPUTED from the route's own gpx track instead of researched?
//
// 435 WA routes cannot be ordered because a pin lacks distMi, and 64 of those list an approach
// marker after the summit. Researching a distance per pin is slow and needs sources. But a pin
// has a coordinate and many routes have a track, so distance-along-track is arithmetic.
//
// EXCEPT on the routes where the "track" IS the waypoint list joined up — 201 of 580 WA gpx
// tracks are exactly that (lib/track.js, trackIsJustTheWaypoints). There, distance-along-track
// reproduces the STORED order by construction, so it would confirm whatever order is already
// there and fix nothing. That is the same circularity the waypoint audits hit, and it is why
// this probe measures the two populations separately instead of reporting one number.
//
//   node scripts/oneoff/probe-distmi-derivable-from-track.mjs [--state wa]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";
import { dedupeWaypoints } from "../../lib/waypoints.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,waypoints,gpx` +
    `&waypoints=not.is.null` + (STATE ? `&id=like.${STATE}_*` : "") +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 900 * (a + 1)));
  }
}

const rows = [];
for (let after = null; ;) {
  const p = await page(after);
  if (!p.length) break;
  rows.push(...p);
  if (p.length < 1000) break;
  after = p[p.length - 1].id;
}
if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");

const num = v => (typeof v === "number" && Number.isFinite(v)) ? v : null;
const coordOf = w => {
  if (!w || typeof w !== "object") return null;
  const la = num(w.lat), ln = num(w.lng ?? w.lon);
  return (la != null && ln != null) ? [la, ln] : null;
};
const lineOf = g => {
  const pts = Array.isArray(g) ? g : (g && Array.isArray(g.points) ? g.points : null);
  if (!pts) return [];
  return pts.map(p => Array.isArray(p) ? [num(p[0]), num(p[1])]
    : [num(p.lat), num(p.lng ?? p.lon)]).filter(c => c[0] != null && c[1] != null);
};

let noPins = 0, allHaveDist = 0, noTrack = 0, synthetic = 0, noCoords = 0, derivable = 0;
const good = [];
for (const r of rows) {
  const wps = dedupeWaypoints(Array.isArray(r.waypoints) ? r.waypoints : []);
  if (wps.length < 2) { noPins++; continue; }
  if (wps.every(w => num(w.distMi) != null)) { allHaveDist++; continue; }

  const line = lineOf(r.gpx);
  if (line.length < 2) { noTrack++; continue; }

  const pins = wps.map(coordOf).filter(Boolean);
  if (pins.length < wps.length) { noCoords++; continue; }   // a pin with no coordinate cannot be placed

  // The circularity check. A track that is just the pins joined up cannot ORDER the pins.
  if (trackIsJustTheWaypoints(line, pins)) { synthetic++; continue; }

  derivable++;
  good.push({ id: r.id, name: r.name, pins: wps.length, track: line.length,
    missing: wps.filter(w => num(w.distMi) == null).length });
}

console.log(`${rows.length} ${STATE} routes carry waypoints\n`);
console.log(`  ${allHaveDist}  already have distMi on every pin — nothing to derive`);
console.log(`  ${noPins}  fewer than 2 pins`);
console.log(`  ${noTrack}  have no usable gpx track — distance cannot be computed, only researched`);
console.log(`  ${noCoords}  have a pin with no coordinate — it cannot be placed on any track`);
console.log(`  ${synthetic}  have a track that IS the pins joined up — computing from it would`);
console.log(`        confirm the stored order by construction and fix nothing`);
console.log(`\n  ${derivable}  could have distMi COMPUTED from a genuine track`);

for (const g of good.slice(0, +arg("--list", 15))) {
  console.log(`     ${g.id}  ${g.missing}/${g.pins} pins missing distMi, ${g.track}-point track`);
}
if (good.length > +arg("--list", 15)) console.log(`     … ${good.length - +arg("--list", 15)} more`);
console.log("\nReport only — nothing was changed.");
