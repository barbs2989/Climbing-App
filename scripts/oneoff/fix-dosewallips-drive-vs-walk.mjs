#!/usr/bin/env node
// The Dosewallips River Road closure, described eleven ways, three of them false.
//
// FS 2610 washed out in January 2002 and has never been repaired. Three independent primary
// sources agree on the shape of it, and the catalog's own best row already states it:
//   - WTA: "Proceed 8.5 miles to the new vehicle road end", washout at mile 1 OF THE HIKE, and
//     "the end of the road, at 6.5 miles" for the walk to the Dosewallips campground.
//   - NPS (Dosewallips River Trail): the washout "adds an additional 6.5 miles of hiking".
//   - USFS (Tunnel Creek via Dosewallips Road TH): "the major road washout at 10.5 miles".
//   - `wa_mount_anderson_eel_glacier` already says: drive ~8.5 mi to road-end parking, washout
//     ~1 mile farther up the old roadbed, ~6.5-7 miles extra each way. That row is CORRECT.
//
// So: DRIVE ~8.5 mi from US-101, then WALK/BIKE ~6.5 mi. The recurring defect is conflating the
// two — "about 1 mile in" means one mile past the PARKING, not one mile from the highway, and
// "5.5-6.5 miles from Hwy 101" is the WALK distance wearing the drive's label. A party reading
// either parks miles short of where they could and adds hours on foot.
//
// Only demonstrably FALSE statements are touched. Rows that are merely thin ("verify current
// status") are left alone: vague is not wrong, and rewriting them is editorial work needing more
// than a distance check. `wa_mount_claywood_standard` is also left alone — its "about 5.5 miles
// short of the historic trailhead" describes the WALK and is correct.
//
//   node scripts/oneoff/fix-dosewallips-drive-vs-walk.mjs --dry
//   node scripts/oneoff/fix-dosewallips-drive-vs-walk.mjs
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const H = { apikey: key, Authorization: "Bearer " + key };

// Each edit declares the EXACT text it expects to find. A find that does not match exactly once
// is refused rather than guessed at, so a row somebody has since edited cannot be half-rewritten.
const EDITS = [
  { id: "wa_inner_constance_standard", col: "road", key: "status",
    find: "Washed out roughly 5.5-6.5 miles from Hwy 101 (since the early 2000s); closed to motor vehicles indefinitely.",
    repl: "Washed out since a January 2002 flood and never repaired; closed to motor vehicles indefinitely. Drive about 8.5 miles from US-101 to the road-end parking — the washout is roughly a mile farther up the old roadbed — then foot or bike only, adding about 6.5 miles each way.",
    why: "said the washout is 5.5-6.5 mi from Hwy 101. That is the WALK; the drive is ~8.5 mi." },

  { id: "wa_white_mountain_olympics_scramble", col: "road", key: "status",
    find: "Permanently closed to vehicle traffic beyond approximately mile 1 since a 2002 flood washout; open to foot and bicycle travel only.",
    repl: "Permanently closed to vehicle traffic since a January 2002 flood washout; open to foot and bicycle travel only. Vehicles reach a road-end parking about 8.5 miles from US-101, with the washout roughly a mile beyond it.",
    why: "\"beyond approximately mile 1\" reads as one mile from the highway; mile 1 is measured from the PARKING." },

  { id: "wa_white_mountain_olympics_scramble", col: "access", key: "closures",
    find: "The Dosewallips River Road has been closed to vehicle traffic beyond about mile 1 since a major 2002 flood washout and remains permanently closed to cars (foot/bike travel only), which adds roughly 5.5-7 extra miles each way to any Dosewallips-side approach. The Duckabush trailhead has no such closure.",
    repl: "The Dosewallips River Road has been closed to vehicle traffic since a major January 2002 flood washout and remains permanently closed to cars (foot/bike travel only). Vehicles reach a road-end parking about 8.5 miles from US-101 and the washout sits roughly a mile beyond, adding about 6.5 miles each way to any Dosewallips-side approach. The Duckabush trailhead has no such closure.",
    why: "internally contradictory: closed at mile 1 cannot add only 5.5-7 miles when the trailhead is ~15 miles in." },

  { id: "wa_mount_cameron_standard", col: "access", key: "closures",
    find: "The Dosewallips River Road has been closed to vehicles since a 2002 washout about 1 mile in, adding several miles of road-walking/biking to that southern approach.",
    repl: "The Dosewallips River Road has been closed to vehicles since a January 2002 washout, which sits about a mile beyond the road-end parking some 8.5 miles from US-101, adding about 6.5 miles of road-walking or biking each way to that southern approach.",
    why: "\"about 1 mile in\" reads as one mile from the highway." },
];

// access_checked_at means somebody read THIS ROUTE's road/access claims against a primary source.
// So it goes only on routes whose own road IS the Dosewallips — `wa_mount_cameron_standard` and
// `wa_mount_claywood_standard` drive Obstruction Point Road, which was NOT checked, and stamping
// them would assert a verification that did not happen.
const STAMP_IF_ROAD_MATCHES = /dosewallips/i;
const CHECKED_AT = "2026-08-27T12:00:00+00:00";

const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,road,access,access_checked_at&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`read ${id}: ${r.status}`);
  const [row] = await r.json();
  if (!row) throw new Error(`${id}: no such route`);
  return row;
};

let applied = 0, skipped = 0, refused = 0;
for (const e of EDITS) {
  const row = await get(e.id);
  const blob = row[e.col] && typeof row[e.col] === "object" ? row[e.col] : null;
  const cur = blob && blob[e.key];
  if (typeof cur !== "string") { console.log(`REFUSED ${e.id} ${e.col}.${e.key}: not a string`); refused++; continue; }
  if (cur === e.repl) { console.log(`skip    ${e.id} ${e.col}.${e.key}: already applied`); skipped++; continue; }
  const n = cur.split(e.find).length - 1;
  if (n !== 1) { console.log(`REFUSED ${e.id} ${e.col}.${e.key}: declared text matched ${n}x, expected exactly 1`); refused++; continue; }
  const next = cur.replace(e.find, e.repl);
  console.log(`${DRY ? "would fix" : "FIX     "} ${e.id} ${e.col}.${e.key} — ${e.why}`);
  if (!DRY) { await patchRow("routes", e.id, { [e.col]: { ...blob, [e.key]: next } }); applied++; }
}

// stamp
const ids = [...new Set(EDITS.map((e) => e.id))];
const all = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,road&road->>name=ilike.*dosewallips*`, { headers: H }).then((r) => r.json());
const stampIds = all.filter((r) => STAMP_IF_ROAD_MATCHES.test(String(r.road && r.road.name))).map((r) => r.id);
console.log(`\nstamping access_checked_at on ${stampIds.length} route(s) whose OWN road is the Dosewallips`);
for (const id of ids) if (!stampIds.includes(id)) console.log(`  note: ${id} was edited but NOT stamped — its own road is a different one`);
if (!DRY) for (const id of stampIds) await patchRow("routes", id, { access_checked_at: CHECKED_AT });

if (!DRY) {
  let bad = 0;
  for (const e of EDITS) { const row = await get(e.id); if (!String(row[e.col][e.key]).includes(e.repl.slice(0, 60))) { console.log(`VERIFY FAILED ${e.id} ${e.col}.${e.key}`); bad++; } }
  for (const id of stampIds) { const row = await get(id); if (!row.access_checked_at) { console.log(`VERIFY FAILED stamp ${id}`); bad++; } }
  console.log(`\napplied ${applied}, skipped ${skipped}, refused ${refused}, stamped ${stampIds.length}, verify failures ${bad}`);
  process.exit(bad ? 1 : 0);
}
console.log(`\ndry run — would apply ${EDITS.length - skipped - refused}, skip ${skipped}, refuse ${refused}, stamp ${stampIds.length}`);
