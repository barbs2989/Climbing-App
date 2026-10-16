// A DESCENT pin carrying a distance-from-TRAILHEAD is sorted into the middle of the ASCENT.
//
// `orderWaypoints` sorts by `distMi`, which it documents as "distance from the start" — i.e. along
// the route. On wa_dragontail_peak_r3 (Pandora's Box, W Couloir) every pin follows that convention
// except one:
//
//     Stuart Lake Trailhead        0        Colchuck Col              5.6
//     Colchuck Lake                4        Pandora's Box notch       5.8
//     North shore / glacier        5        Dragontail Peak summit    6
//     Aasgard Pass              5.11   <-- stored LAST, rendered THIRD
//
// The row settles it in its own words: "From the summit, the standard descent is southeast to a
// saddle, then east across a long snow slope to Aasgard Pass, then down the pass's steep
// talus/snow (~2,200 ft in under a mile) to Colchuck Lake." So the pass is reached AFTER the
// summit, its stored position (last) is correct, and 5.11 is a distance from the TRAILHEAD — the
// pass sits at the head of Colchuck Lake, ~5.1 trail miles in — not a distance along this route.
// `distMi` is holding two conventions, exactly as CLAUDE.md records for `dist_km`.
//
// WHY THE VALUE IS REMOVED RATHER THAN CORRECTED. A correct along-route figure would be somewhere
// past 6, and the only evidence for how far is the prose's "~2,200 ft in under a mile" for the leg
// BELOW the pass — which says nothing about summit-to-pass. Writing 6.8 would be inventing
// precision the record does not carry, which is the fabrication class this repo refuses everywhere
// else. Removing it makes the route unsortable, so orderWaypoints returns the STORED order — and
// the stored order is the correct one. A wrong number is worse than no number when the reader sorts
// by it.
//
// A RED HERRING WORTH RECORDING: 5, 5.6, 5.8 and 5.11 read like YDS grades sorted numerically, and
// 5.11 landing between 5 and 5.6 is exactly what that bug looks like. It is not one — Colchuck Lake
// at 4 mi and Colchuck Col at 5.6 mi are the real trail mileages. Check the plausible mechanism
// before reporting it.
//
// Declared state: the run refuses unless the live pin still holds the value named here.
//
//   node scripts/oneoff/fix-aasgard-pass-descent-distmi.mjs [--apply]
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
import { tidyWaypoints } from "../../lib/waypoints.js";

const APPLY = process.argv.includes("--apply");
if (APPLY) requireServiceKey();   // an anon PATCH answers 200 with an empty array

const ROUTE = "wa_dragontail_peak_r3";
const PIN = "Aasgard Pass";
const EXPECT_DIST = 5.11;
const EXPECT_LAST = true;         // the pin must already be stored LAST; only the number is wrong

const rows = await selectAll("routes", "id,name,waypoints", `id=eq.${ROUTE}`);
if (!rows.length) { console.error(`FAIL - ${ROUTE} not found.`); process.exit(1); }
const wps = rows[0].waypoints;
if (!Array.isArray(wps) || !wps.length) { console.error("FAIL - no waypoints on the row."); process.exit(1); }

const idx = wps.findIndex((w) => w && String(w.name || "").trim() === PIN);
if (idx < 0) { console.error(`FAIL - no pin named "${PIN}". The row has moved; re-read before writing.`); process.exit(1); }
if (wps[idx].distMi !== EXPECT_DIST) {
  console.error(`FAIL - "${PIN}" holds distMi=${wps[idx].distMi}, not the declared ${EXPECT_DIST}.`);
  console.error("       Somebody has already changed this. Re-read the row rather than overwriting.");
  process.exit(1);
}
if (EXPECT_LAST && idx !== wps.length - 1) {
  console.error(`FAIL - "${PIN}" is stored at index ${idx} of ${wps.length}, not last.`);
  console.error("       The argument here is that the STORED order is right and only the number is");
  console.error("       wrong. If the pin has moved, that argument no longer holds.");
  process.exit(1);
}

const next = wps.map((w, i) => {
  if (i !== idx) return w;
  const { distMi, ...rest } = w;   // remove only this key
  return rest;
});

const nameOf = (l) => l.map((w) => w && w.name).join(" -> ");
console.log(`${ROUTE} — ${rows[0].name}\n`);
console.log(`renders now  : ${nameOf(tidyWaypoints(JSON.parse(JSON.stringify(wps))))}`);
console.log(`renders after: ${nameOf(tidyWaypoints(JSON.parse(JSON.stringify(next))))}\n`);

// The whole point is the ORDER, so assert it rather than the column.
const after = tidyWaypoints(JSON.parse(JSON.stringify(next)));
if (after[after.length - 1] == null || String(after[after.length - 1].name || "") !== PIN) {
  console.error(`FAIL - after the change "${PIN}" still does not render last. Removing the number did`);
  console.error("       not achieve what it was for; do not write.");
  process.exit(1);
}
if (after.length !== wps.length) {
  console.error(`FAIL - the rendered list changed LENGTH (${wps.length} -> ${after.length}). Removing a`);
  console.error("       distance must not change which pins survive.");
  process.exit(1);
}

if (!APPLY) { console.log("dry run — pass --apply to write."); process.exit(0); }

await patchRow("routes", ROUTE, { waypoints: next });

// A 200 is not evidence the data changed.
const back = await selectAll("routes", "id,waypoints", `id=eq.${ROUTE}`);
const live = back[0].waypoints;
const pin = live.find((w) => w && String(w.name || "").trim() === PIN);
if (!pin) { console.error("VERIFY FAILED - the pin is gone entirely."); process.exit(1); }
if (pin.distMi !== undefined) { console.error(`VERIFY FAILED - distMi still reads ${pin.distMi}.`); process.exit(1); }
if (live.length !== wps.length) { console.error(`VERIFY FAILED - ${wps.length} pins went in, ${live.length} came back.`); process.exit(1); }
const liveOrder = nameOf(tidyWaypoints(JSON.parse(JSON.stringify(live))));
console.log(`verified: distMi removed, ${live.length} pins intact, renders as\n  ${liveOrder}`);
