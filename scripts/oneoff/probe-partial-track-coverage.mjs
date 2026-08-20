// The route page draws a line under ROUTE TRACK, offers "Download GPX", and says nothing about
// how much of the route that line actually covers. A climber takes it away as the route.
//
// Two ways it can be partial, and they are different facts:
//   - it does not START at the trailhead (a climb-only track: the walk-in is missing)
//   - it does not REACH the summit (the top of the route is missing)
// The second is the worse one — somebody following it runs out of line on the mountain.
//
// The synthetic-track caveat (trackIsJustTheWaypoints) already covers a line that is only the
// waypoints joined up; those are excluded here so the two signals cannot double up.
//
// This prints the DISTRIBUTION before any threshold is chosen, because picking a number that
// produces the answer already believed is the trap this work has already hit once (the
// chord-vs-trail ratio). Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const k = anonKey();
const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const pt = (p) => Array.isArray(p) ? (typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null)
  : (p && typeof p.lat === "number" ? { lat: p.lat, lng: p.lng } : null);
const nearest = (p, line) => { let b = Infinity; for (const q of line) { const d = hvM(p, q); if (d < b) b = d; } return b; };

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,waypoints,gpx&id=like.wa_*&gpx=not.is.null&waypoints=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : NaN;
const thDist = [], sumDist = [];
let synthetic = 0, stubs = 0, noTh = 0, noSum = 0, judged = 0;

for (const r of rows) {
  const line = (Array.isArray(r.gpx) ? r.gpx : []).map(pt).filter(Boolean);
  if (line.length < 4) { stubs++; continue; }
  /* A dot-sized line is a placeholder, not a partial track — the gate audit:waypoints already
     carries. Judging pins against it manufactures huge distances from nothing. */
  let mnLa = 90, mxLa = -90, mnLn = 180, mxLn = -180;
  for (const q of line) { mnLa = Math.min(mnLa, q.lat); mxLa = Math.max(mxLa, q.lat); mnLn = Math.min(mnLn, q.lng); mxLn = Math.max(mxLn, q.lng); }
  if (hvM({ lat: mnLa, lng: mnLn }, { lat: mxLa, lng: mxLn }) < 500) { stubs++; continue; }
  if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) { synthetic++; continue; }
  judged++;

  const wps = (r.waypoints || []).filter((w) => w && w.lat != null && Number.isFinite(Number(w.lat)));
  const th = wps.find((w) => /trailhead/i.test(String(w.type)));
  const sum = wps.find((w) => /summit|topout/i.test(String(w.type)));
  if (th) thDist.push(nearest({ lat: Number(th.lat), lng: Number(th.lng) }, line)); else noTh++;
  if (sum) sumDist.push(nearest({ lat: Number(sum.lat), lng: Number(sum.lng) }, line)); else noSum++;
}

console.log(`\n=== how much of the route does the drawn line cover? ===`);
console.log(`${rows.length} WA routes with both a track and waypoints`);
console.log(`  ${stubs} placeholder/stub tracks skipped · ${synthetic} synthetic (already captioned) · ${judged} judged`);
console.log(`  of the judged: ${noTh} have no Trailhead pin, ${noSum} have no Summit/Topout pin — those can say nothing\n`);

for (const [label, arr] of [["TRAILHEAD pin -> nearest track point", thDist], ["SUMMIT pin -> nearest track point", sumDist]]) {
  console.log(`--- ${label}  (n=${arr.length}) ---`);
  for (const p of [0.5, 0.75, 0.9, 0.95, 0.99]) console.log(`     p${String(p * 100).padStart(2)}: ${Math.round(pct(arr, p))} m`);
  console.log(`     max: ${Math.round(Math.max(...arr))} m`);
  for (const t of [200, 500, 1000, 2000, 5000]) console.log(`     over ${String(t).padStart(4)} m: ${arr.filter((d) => d > t).length}  (${(100 * arr.filter((d) => d > t).length / arr.length).toFixed(1)}%)`);
  console.log("");
}
