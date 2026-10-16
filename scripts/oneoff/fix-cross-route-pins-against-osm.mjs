// Four named points the catalog places kilometres apart, settled by OPENSTREETMAP — a record that
// descends from neither pin. The ground could not separate these (both clusters usually sit on
// plausible terrain) and the federal gazetteer does not hold backcountry camp names, so this is
// the third instrument, asked by name and bounded to Washington:
//
//   OSM camp_site "Luna Camp, Big Beaver Trail"        4 m from the 2-pin cluster, 7,775 m from the outlier
//   OSM camp_site "Hannegan Camp, Hannegan Pass Trail" 919 m from one pin,          3,967 m from the outlier
//   OSM lake      "Ouzel Lake, Whatcom County"         4 m from one pin,            4,587 m from the outlier
//   OSM lake      "Heart Lake, Clallam County"        86 m from the 3-pin cluster,  4,148 m from the outlier
//
// Heart Lake is corroborated twice over: GNIS independently puts it 83 m from the same cluster, and
// OSM holds four other Heart Lakes in Washington — all 200 km+ away, so the Olympic one is not in
// doubt.
//
// AND EACH OUTLIER WAS CHECKED FOR THE OPPOSITE DEFECT FIRST. A pin in the right place under the
// wrong name wants a rename, not a move — #1523 renamed three of those. What separates these:
//
//   Luna Camp       states 2,500 ft, stands on 7,221 ft. Nothing named within 1.2 km. Its route's
//                   prose puts it on the Big Beaver Creek TRAIL, "around the 4.7-hour mark".
//   Hannegan Camp   states 4,680 ft, stands on 5,788 ft, 1,069 m from ICY PEAK'S SUMMIT. Its route
//                   walks Trail #674 to Hannegan Pass.
//   Ouzel Lake      states 6,100 ft, stands on 5,660 ft. Nothing named within 1.2 km. Its route
//                   calls the Ouzel Lake basin "the standard high camp" for Redoubt and Spickard.
//   Heart Lake      the only one internally consistent (3,465 stated, 3,460 ground) and 410 m from
//                   SOL DUC LAKE — so it looks like a misnaming. Its route's prose settles it the
//                   other way: "a camp at Heart Lake, staging for the cross-country push over High
//                   Divide". The route means Heart Lake, so the coordinate is what is wrong.
//
// THE PROSE IS THE ARBITER IN BOTH DIRECTIONS, and that is the same rule #1523 applied. There the
// three Mount Stuart routes described Longs Pass at length and never named Lake Ingalls, so the
// LABEL was wrong. Here Mount Ferry names Heart Lake and stages there, so the POSITION is wrong.
//
// HOGSBACK CAMP IS DELIBERATELY LEFT, and it was in this batch until the pin sets were read. OSM
// puts it 2 m from wa_colfax_peak_polish_route and 4,905 m from wa_colfax_peak_cosley_houston,
// which looks decisive — but BOTH routes' waypoint sequences are muddled: each places its
// "Climbers' Trail / Hogsback Ridge junction" at 48.7316, which is SOUTH of its own summit pin at
// 48.7716, and the Polish route's camp does not fit its own north-then-south ordering either.
// Neither row is a trustworthy donor, and a repair off a broken sequence is not a repair.
//
// DECLARE A DONOR ROW, NEVER A COORDINATE. Every value written is read off the donor pin at run
// time; OSM is what chose the donor, not what is written. So a repair needing a coordinate no
// route already holds cannot be expressed here at all.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const FIXES = [
  { name: "Luna Camp", osm: { lat: 48.83442, lng: -121.20174 },
    donor: "wa_mount_fury_west_west_ridge",
    wrong: { id: "wa_mount_fury_east_southeast_glaciers", lat: 48.8108, lng: -121.3017 },
    why: "states 2,500 ft and stands on 7,221 ft; its own prose puts it on the Big Beaver Creek Trail" },
  { name: "Hannegan Camp", osm: { lat: 48.88101, lng: -121.53814 },
    donor: "wa_ruth_mountain_south_slopes",
    wrong: { id: "wa_icy_peak_southwest_route", lat: 48.8455, lng: -121.533 },
    why: "states 4,680 ft, stands on 5,788 ft, and sits 1,069 m from Icy Peak's SUMMIT" },
  { name: "Ouzel Lake", osm: { lat: 48.9623, lng: -121.26324 },
    donor: "wa_mount_redoubt_south_face",
    wrong: { id: "wa_the_devils_club", lat: 48.98, lng: -121.32 },
    why: "4.6 km from the mapped lake; its own prose calls the Ouzel Lake basin the standard high camp" },
  { name: "Heart Lake", osm: { lat: 47.91048, lng: -123.73386 },
    donor: "wa_mount_carrie_standard",
    wrong: { id: "wa_mount_ferry_standard", lat: 47.93, lng: -123.7813 },
    why: "the route stages AT Heart Lake by its own prose, so the position is what is wrong - not the name" },
];

const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-3;
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const IDS = FIXES.flatMap((f) => [f.donor, f.wrong.id]);
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,waypoints`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const one = (id, name) => {
  const wps = byId.get(id).waypoints;
  if (!Array.isArray(wps)) return { err: `${id}: waypoints is not an array` };
  const hits = wps.map((w, i) => ({ w, i })).filter(({ w }) => String((w || {}).name || "").trim() === name);
  if (hits.length !== 1) return { err: `${id}: expected exactly 1 pin named "${name}", found ${hits.length}` };
  return hits[0];
};

const staged = [];
const refusals = [];
for (const f of FIXES) {
  const d = one(f.donor, f.name), p = one(f.wrong.id, f.name);
  if (d.err) { refusals.push(d.err); continue; }
  if (p.err) { refusals.push(p.err); continue; }
  const dlat = num(d.w.lat), dlng = num(d.w.lng), plat = num(p.w.lat), plng = num(p.w.lng);
  if (!near(plat, f.wrong.lat) || !near(plng, f.wrong.lng)) {
    refusals.push(`${f.wrong.id}: pin has moved (now ${plat},${plng}, expected ${f.wrong.lat},${f.wrong.lng})`); continue;
  }
  // THE DONOR MUST STILL BE THE ONE OSM PICKED. Without this the batch could quietly repair
  // toward a row that has since moved somewhere OSM never endorsed.
  const dOsm = D(dlat, dlng, f.osm.lat, f.osm.lng);
  if (!(dOsm < 1000)) { refusals.push(`${f.donor}: donor pin is ${Math.round(dOsm)} m from the OSM feature - no longer the corroborated one`); continue; }
  const wOsm = D(plat, plng, f.osm.lat, f.osm.lng);
  if (!(wOsm > 2000)) { refusals.push(`${f.wrong.id}: pin is only ${Math.round(wOsm)} m from the OSM feature - not the outlier this expects`); continue; }
  const next = byId.get(f.wrong.id).waypoints.slice();
  next[p.i] = Object.assign({}, p.w, { lat: d.w.lat, lng: d.w.lng });
  if (d.w.elev != null) next[p.i].elev = d.w.elev;
  staged.push({ f, next, moved: D(plat, plng, dlat, dlng), dOsm, wOsm,
    wasElev: num(p.w.elev), nowElev: num(d.w.elev), to: `${dlat},${dlng}` });
}

if (refusals.length) { console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  ")); process.exit(1); }
if (staged.length !== FIXES.length) { console.error("REFUSED - staged count does not match the table"); process.exit(1); }

for (const s of staged) {
  console.log(`\n### ${s.f.wrong.id}   pin "${s.f.name}"`);
  console.log(`   why: ${s.f.why}`);
  console.log(`   OSM is ${Math.round(s.dOsm)} m from the donor (${s.f.donor}) and ${Math.round(s.wOsm)} m from this pin`);
  console.log(`   ${s.f.wrong.lat},${s.f.wrong.lng}  ->  ${s.to}   (${(s.moved / 1000).toFixed(1)} km)`);
  console.log(`   elev ${s.wasElev} ft -> ${s.nowElev} ft   (from the donor pin, not typed here)`);
}
console.log(`\n${staged.length} pin(s) on ${staged.length} route(s).`);
console.log(`Hogsback Camp left alone: both Colfax routes' pin sequences are internally muddled, so neither is a trustworthy donor.`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

for (const s of staged) await patchRow("routes", s.f.wrong.id, { waypoints: s.next });
console.log(`\nwrote ${staged.length} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const f of FIXES) {
  const wps = after.get(f.wrong.id).waypoints || [];
  const got = wps.find((w) => String((w || {}).name || "").trim() === f.name);
  if (!got) { console.error(`PIN LOST: ${f.wrong.id} "${f.name}"`); bad++; continue; }
  const dist = D(num(got.lat), num(got.lng), f.osm.lat, f.osm.lng);
  if (!(dist < 1000)) { console.error(`NOT APPLIED: ${f.wrong.id} "${f.name}" is still ${Math.round(dist)} m from the OSM feature`); bad++; }
  if (wps.length !== (byId.get(f.wrong.id).waypoints || []).length) { console.error(`WAYPOINTS LOST: ${f.wrong.id}`); bad++; }
  // the donor must be untouched - this batch only ever writes the outlier
  const dw = (after.get(f.donor).waypoints || []).find((w) => String((w || {}).name || "").trim() === f.name);
  const dw0 = (byId.get(f.donor).waypoints || []).find((w) => String((w || {}).name || "").trim() === f.name);
  if (!dw || !near(num(dw.lat), num(dw0.lat)) || !near(num(dw.lng), num(dw0.lng))) { console.error(`DONOR CHANGED: ${f.donor} "${f.name}"`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: every moved pin is within 1 km of the OSM feature, no donor changed, no route lost a waypoint.`);
process.exit(bad ? 1 : 0);
