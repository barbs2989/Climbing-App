#!/usr/bin/env node
// Two Mt. Baker-Snoqualmie roads whose recorded status has been overtaken by the world.
//
// GLACIER CREEK ROAD (FS 39) — REOPENED 20 August 2026. The catalog says it is closed to all
// vehicles at the Glacier Creek bridge (MP 3.0) "expected through October 2026". The Forest
// Service announced on 20 Aug that repairs are complete and vehicles can again reach the
// Heliotrope Ridge trailhead, and the MBS alerts page carries no FS 39 alert. Telling a party the
// road is shut sends them on a ~9-mile round-trip walk they do not need, or to another mountain.
//   - A third route, wa_lincoln_peak_wilkes_booth, already says "generally passenger-car
//     accessible to the trailhead". It was wrong during the closure and is right now; it is left
//     alone rather than rewritten, which is why this is a correction and not a sweep.
//
// DEADHORSE ROAD (FS 37) — CLOSED, but not where or why the catalog says. The live MBS alert
// ("FS Road 37 Deadhorse Creek CLOSED Until Further Notice", 1 June 2026) reads: "Forest Service
// Road 37 Deadhorse Creek Road flood damage repair is underway. For public safety due to heavy
// equipment use the road will be closed at mile 0.03 until further notice." The catalog says
// "impassable to vehicles at milepost 3.1 due to 2021 flood damage" — a party drives three miles
// in to find the gate at the bottom.
//   - The alert does not say WHICH flood, so the year is dropped rather than swapped. Stating a
//     cause the source does not state is the fabrication this catalog keeps paying for.
//
// Every edit declares the exact text it expects and is refused unless it matches exactly once.
//
//   node scripts/oneoff/fix-mbs-road-status-aug-2026.mjs --dry
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const H = { apikey: key, Authorization: "Bearer " + key };
const CHECKED_AT = "2026-08-27T12:00:00+00:00";

const EDITS = [
  { id: "wa_colfax_peak_polish_route", col: "road", key: "status",
    find: "as of June 30, 2026 the road is closed to all vehicles at the Glacier Creek bridge (MP 3.0) to the Heliotrope Ridge trailhead for repairs, expected to last through October 2026, though pedestrians, bikes, and e-bikes are allowed through at Forest Service discretion.",
    repl: "December 2025 flood damage closed the road to all vehicles at the Glacier Creek bridge (MP 3.0) from June 2026; the Forest Service announced on 20 August 2026 that those repairs are complete and vehicles can again reach the Heliotrope Ridge trailhead.",
    why: "asserted a closure through October 2026 that was lifted on 20 August 2026" },

  { id: "wa_colfax_peak_polish_route", col: "road", key: "driveNote",
    find: " -- note the road is currently closed to vehicles at MP 3.0, so budget extra time/distance to walk or bike in.",
    repl: ". The MP 3.0 closure for flood repairs was lifted on 20 August 2026.",
    why: "still told a party to budget a walk-in from MP 3.0" },

  { id: "wa_colfax_peak_polish_route", col: "access", key: "closures",
    find: "December 2025 flood damage triggered a new closure to all vehicles at MP 3.0 (Glacier Creek bridge) to the Heliotrope Ridge Trailhead starting June 30, 2026, expected through October 2026, with pedestrian/bike access allowed at Forest Service discretion",
    repl: "December 2025 flood damage closed it to all vehicles at MP 3.0 (Glacier Creek bridge) from June 2026, and the Forest Service announced on 20 August 2026 that the repairs are complete and the trailhead is drivable again",
    why: "same stale closure on the access blob" },

  { id: "wa_mount_baker_coleman_headwall", col: "road", key: "status",
    find: "Washed out roughly 4.5 miles below the trailhead since the December 2025 flood (a repeat of a 2021 washout); as of mid-2026 the Forest Service has not announced a repair timeline.",
    repl: "Washed out roughly 4.5 miles below the trailhead by the December 2025 flood (a repeat of a 2021 washout); the Forest Service announced on 20 August 2026 that the repairs are complete and vehicles can again reach the Heliotrope Ridge trailhead.",
    why: "said no repair timeline had been announced; the repair is finished" },

  { id: "wa_mount_baker_coleman_headwall", col: "road", key: "driveNote",
    find: "Beyond the washout the road is only passable on foot, bike, or e-bike, adding about 9 miles and 2,000 ft round trip to the approach.",
    repl: "While the washout was open the road was passable beyond it only on foot, bike, or e-bike, adding about 9 miles and 2,000 ft round trip; that closure was lifted on 20 August 2026.",
    why: "described the walk-in as current" },

  { id: "wa_hadley_peak_skyline_divide", col: "road", key: "status",
    find: "Currently impassable to vehicles at milepost 3.1 due to 2021 flood damage; no estimated repair date as of the Forest Service's active alert",
    repl: "Closed to vehicles at mile 0.03 until further notice while flood-damage repair is under way, per the Mt. Baker-Snoqualmie alert of 1 June 2026",
    why: "wrong gate (3.1 against 0.03) and a cause the alert does not state" },

  { id: "wa_hadley_peak_skyline_divide", col: "road", key: "driveNote",
    find: "FS 37 normally continues 12.7 miles to the Skyline Divide Trailhead, but is currently blocked at mile 3.1.",
    repl: "FS 37 normally continues 12.7 miles to the Skyline Divide Trailhead, but is currently gated at mile 0.03 for repair work.",
    why: "wrong gate location" },

  { id: "wa_hadley_peak_skyline_divide", col: "access", key: "closures",
    find: "Skyline Divide Trailhead is currently inaccessible by vehicle: FS Road 37 (Deadhorse Road) is washed out at milepost 3.1 with no estimated repair date.",
    repl: "Skyline Divide Trailhead is currently inaccessible by vehicle: FS Road 37 (Deadhorse Road) is closed at mile 0.03 until further notice for flood-damage repair, with heavy equipment on the road.",
    why: "wrong gate location, and 'washed out' understates an active worksite" },
];

const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,road,access&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`read ${id}: ${r.status}`);
  const [row] = await r.json(); if (!row) throw new Error(`${id}: no such route`); return row;
};

let applied = 0, skipped = 0, refused = 0;
for (const e of EDITS) {
  const row = await get(e.id);
  const blob = row[e.col] && typeof row[e.col] === "object" ? row[e.col] : null;
  const cur = blob && blob[e.key];
  if (typeof cur !== "string") { console.log(`REFUSED ${e.id} ${e.col}.${e.key}: not a string`); refused++; continue; }
  if (cur.includes(e.repl)) { console.log(`skip    ${e.id} ${e.col}.${e.key}: already applied`); skipped++; continue; }
  const n = cur.split(e.find).length - 1;
  if (n !== 1) { console.log(`REFUSED ${e.id} ${e.col}.${e.key}: declared text matched ${n}x`); refused++; continue; }
  console.log(`${DRY ? "would fix" : "FIX     "} ${e.id} ${e.col}.${e.key} — ${e.why}`);
  if (!DRY) { await patchRow("routes", e.id, { [e.col]: { ...blob, [e.key]: cur.replace(e.find, e.repl) } }); applied++; }
}
const ids = [...new Set(EDITS.map((e) => e.id))];
if (!DRY) {
  for (const id of ids) await patchRow("routes", id, { access_checked_at: CHECKED_AT });
  let bad = 0;
  for (const e of EDITS) { const row = await get(e.id); if (!String(row[e.col][e.key]).includes(e.repl.slice(0, 50))) { console.log(`VERIFY FAILED ${e.id} ${e.col}.${e.key}`); bad++; } }
  console.log(`\napplied ${applied}, skipped ${skipped}, refused ${refused}, stamped ${ids.length}, verify failures ${bad}`);
  process.exit(bad ? 1 : 0);
}
console.log(`\ndry run — ${EDITS.length - skipped - refused} to apply, ${refused} refused, would stamp ${ids.length}`);
