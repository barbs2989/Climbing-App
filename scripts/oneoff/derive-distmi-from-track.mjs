// Derive `distMi` for a route's waypoints by projecting them onto the route's own gpx track.
//
// WHY THIS IS SAFE TO EXPRESS. Three gates, each measured rather than chosen, and a route must
// pass all three or it is refused whole — never partially filled, because orderWaypoints needs
// EVERY pin to carry a distance and a half-filled route is still unsortable while now also
// carrying derived numbers nobody can distinguish from researched ones.
//
//   1. GENUINE TRACK. 201 of 580 WA gpx tracks are the waypoint list joined up
//      (lib/track.js). On those, distance-along-track reproduces the stored pin order by
//      construction — it would confirm whatever is there and fix nothing. Refused.
//
//   2. EVERY PIN WITHIN 100 m OF THE LINE. Measured across 2,098 pins on 376 routes with a
//      genuine track: median 30 m, but p90 1.6 km and max 23 km. A pin far off the line snaps
//      to whichever segment happens to be nearest and yields a confident WRONG distance, which
//      produces a wrong ORDER — worse than no order at all. 100 m is where the distribution
//      breaks: 50 m qualifies 14 routes, 100 m qualifies 22, and 200 m only adds 5 more while
//      admitting pins that are plainly not on the track.
//
//   3. THE TRACK RUNS TRAILHEAD -> SUMMIT. A descent-direction or reversed track inverts every
//      derived distance and so inverts the order. Checked by requiring the track's first point
//      to be nearer the Trailhead pin than the Summit pin, and its last point the reverse.
//
// It writes ONLY `distMi`, and only onto pins that lack one — an existing researched value is
// never overwritten. Each derived pin is stamped `distFrom: "track"` so a later audit can tell
// a computed distance from a researched one; that distinction is invisible otherwise, and this
// column already holds both kinds.
//
//   node scripts/oneoff/derive-distmi-from-track.mjs [--state wa] [--gate 100] [--apply] [--list 20]
import { SUPABASE_URL, headers, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";
import { dedupeWaypoints, orderWaypoints } from "../../lib/waypoints.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const GATE = +arg("--gate", 100);
const LIST = +arg("--list", 20);
const APPLY = argv.includes("--apply");
const ONLY = argv.filter(a => a.startsWith("wa_") || a.startsWith("id_"));

// requireServiceKey throws rather than degrading: PostgREST answers an anon PATCH with 200 and
// an empty array, so an RLS rejection would read as success.
const key = APPLY ? requireServiceKey() : (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

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

const R = 6371008.8;
const toXY = ([la, ln], lat0) => [R * (ln * Math.PI / 180) * Math.cos(lat0 * Math.PI / 180), R * (la * Math.PI / 180)];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function project(p, xy, cum) {
  let best = { d: Infinity, along: 0 };
  for (let i = 0; i + 1 < xy.length; i++) {
    const a = xy[i], b = xy[i + 1];
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const len2 = vx * vx + vy * vy;
    const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2)) : 0;
    const cx = a[0] + t * vx, cy = a[1] + t * vy;
    const d = Math.hypot(p[0] - cx, p[1] - cy);
    if (d < best.d) best = { d, along: cum[i] + t * Math.sqrt(len2) };
  }
  return best;
}

const isSummit = w => /summit|topout|top out|high ?point/i.test(String(w.type || ""));
const isTrailhead = w => /trailhead|parking|car/i.test(String(w.type || ""));

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,waypoints,gpx` +
    `&waypoints=not.is.null&gpx=not.is.null` + (STATE ? `&id=like.${STATE}_*` : "") +
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

const refused = new Map();
const bump = k => refused.set(k, (refused.get(k) || 0) + 1);
const plans = [];

for (const r of rows) {
  if (ONLY.length && !ONLY.includes(r.id)) continue;
  const wps = dedupeWaypoints(Array.isArray(r.waypoints) ? r.waypoints : []);
  if (wps.length < 2) { bump("fewer than 2 pins"); continue; }
  if (wps.every(w => num(w.distMi) != null)) { bump("already complete"); continue; }

  const line = lineOf(r.gpx);
  if (line.length < 2) { bump("no usable track"); continue; }
  const pins = wps.map(coordOf);
  if (pins.some(p => !p)) { bump("a pin has no coordinate"); continue; }
  if (trackIsJustTheWaypoints(line, pins.filter(Boolean))) { bump("track IS the pins — circular"); continue; }

  const lat0 = line[0][0];
  const xy = line.map(c => toXY(c, lat0));
  const cum = [0];
  for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + dist(xy[i - 1], xy[i]));
  const total = cum[cum.length - 1];
  if (total < 200) { bump("track shorter than 200 m"); continue; }

  const proj = wps.map((w, i) => ({ w, i, ...project(toXY(pins[i], lat0), xy, cum) }));
  const worst = Math.max(...proj.map(p => p.d));
  if (worst > GATE) { bump(`a pin is more than ${GATE} m off the track`); continue; }

  // Orientation. A reversed or descent-direction track inverts every derived distance, so the
  // order would invert with it — the one failure that looks like a successful fix.
  const th = proj.find(p => isTrailhead(p.w)), su = proj.find(p => isSummit(p.w));
  if (!th || !su) { bump("no trailhead/summit pin to orient the track"); continue; }
  if (!(th.along < su.along)) { bump("track runs summit -> trailhead (reversed)"); continue; }

  const M_PER_MI = 1609.344;
  const next = wps.map((w, i) => {
    if (num(w.distMi) != null) return w;                       // never overwrite a researched value
    return { ...w, distMi: Math.round((proj[i].along / M_PER_MI) * 100) / 100, distFrom: "track" };
  });

  const beforeOrder = wps.map(w => w.type || "?").join(",");
  const afterOrder = orderWaypoints(next).map(w => w.type || "?").join(",");
  plans.push({ id: r.id, name: r.name, worst, derived: next.filter((w, i) => num(wps[i].distMi) == null).length,
    pins: wps.length, beforeOrder, afterOrder, changed: beforeOrder !== afterOrder, next });
}

console.log(`${rows.length} ${STATE} routes read; ${plans.length} pass all three gates at ${GATE} m\n`);
for (const [why, n] of [...refused].sort((a, b) => b[1] - a[1])) console.log(`  refused ${String(n).padStart(4)}  ${why}`);

console.log(`\n${plans.filter(p => p.changed).length} of the ${plans.length} would RENDER in a different order afterwards:`);
for (const p of plans.slice(0, LIST)) {
  console.log(`\n  ${p.id} — ${p.name}`);
  console.log(`    worst pin ${Math.round(p.worst)} m off the track; ${p.derived} of ${p.pins} distances derived`);
  console.log(`    order now:   ${p.beforeOrder}`);
  console.log(`    order after: ${p.afterOrder}${p.changed ? "" : "   (unchanged)"}`);
}
if (plans.length > LIST) console.log(`\n  … ${plans.length - LIST} more (raise --list)`);

if (!APPLY) { console.log(`\ndry run — re-run with --apply to write.`); process.exit(0); }

let applied = 0;
for (const p of plans) { await patchRow("routes", p.id, { waypoints: p.next }); applied++; }

const back = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${plans.map(p => p.id).join(",")})`, { headers: headers(key) });
if (!back.ok) throw new Error(`verify read -> ${back.status}`);
const after = JSON.parse(await back.text());
let verified = 0;
for (const p of plans) {
  const got = (after.find(x => x.id === p.id) || {}).waypoints || [];
  if (got.length === p.next.length && got.every(w => num(w.distMi) != null)) verified++;
  else console.log(`MISMATCH ${p.id}`);
}
console.log(`\napplied ${applied}, verified ${verified} of ${plans.length}`);
process.exit(verified === plans.length ? 0 : 1);
