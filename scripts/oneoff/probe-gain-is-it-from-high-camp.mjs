// Before reporting 112 routes as storing an impossible gain, kill the obvious alternative:
// maybe `gain_ft` is measured FROM HIGH CAMP on multi-day routes rather than from the trailhead.
//
// The suspicion is concrete. wa_mount_rainier_tahoma_glacier stores 5,007 ft against a
// trailhead→summit rise of 11,506 ft, and 14,406 − 5,007 = 9,399 ft, which is a plausible high
// camp on that route. If gain_ft consistently equals (summit − some camp on the route), it is a
// convention and the audit is wrong; if the implied elevation matches nothing the row records,
// the number is simply too small.
//
// This is the `dist_km` lesson one column over — that field holds one-way and half-round-trip
// values at once, and CLAUDE.md says never to normalise it in bulk for exactly this reason.
//
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const elevFt = (w) => {
  const ft = num(w.elev != null ? w.elev : (w.elevFt != null ? w.elevFt : w.elev_ft));
  if (ft != null) return ft;
  const m = num(w.elevM != null ? w.elevM : w.elev_m);
  return m == null ? null : m * 3.28084;
};

async function readAll() {
  const sel = "id,name,discipline,gain_ft,dist_km,waypoints";
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=like.wa_*&waypoints=not.is.null&gain_ft=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
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

const SLACK = 300;
/* For each short route: what elevation would the party have had to START at for the stored gain
   to be right, and does the row record a waypoint at that height? */
const TOL = 400;   // a camp elevation and a published gain are both round numbers
let short = 0, explained = 0, unexplained = 0;
const rowsOut = [];
for (const r of rows) {
  const wps = (r.waypoints || []).filter(Boolean);
  const we = wps.map((w) => ({ w, ft: elevFt(w) })).filter((x) => x.ft != null);
  if (we.length < 2) continue;
  const th = we.find((x) => /trailhead/i.test(String(x.w.type || "")));
  const sum = we.find((x) => /summit|topout/i.test(String(x.w.type || "")));
  let lo, hi;
  if (th && sum && sum.ft > th.ft) { lo = th; hi = sum; }
  else { lo = we.reduce((a, b) => (b.ft < a.ft ? b : a)); hi = we.reduce((a, b) => (b.ft > a.ft ? b : a)); }
  const rise = hi.ft - lo.ft;
  const gain = num(r.gain_ft);
  if (rise <= 0 || gain == null || gain >= rise - SLACK) continue;
  short++;

  const impliedStart = hi.ft - gain;
  /* Any waypoint at that height would do — a camp, a col, a junction. The claim being tested is
     "the gain is measured from somewhere the route records", not specifically from a camp. */
  const match = we
    .map((x) => ({ x, d: Math.abs(x.ft - impliedStart) }))
    .filter((m) => m.d <= TOL && m.x.ft > lo.ft + SLACK)
    .sort((a, b) => a.d - b.d)[0];
  const rec = {
    id: r.id, gain, rise: Math.round(rise), impliedStart: Math.round(impliedStart),
    from: `${lo.w.name} ${Math.round(lo.ft)}ft`, to: `${hi.w.name} ${Math.round(hi.ft)}ft`,
    match: match ? `${match.x.w.type}/${match.x.w.name} @ ${Math.round(match.x.ft)}ft (${Math.round(match.d)} ft off)` : null,
  };
  if (match) { explained++; } else { unexplained++; }
  rowsOut.push(rec);
}

console.log(`\n=== is a too-small gain_ft actually "gain from high camp"? ===`);
console.log(`${short} routes store a gain below their own net rise\n`);
console.log(`  ${explained} have a waypoint at the elevation the stored gain implies  <- would be a CONVENTION, not an error`);
console.log(`  ${unexplained} have NO waypoint at that elevation                      <- the number is simply too small\n`);
console.log(`--- explained by an intermediate waypoint (first 12) ---`);
for (const r of rowsOut.filter((x) => x.match).slice(0, 12))
  console.log(`  ${r.id.padEnd(46)} gain ${String(r.gain).padStart(5)}  implies start @ ${String(r.impliedStart).padStart(5)}ft  -> ${r.match}`);
console.log(`\n--- NOT explained (first 12) ---`);
for (const r of rowsOut.filter((x) => !x.match).slice(0, 12))
  console.log(`  ${r.id.padEnd(46)} gain ${String(r.gain).padStart(5)}  implies start @ ${String(r.impliedStart).padStart(5)}ft  but the row records nothing there\n        ${r.from}  ->  ${r.to}`);
