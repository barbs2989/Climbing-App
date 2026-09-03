// Three named points that two routes place kilometres apart, settled by the ground rather than by
// a vote. `audit:cross-route-pins` reports the split and deliberately refuses to say which row is
// wrong, because a majority can be one enrichment pass counted many times — for "Lake Constance"
// the ground fits the OUTLIER better than the four agreeing pins.
//
// So the adjudicator (adjudicate-cross-route-pin-splits.mjs) asks the USGS 3DEP ground what is
// under each cluster, and compares it against the elevation the pin ITSELF states. A pin whose
// own two numbers contradict each other by thousands of feet is wrong whichever way you read it:
//
//   "Sahale-Boston col"   wa_buckner_mountain_north_face      states 8,600 ft, ground 4,927 ft
//                         wa_boston_peak_southeast_face       states 8,200 ft, ground 8,147 ft
//   "Luna Col"            wa_ridge_traverse_from_east_fury    states 6,700 ft, ground 4,594 ft
//                         wa_mount_fury_west_west_ridge       states 7,200 ft, ground 7,190 ft
//   "Mary's Falls Camp"   wa_mount_dana_scramble              states 1,000 ft, ground 2,545 ft
//                         wa_mount_norton_scramble            states 1,345 ft, ground 2,802 ft
//                         wa_mount_wilder_scramble            states 1,296 ft, ground 1,247 ft
//
// AND THE PHYSICS AGREES WITH THE ARITHMETIC, which is what makes these three safe rather than
// merely lopsided. A col between Sahale (8,680 ft) and Boston (8,894 ft) cannot be at 4,927 ft.
// Luna Col in the Pickets cannot be at 4,594 ft. Mary's Falls Camp is a river camp on the Elwha,
// and two pins put it on hillsides 1,300-1,500 ft above the water while claiming river elevations.
// The surviving pin in each case matches its own ground to 10, 49 and 53 feet.
//
// TWO MORE LEAN THE SAME WAY AND ARE DELIBERATELY LEFT, because a verdict at the boundary is not
// a verdict:
//
//   "Ouzel Lake"             ground is 5,665 and 5,660 ft under the TWO clusters — the terrain
//                            cannot tell those places apart at all, only that one pin's stated
//                            6,100 ft is wrong. Which half is wrong is undecided.
//   "Spider-Formidable Col"  360 ft off versus 666 ft off. That is a difference in degree inside
//                            the instrument's own noise on steep ground, not a separation.
//
// DECLARE A DONOR ROW, NEVER A COORDINATE. Every value written is read off the donor pin at run
// time, so nothing can be invented and a repair needing a THIRD position cannot be expressed. The
// declared current state of every pin is re-asserted first, so a row that has moved refuses.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const FIXES = [
  {
    name: "Sahale-Boston col",
    donor: { id: "wa_boston_peak_southeast_face", lat: 48.4935, lng: -121.04, ground: 8147 },
    wrong: [{ id: "wa_buckner_mountain_north_face", lat: 48.4627, lng: -121.0463, ground: 4927 }],
    why: "a col between Sahale (8,680 ft) and Boston (8,894 ft) cannot sit on ground at 4,927 ft",
  },
  {
    name: "Luna Col",
    donor: { id: "wa_mount_fury_west_west_ridge", lat: 48.8237, lng: -121.2764, ground: 7190 },
    wrong: [{ id: "wa_ridge_traverse_from_east_fury", lat: 48.805, lng: -121.28, ground: 4594 }],
    why: "the pin states 6,700 ft and stands on 4,594 ft, 2.1 km from a col the donor pin matches to 10 ft",
  },
  {
    name: "Mary's Falls Camp",
    donor: { id: "wa_mount_wilder_scramble", lat: 47.9023, lng: -123.4903, ground: 1247 },
    wrong: [
      { id: "wa_mount_dana_scramble", lat: 47.8874, lng: -123.564, ground: 2545 },
      { id: "wa_mount_norton_scramble", lat: 47.9082, lng: -123.5136, ground: 2802 },
    ],
    why: "a river camp on the Elwha; both wrong pins claim river elevations while standing 1,300-1,500 ft above the water",
  },
];

const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-3;
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const IDS = FIXES.flatMap((f) => [f.donor.id, ...f.wrong.map((w) => w.id)]);
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,waypoints`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const pinOf = (id, name) => {
  const wps = byId.get(id).waypoints;
  if (!Array.isArray(wps)) return { err: `${id}: waypoints is not an array` };
  const hits = wps.map((w, i) => ({ w, i })).filter(({ w }) => String((w || {}).name || "").trim() === name);
  if (hits.length !== 1) return { err: `${id}: expected exactly 1 pin named "${name}", found ${hits.length}` };
  return hits[0];
};

const staged = [];
const refusals = [];
for (const f of FIXES) {
  const d = pinOf(f.donor.id, f.name);
  if (d.err) { refusals.push(d.err); continue; }
  const dlat = num(d.w.lat), dlng = num(d.w.lng);
  if (!near(dlat, f.donor.lat) || !near(dlng, f.donor.lng)) {
    refusals.push(`${f.donor.id}: donor pin has moved (now ${dlat},${dlng}, expected ${f.donor.lat},${f.donor.lng})`); continue;
  }
  for (const w of f.wrong) {
    const p = pinOf(w.id, f.name);
    if (p.err) { refusals.push(p.err); continue; }
    const plat = num(p.w.lat), plng = num(p.w.lng);
    if (!near(plat, w.lat) || !near(plng, w.lng)) {
      refusals.push(`${w.id}: pin has moved (now ${plat},${plng}, expected ${w.lat},${w.lng})`); continue;
    }
    // Everything written comes off the DONOR pin. Only position and height move; the type, the
    // note, the mileage and anything else this waypoint carries are the recipient route's own.
    const next = byId.get(w.id).waypoints.slice();
    next[p.i] = Object.assign({}, p.w, { lat: d.w.lat, lng: d.w.lng });
    if (d.w.elev != null) next[p.i].elev = d.w.elev;
    staged.push({ name: f.name, why: f.why, id: w.id, from: `${plat},${plng}`, to: `${dlat},${dlng}`,
      moved: D(plat, plng, dlat, dlng), wasElev: num(p.w.elev), nowElev: num(d.w.elev), next });
  }
}

if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  "));
  process.exit(1);
}
if (!staged.length) { console.error("REFUSED - nothing staged"); process.exit(1); }

for (const s of staged) {
  console.log(`\n### ${s.id}   pin "${s.name}"`);
  console.log(`   why: ${s.why}`);
  console.log(`   ${s.from}  ->  ${s.to}   (${(s.moved / 1000).toFixed(1)} km)`);
  console.log(`   elev ${s.wasElev} ft -> ${s.nowElev} ft   (from the donor pin, not typed here)`);
}
console.log(`\n${staged.length} pin(s) on ${new Set(staged.map((s) => s.id)).size} route(s), across ${FIXES.length} named point(s).`);
console.log(`2 further splits LEFT: "Ouzel Lake" (the ground is the same under both) and "Spider-Formidable Col" (360 ft vs 666 ft is not a separation).`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

for (const s of staged) await patchRow("routes", s.id, { waypoints: s.next });
console.log(`\nwrote ${staged.length} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const f of FIXES) {
  const d = (after.get(f.donor.id).waypoints || []).find((w) => String((w || {}).name || "").trim() === f.name);
  if (!d) { console.error(`DONOR PIN LOST: ${f.donor.id} "${f.name}"`); bad++; continue; }
  for (const w of f.wrong) {
    const wps = after.get(w.id).waypoints || [];
    const p = wps.find((x) => String((x || {}).name || "").trim() === f.name);
    if (!p) { console.error(`PIN LOST: ${w.id} no longer carries "${f.name}"`); bad++; continue; }
    const dist = D(num(p.lat), num(p.lng), num(d.lat), num(d.lng));
    if (!(dist < 1)) { console.error(`NOT APPLIED: ${w.id} "${f.name}" still ${Math.round(dist)} m from the donor`); bad++; }
    // A repair that quietly dropped the rest of the route's pins would be far worse than the split.
    const before = (byId.get(w.id).waypoints || []).length;
    if (wps.length !== before) { console.error(`WAYPOINTS LOST: ${w.id} had ${before}, now ${wps.length}`); bad++; }
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: every moved pin sits on its donor, and no route lost a waypoint.`);
process.exit(bad ? 1 : 0);
