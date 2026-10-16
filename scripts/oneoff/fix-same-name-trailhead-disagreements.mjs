// A route stores its trailhead TWICE, and on two WA routes the two copies name the SAME PLACE
// and put it in two different spots. That is not the two-approach case `audit:trailhead-agreement`
// spends most of its output warning about — those four survivors give the trailhead a DIFFERENT
// NAME in each record, which is the fingerprint of a peak with two genuine starts. When both
// records carry one name, one of them is simply wrong.
//
//   wa_mount_cameron_standard   "Obstruction Point Trailhead"   pin and blob 9,361 m apart
//   wa_south_face_5             "Goodell Creek Trailhead"       pin and blob 1,082 m apart
//
// THE ROW SETTLES BOTH, AND THE DECIDING RECORD IS THE ONE NEITHER COORDINATE PRODUCED. Each
// route's own prose states an elevation for its trailhead, and the USGS 3DEP ground under each
// candidate either matches it or does not:
//
//   route                prose says          ground under PIN    ground under BLOB
//   Cameron              "topping out at     6,114 ft  MATCH     4,824 ft  (that is the
//                         6,135 ft"                               start of the road, not
//                                                                 its end 8 miles on)
//   south_face_5         "the small pullout    607 ft  MATCH       483 ft
//                         ... (~600 ft)"
//
// So in both rows the PIN is right and the `approach_logistics` coordinate is wrong — which is
// the opposite of that audit's own stated tendency ("approach_logistics is prose-derived, so it
// is usually the better record, but that is a tendency and not a rule"). Worth having measured
// rather than assumed.
//
// GOODELL HAS A FOURTH RECORD AGREEING, and it is overwhelming: 44 records across the Picket
// routes name that trailhead, in two clusters 454 m apart (34 at the Upper Goodell group camp,
// 10 at the trailhead proper). `wa_south_face_5`'s pin sits IN the 10-record cluster; its blob
// coordinate is a singleton a kilometre away, matching nothing.
//
// DECLARE A WINNER, NEVER A COORDINATE. The script reads both records off the row and copies the
// winner into the loser, so nothing can be invented and a repair needing a THIRD coordinate
// cannot be expressed at all. The measurements above are recorded rather than re-run: the
// declared-state contract already refuses if either record has moved since they were taken.
//
// AND THE RESULTING AGREEMENT IS NOT EVIDENCE OF ANYTHING. After this the two records agree at
// 0 m by construction — one claim counted twice. That is fine here because the winner was chosen
// by sources descending from neither (the prose, the ground, the catalog-wide cluster), but do
// not later read "these agree" as corroboration. See
// [[do-not-create-a-trailhead-pin-from-the-logistics-copy]].
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

// Declared state: BOTH records as they stood when the evidence above was gathered.
const FIXES = [
  {
    id: "wa_mount_cameron_standard",
    name: "Obstruction Point Trailhead",
    pin: { lat: 47.9183, lng: -123.3822 },
    blob: { lat: 47.9738, lng: -123.4767 },
    why: "prose says the road tops out at 6,135 ft; ground under the pin is 6,114 ft, under the blob 4,824 ft — the blob is where the 8-mile road STARTS",
  },
  {
    id: "wa_south_face_5",
    name: "Goodell Creek Trailhead",
    pin: { lat: 48.68276, lng: -121.26928 },
    blob: { lat: 48.6733, lng: -121.2658 },
    why: "prose says the pullout is ~600 ft; ground under the pin is 607 ft, under the blob 483 ft. 44 catalog records cluster on the pin, the blob is a singleton",
  },
];

const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-4;
const dist = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const IDS = FIXES.map((f) => f.id);
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,waypoints,approach_logistics`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const staged = [];
const refusals = [];
for (const f of FIXES) {
  const row = byId.get(f.id);
  const al = row.approach_logistics;
  if (!al || typeof al !== "object") { refusals.push(`${f.id}: no approach_logistics object`); continue; }
  const pins = (Array.isArray(row.waypoints) ? row.waypoints : [])
    .filter((w) => String((w || {}).type || "").toLowerCase().includes("trailhead") && String((w || {}).name || "") === f.name);
  if (pins.length !== 1) { refusals.push(`${f.id}: expected exactly 1 "${f.name}" trailhead pin, found ${pins.length}`); continue; }
  const p = pins[0];
  // Both records must still hold what the evidence was gathered against, INCLUDING the name -
  // the whole argument is that these two name one place.
  if (!near(num(p.lat), f.pin.lat) || !near(num(p.lng), f.pin.lng)) {
    refusals.push(`${f.id}: the pin has moved (now ${p.lat},${p.lng}, expected ${f.pin.lat},${f.pin.lng})`); continue;
  }
  if (!near(num(al.trailheadLat), f.blob.lat) || !near(num(al.trailheadLng), f.blob.lng)) {
    refusals.push(`${f.id}: approach_logistics has moved (now ${al.trailheadLat},${al.trailheadLng}, expected ${f.blob.lat},${f.blob.lng})`); continue;
  }
  if (String(al.trailhead || "") !== f.name) {
    refusals.push(`${f.id}: approach_logistics.trailhead is "${al.trailhead}", not "${f.name}" - a DIFFERENT name is the two-approach case and must not be swept`); continue;
  }
  staged.push({
    id: f.id, why: f.why, name: f.name,
    was: dist(num(p.lat), num(p.lng), num(al.trailheadLat), num(al.trailheadLng)),
    // Copy the winner in. Only the two coordinates move; every other key on the blob is kept.
    next: Object.assign({}, al, { trailheadLat: num(p.lat), trailheadLng: num(p.lng) }),
  });
}

if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  "));
  process.exit(1);
}

for (const s of staged) {
  console.log(`\n### ${s.id}   "${s.name}"`);
  console.log(`   why: ${s.why}`);
  console.log(`   approach_logistics ${Math.round(s.was)} m  ->  0 m (the pin's coordinate)`);
  console.log(`   other keys kept: ${Object.keys(s.next).filter((k) => k !== "trailheadLat" && k !== "trailheadLng").join(", ") || "(none)"}`);
}
console.log(`\n${staged.length} route(s).`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

for (const s of staged) await patchRow("routes", s.id, { approach_logistics: s.next });
console.log(`\nwrote ${staged.length} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const f of FIXES) {
  const row = after.get(f.id), al = row.approach_logistics || {};
  const p = (row.waypoints || []).find((w) => String((w || {}).name || "") === f.name && String((w || {}).type || "").toLowerCase().includes("trailhead"));
  if (!p) { console.error(`PIN LOST: ${f.id} no longer carries its "${f.name}" pin`); bad++; continue; }
  const d = dist(num(p.lat), num(p.lng), num(al.trailheadLat), num(al.trailheadLng));
  if (!(d < 1)) { console.error(`NOT APPLIED: ${f.id} records still ${Math.round(d)} m apart`); bad++; }
  if (String(al.trailhead || "") !== f.name) { console.error(`NAME LOST: ${f.id}.approach_logistics.trailhead is now "${al.trailhead}"`); bad++; }
  // The rest of the blob is what a climber reads; a "fix" that emptied it would be worse.
  const keys = Object.keys(al).filter((k) => k !== "trailheadLat" && k !== "trailheadLng");
  if (!keys.length) { console.error(`BLOB EMPTIED: ${f.id}.approach_logistics has nothing but coordinates`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: both rows agree with their own pin, names and the rest of each blob intact.`);
process.exit(bad ? 1 : 0);
