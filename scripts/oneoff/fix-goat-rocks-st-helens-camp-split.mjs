// ONE CAMP LIST, TWO MOUNTAIN RANGES, 59 KM APART.
//
// An identical 7-entry `bivy` list sits on SEVEN routes across FOUR areas: Mount St. Helens, and
// the Goat Rocks peaks Old Snowy Mountain, Ives Peak and Gilbert Peak. Five of the seven entries
// are Goat Rocks places and two are St. Helens places, so every one of the seven routes carries
// camps from a range it is not in. The contamination runs BOTH ways, which is what makes it
// decidable rather than a judgement:
//
//   Mount St. Helens is told to camp at Snowgrass Flat, Goat Lake, Chambers Lake and Conrad
//   Meadows -- 59 to 66 km east, over the Cascade crest, in a different wilderness.
//
//   Old Snowy, Ives and Gilbert are told to camp at Climbers Bivouac and Marble Mountain
//   Sno-Park -- the two St. Helens climbers' trailheads, 69 km west.
//
// This is the zone-file mechanism audit:camp-route-fit exists for, and that audit cannot see it:
// its dial is "the camp is ABOVE the route's high point", and every entry here is below the peak
// it is wrongly attached to. It is the same blindness Mount Pilchuck shows, and the elevation
// dial -- not the peak-name requirement -- is what dominates it.
//
// EVERY ASSIGNMENT IS MEASURED, NOT REMEMBERED. Each camp was located in the public gazetteer and
// its distance taken to BOTH anchors, so neither range is privileged and the method cannot smuggle
// in the expected answer. Anchors: St. Helens (46.191444, -122.195816), Old Snowy Mountain
// (46.512244, -121.454431).
//
//      Goat Lake basin        65.7 km from St. Helens    2.5 km from Old Snowy   -> Goat Rocks
//      Chambers Lake Cmpgrnd  59.4 km                    7.9 km                  -> Goat Rocks
//      Snowgrass Flat         no feature within 25 km    found within 25 km      -> Goat Rocks
//      Conrad Meadows         no feature within 25 km    found within 25 km      -> Goat Rocks
//      Climbers Bivouac        5.1 km                   69.1 km                  -> St. Helens
//      Marble Mountain SP      7.1 km                   69.6 km                  -> St. Helens
//
// The separation is 8x to 25x. Nothing here is close to the line.
//
// "Dana Yelverton Shelter site" IS DELIBERATELY NOT MOVED. It is in no gazetteer under any
// spelling tried, so it cannot be placed, and a repair may remove what is PROVEN foreign and
// nothing else. Assigning it from the balance of the list would be the very zone-file reasoning
// this repair undoes. It stays on all seven routes and is reported below as unresolved.
//
// Declared-state contract: the exact seven names are asserted on every row before anything is
// written, so a stale table cannot half-apply and no camp can be invented. --apply writes; the
// default is a dry run, and it re-reads afterwards to reconcile.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const GOAT_ROCKS = [
  "Snowgrass Flat area backcountry camps",
  "Goat Lake basin",
  "Chambers Lake Campground",
  "Conrad Meadows and Surprise Lake, South Fork Tieton",
];
const ST_HELENS = ["Climbers Bivouac", "Marble Mountain Sno-Park"];
const UNRESOLVED = "Dana Yelverton Shelter site";
const EXPECT = [...GOAT_ROCKS.slice(0, 2), UNRESOLVED, GOAT_ROCKS[2], GOAT_ROCKS[3], ...ST_HELENS];

// route id -> the names that do NOT belong on it.
const PLAN = [
  { route: "wa_mount_st_helens_monitor_ridge", remove: GOAT_ROCKS, keeps: 3 },
  { route: "wa_mount_st_helens_worm_flows", remove: GOAT_ROCKS, keeps: 3 },
  { route: "wa_old_snowy_mountain_r1", remove: ST_HELENS, keeps: 5 },
  { route: "wa_ives_peak_r1", remove: ST_HELENS, keeps: 5 },
  { route: "wa_gilbert_peak_meade_glacier", remove: ST_HELENS, keeps: 5 },
  { route: "wa_gilbert_peak_conrad_glacier", remove: ST_HELENS, keeps: 5 },
  { route: "wa_gilbert_peak_west_route", remove: ST_HELENS, keeps: 5 },
];

const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}` };
const ids = PLAN.map((p) => `"${p.route}"`).join(",");
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${ids})&select=id,name,area_id,bivy`, { headers: H });
if (!res.ok) { console.error(`read failed: HTTP ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== PLAN.length) {
  console.error(`refusing: expected ${PLAN.length} routes, read ${rows.length}. The catalog has changed; re-measure before repairing.`);
  process.exit(1);
}
const byId = new Map(rows.map((r) => [r.id, r]));

// PRECONDITION: every row must hold exactly the seven declared names. A row that has since been
// edited is not the row this evidence was gathered about.
for (const p of PLAN) {
  const row = byId.get(p.route);
  if (!row) { console.error(`refusing: ${p.route} not found`); process.exit(1); }
  const names = (row.bivy || []).map((b) => b && b.name);
  if (names.length !== EXPECT.length || !EXPECT.every((n) => names.includes(n))) {
    console.error(`refusing: ${p.route} no longer holds the declared 7-entry list (found ${names.length}).`);
    console.error(`  expected: ${JSON.stringify(EXPECT)}`);
    console.error(`  found   : ${JSON.stringify(names)}`);
    process.exit(1);
  }
}
console.log(`precondition ok — all ${PLAN.length} routes hold the identical declared 7-entry list\n`);

let wrote = 0;
for (const p of PLAN) {
  const row = byId.get(p.route);
  const kept = (row.bivy || []).filter((b) => !p.remove.includes(b && b.name));
  if (kept.length !== p.keeps) {
    console.error(`refusing ${p.route}: would keep ${kept.length}, declared ${p.keeps}`);
    process.exit(1);
  }
  console.log(`${p.route}  (${row.name})`);
  for (const n of p.remove) console.log(`   REMOVE  ${n}`);
  for (const b of kept) console.log(`   keep    ${b.name}`);
  if (APPLY) { await patchRow("routes", p.route, { bivy: kept }); wrote++; }
  console.log("");
}

if (!APPLY) { console.log(`DRY RUN — nothing written. Re-run with --apply.`); process.exit(0); }

// Re-read and reconcile: a 200 is not evidence the data changed.
const ver = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${ids})&select=id,bivy`, { headers: H });
const after = await ver.json();
let bad = 0;
for (const p of PLAN) {
  const r = after.find((x) => x.id === p.route);
  const names = (r.bivy || []).map((b) => b.name);
  const leftover = p.remove.filter((n) => names.includes(n));
  if (names.length !== p.keeps || leftover.length) { console.error(`VERIFY FAILED ${p.route}: ${names.length} entries, leftover ${JSON.stringify(leftover)}`); bad++; }
}
console.log(`wrote ${wrote} row(s); verified ${PLAN.length - bad}/${PLAN.length}`);
console.log(`\n"${UNRESOLVED}" was left on all seven routes: it is in no gazetteer under any spelling`);
console.log(`tried, so it cannot be placed, and only proven-foreign entries were removed.`);
if (bad) process.exit(1);
