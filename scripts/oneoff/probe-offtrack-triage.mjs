// Triage the off-track pin backlog BEFORE spending research on it.
//
// audit:waypoint-track already separates PARTIAL TRACK ("the gpx covers only the climb, so
// approach pins sit off it legitimately — NOT a defect") from PIN. My transcription probe did
// not: it counted every off-track pin, so its 629 mixes real defects with pins that are off a
// line which was never supposed to reach them. Researching those would be pure waste.
//
// The discriminator is the TRACK's own coverage, not the pin. If the recorded line does not
// start anywhere near the trailhead, it is a climb-only track, and every pin whose distMi
// places it in the uncovered approach is excused. What remains — a pin off a track that DOES
// cover its stretch of the journey — is the list worth sourcing.
//
// Read-only. Prints a worklist, changes nothing.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const LIMIT = Number(arg("--limit", 200));
const JSON_OUT = argv.includes("--json");

const k = anonKey();
const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const pt = (p) => Array.isArray(p) ? { lat: Number(p[0]), lng: Number(p[1]) } : (p && p.lat != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null);
const nearest = (p, track) => { let b = Infinity; for (const q of track) { const d = hvM(p, q); if (d < b) b = d; } return b; };
const TOL = { Trailhead: 120, Summit: 120, Junction: 120, Topout: 120, Water: 400, Campsite: 500, Hazard: 600, Bailout: 2000 };
const tolOf = (t) => TOL[t] ?? 250;
const isTh = (w) => /trailhead/i.test(String((w && w.type) || ""));

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&waypoints=not.is.null&gpx=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
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

let real = 0, partialRoutes = 0, excused = 0, suspectPins = 0;
const suspectTrack = new Set();
const work = [];
for (const r of rows) {
  const track = (Array.isArray(r.gpx) ? r.gpx : []).map(pt).filter(Boolean);
  if (track.length < 4) continue;
  let mnLa = 90, mxLa = -90, mnLn = 180, mxLn = -180;
  for (const q of track) { mnLa = Math.min(mnLa, q.lat); mxLa = Math.max(mxLa, q.lat); mnLn = Math.min(mnLn, q.lng); mxLn = Math.max(mxLn, q.lng); }
  if (hvM({ lat: mnLa, lng: mnLn }, { lat: mxLa, lng: mxLn }) < 500) continue;
  if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) continue;
  real++;

  const wps = (r.waypoints || []).filter((w) => w && w.lat != null && w.lng != null && Number.isFinite(Number(w.lat)));
  const thPin = wps.find(isTh);
  /* A climb-only track: the recorded line never comes near the trailhead. Every pin in the
     approach is then off it BY DESIGN, and the honest reading is that the track is short,
     not that the pins are wrong. */
  const thOff = thPin ? nearest({ lat: Number(thPin.lat), lng: Number(thPin.lng) }, track) : null;
  const partial = thOff != null && thOff > 2000;
  if (partial) partialRoutes++;
  /* Where the track's coverage begins, in this route's own mileage terms: the smallest distMi
     among pins that ARE on the line. A pin earlier than that is inside the uncovered stretch. */
  let coverFrom = Infinity;
  for (const w of wps) {
    if (w.distMi == null) continue;
    if (nearest({ lat: Number(w.lat), lng: Number(w.lng) }, track) <= tolOf(String(w.type))) coverFrom = Math.min(coverFrom, Number(w.distMi));
  }

  /* When the track does not reach this route's OWN summit pin, the line is the suspect
     record and the pins are not. audit:waypoints already carries this as "TRACK NEVER COMES
     WITHIN 2 km OF THE PEAK", and it is why the worst of this worklist was dominated by six
     routes from that list — researching their pins would be researching the wrong half. Such
     a route needs its gpx fixed or dropped, which is one decision per route rather than a
     source per pin, so it is counted separately and never enters the sourcing list. */
  const sumPin = wps.find((w) => /summit|topout/i.test(String(w.type)));
  const trackMissesPeak = sumPin && nearest({ lat: Number(sumPin.lat), lng: Number(sumPin.lng) }, track) > 2000;
  if (trackMissesPeak) { suspectTrack.add(r.id); }

  for (const w of wps) {
    const p = { lat: Number(w.lat), lng: Number(w.lng) };
    const tol = tolOf(String(w.type));
    const d = nearest(p, track);
    if (d <= tol) continue;
    if (trackMissesPeak) { suspectPins++; continue; }
    const before = w.distMi != null && Number.isFinite(coverFrom) && Number(w.distMi) < coverFrom;
    if (partial && (before || isTh(w))) { excused++; continue; }
    work.push({ id: r.id, route: r.name, wp: w.name, type: w.type, off: Math.round(d), tol, ratio: +(d / tol).toFixed(1), partial });
  }
}

work.sort((a, b) => b.ratio - a.ratio);
if (JSON_OUT) { console.log(JSON.stringify(work, null, 1)); process.exit(0); }

console.log(`\n=== off-track pin triage ===`);
console.log(`${real} routes with a real recorded track · ${partialRoutes} of them carry a CLIMB-ONLY track`);
console.log(`${suspectTrack.size} route(s) have a track that never reaches their own summit pin — the TRACK is the suspect record there, ${suspectPins} pin(s) set aside`);
console.log(`${excused} pin(s) excused: off a line that was never recorded over their stretch of the journey`);
console.log(`${work.length} pin(s) genuinely off a track that DOES cover them — this is the list worth sourcing\n`);
const bad = work.filter((w) => w.ratio >= 20), mid = work.filter((w) => w.ratio >= 5 && w.ratio < 20);
console.log(`  over 20x tolerance: ${bad.length}    5-20x: ${mid.length}    under 5x: ${work.length - bad.length - mid.length}`);
console.log(`\n--- worst first ---`);
for (const w of work.slice(0, LIMIT)) console.log(`  ${String(w.ratio).padStart(6)}x  ${w.id.padEnd(44)} [${String(w.type).padEnd(9)}] ${String(w.wp).slice(0, 46)}  (${w.off} m, tol ${w.tol})`);
console.log(`\nTriage only — nothing was changed.`);
