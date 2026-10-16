// Does bivy[].elev hold FEET on every row, or does it hold two conventions the way dist_km and
// gain_ft already do? Mount Fury's Luna Col is stored as 2195 in a column read as feet; the real
// col is about 6,300 ft, and 2195 METRES is 7,201 ft. One row proves nothing either way, so this
// asks the whole catalog.
//
// It matters beyond the elevation itself: the camping panel now derives GAIN by subtracting the
// trailhead elevation, so a metres value in a feet column does not merely render one wrong
// number, it renders a wrong number that looks like arithmetic.
//
// The test uses the route's own high_point_ft as an independent yardstick. A camp cannot be above
// the summit, and a camp on an 8,000 ft peak is rarely below 1,500 ft — so a value that is
// implausible AS FEET but plausible AS METRES is the fingerprint.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,bivy,waypoints,high_point_ft&bivy=not.is.null&limit=1000`, { headers: H });
if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const isTh = (w) => /trailhead/i.test(String((w && w.type) || ""));

let n = 0, plainFeet = 0, metresLike = 0, ambiguous = 0, noYardstick = 0;
const suspects = [];
const vals = [];

for (const row of rows) {
  const hp = has(row.high_point_ft) ? Number(row.high_point_ft) : null;
  const th = arr(row.waypoints).find(isTh);
  const thFt = th && has(th.elev) ? Number(th.elev) : null;
  for (const b of arr(row.bivy)) {
    if (!has(b.elev)) continue;
    n++;
    const v = Number(b.elev);
    vals.push(v);
    if (hp == null) { noYardstick++; continue; }
    const asFt = v, asM = v * 3.28084;
    // Plausible as feet: at or below the summit, and not absurdly low for the peak.
    const feetOk = asFt <= hp + 200 && asFt >= Math.min(500, hp * 0.1);
    // Plausible as metres: the converted value sits below the summit and above the valley.
    const metreOk = asM <= hp + 200 && asM >= hp * 0.25;
    if (feetOk && !metreOk) plainFeet++;
    else if (metreOk && !feetOk) {
      metresLike++;
      if (suspects.length < 12) suspects.push(`${row.id}  "${String(b.name || "").slice(0, 44)}"  stored ${v}  peak ${hp} ft  -> as metres ${Math.round(asM)} ft`);
    } else ambiguous++;
  }
}
vals.sort((a, b) => a - b);
const pct = (p) => (vals.length ? Math.round(vals[Math.floor((vals.length - 1) * p)]) : 0);

console.log(`== bivy[].elev values: ${n}\n`);
console.log(`   p05 ${String(pct(0.05)).padStart(6)}`);
console.log(`   p50 ${String(pct(0.5)).padStart(6)}`);
console.log(`   p95 ${String(pct(0.95)).padStart(6)}`);
console.log(`\n   plausible as FEET only    : ${plainFeet}`);
console.log(`   plausible as METRES only  : ${metresLike}   <- a second convention, if nonzero`);
console.log(`   plausible either way      : ${ambiguous}`);
console.log(`   no high_point to judge by : ${noYardstick}`);
if (suspects.length) { console.log(`\n   metres-like examples:`); suspects.forEach((x) => console.log(`      ${x}`)); }
console.log(metresLike === 0
  ? `\n   -> ONE convention. elev is feet, and the derived gain rests on a sound column.`
  : `\n   -> ${metresLike} value(s) read as metres. The derived gain would be wrong on those rows.`);
