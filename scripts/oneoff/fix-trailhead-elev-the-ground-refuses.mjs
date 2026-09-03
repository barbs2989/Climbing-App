// One trailhead, two routes, two elevations — and the ground admits only one.
//
// wa_lichtenberg_mountain_se_route and wa_lichtenberg_mountain_west_face_west_rib both pin the
// Smithbrook Trailhead, at coordinates 15 m apart. One stores 3,800 ft and the other 4,000 ft.
//
// THE TERRAIN SETTLES IT, and it was measured rather than assumed. USGS 3DEP directly under the two
// pins reads 3,981 and 3,983 ft. Sampling a ~120 m box around the SE row's pin gives
// 3,970 / 3,973 / 3,981 / 3,991 / 3,999 / 4,007 / 4,139 / 4,163 / 4,204 ft:
//     4,000 ft is INSIDE that box
//     3,800 ft is 170 ft OUTSIDE it
// The box is what makes this decidable rather than a threshold call — audit:cross-route-pins' flat rule
// wants the replaced value 300 ft clear of the ground, and 181 ft would not have reached it. Letting the
// TERRAIN set the tolerance, which is what audit:waypoint-elevations --ground exists for, gives a clean
// verdict on a road bench this flat: the ground varies 2 ft between the two pins.
//
// THE VALUE IS THE SIBLING'S, read off the catalog at apply time, so nothing is typed. It is
// independently corroborated twice over: the ground, and the Forest Service's own Smithbrook page.
//
// A CONSEQUENCE, REPORTED AND DELIBERATELY NOT FOLLOWED. The SE row's gain_ft of 2,044 is exactly its
// summit (5,844) minus the wrong trailhead, so it inherits the error. Raising the trailhead makes the
// rise 1,844 and leaves gain_ft 200 ft ABOVE it — which is allowed, since a route rolls over bumps its
// endpoints cannot see, and gain is a floor rather than an equality. Rewriting gain_ft would mean
// deriving a number rather than copying one, so it stays. Its sibling stores 2,000 for the same peak.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_lichtenberg_mountain_se_route";
const DONOR = "wa_lichtenberg_mountain_west_face_west_rib";
const PIN = /smithbrook/i;
const NEAR_M = 60;                 // the two pins must be the same point
const rad = x => x * Math.PI / 180;
const km = (a, b) => { const R = 6371, dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const el = w => { const e = Number(w.elev ?? w.elevFt); return Number.isFinite(e) && e > 0 ? e : null; };

const rows = await selectAll("routes", "id,waypoints", `id=in.(${TARGET},${DONOR})`, { pageSize: 10 });
const t = rows.find(x => x.id === TARGET), d = rows.find(x => x.id === DONOR);
if (!t || !d) { console.error("target or donor row not found — refusing"); process.exit(1); }
const ti = (t.waypoints || []).findIndex(w => PIN.test(String(w.name || "")));
const dw = (d.waypoints || []).find(w => PIN.test(String(w.name || "")));
if (ti < 0 || !dw) { console.error("the Smithbrook pin is missing from one of the rows — refusing"); process.exit(1); }
const tw = t.waypoints[ti];
const cur = el(tw), don = el(dw);
if (!cur || !don) { console.error("one of the pins has no elevation — refusing"); process.exit(1); }
if (cur === don) { console.log("nothing to do — the two already agree."); process.exit(0); }

const apart = km([+tw.lat, +tw.lng], [+dw.lat, +dw.lng]) * 1000;
console.log(`the two Smithbrook pins are ${apart.toFixed(0)} m apart`);
if (apart > NEAR_M) { console.error(`REFUSING: ${apart.toFixed(0)} m apart is not the same point`); process.exit(1); }

// re-measure the ground box at apply time rather than trusting a recorded number
const D = 0.0011, vals = [];
for (const dy of [-D, 0, D]) for (const dx of [-D, 0, D]) {
  try {
    const j = await (await fetch(`https://epqs.nationalmap.gov/v1/json?x=${+tw.lng + dx}&y=${+tw.lat + dy}&units=Feet&wkid=4326`, { headers: { "User-Agent": "Mozilla/5.0" } })).json();
    const v = Number(j.value); if (Number.isFinite(v)) vals.push(v);
  } catch { /* ignore */ }
}
if (vals.length < 5) { console.error("could not read enough ground samples — refusing"); process.exit(1); }
vals.sort((a, b) => a - b);
const lo = vals[0], hi = vals[vals.length - 1];
console.log(`3DEP box around the pin: ${lo.toFixed(0)} .. ${hi.toFixed(0)} ft  (${vals.length} samples)`);
const inside = v => v >= lo && v <= hi;
if (!inside(don)) { console.error(`REFUSING: the donor value ${don} is not inside the ground box`); process.exit(1); }
if (inside(cur)) { console.error(`REFUSING: the stored value ${cur} is ALSO inside the ground box — the terrain does not discriminate`); process.exit(1); }
console.log(`  stored ${cur} ft: outside by ${Math.min(Math.abs(cur - lo), Math.abs(cur - hi)).toFixed(0)} ft`);
console.log(`  donor  ${don} ft: inside`);

console.log(`\n  ${TARGET} waypoint[${ti}] "${tw.name}"   elev ${cur} -> ${don}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const next = t.waypoints.map((w, i) => i !== ti ? w : { ...w, ...(w.elev != null ? { elev: don } : {}), ...(w.elevFt != null ? { elevFt: don } : {}) });
await patchRow("routes", TARGET, { waypoints: next });
const a = (await selectAll("routes", "id,waypoints", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
const now = el((a.waypoints || [])[ti]);
console.log(now === don
  ? `verified: the Smithbrook pin now reads ${now} ft, inside the ground and matching the sibling route at the same coordinate`
  : `NOT APPLIED — reads ${now}`);
