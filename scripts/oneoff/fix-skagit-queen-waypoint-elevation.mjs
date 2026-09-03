// A WAYPOINT 911 FT ABOVE THE GROUND IT SITS ON.
//
// "Skagit Queen Camp" on wa_storm_king_southwest_scramble states 4,000 ft at 48.542266,-121.014315.
// CLAUDE.md records this as unsettled — "independent research leans toward the DEM but not
// conclusively, so it stays unwritten" — and blocks nine bivy rows behind it, because
// solve-camp-elevations refuses a name whose catalog waypoint and gazetteer disagree.
//
// THREE INDEPENDENT FACTS SETTLE IT, and each was checked rather than assumed
// (verify-skagit-queen-pin-is-real.mjs):
//   1. THE PIN IS REAL, not one of this catalog's ~346 interpolated coordinates. Six decimals with
//      no floating-point residue, and 1,437 m off the nearest chord between its own neighbours. It
//      matters: ground under a COMPUTED pin is ground under a place nobody chose, which is why
//      audit:waypoint-elevations keeps a 2,000 ft tolerance.
//   2. THE GAZETTEER FEATURE IS THE SAME PLACE — "Skagit Queen Camp, Thunder Creek Trail, Skagit
//      County" sits SEVEN METRES from the pin. Two records agreeing on a height only counts when
//      they are also in the same place; at 7 m this is not a coincidence.
//   3. THE TWO GROUND READS AGREE AND THE STATED VALUE DOES NOT. DEM under the pin 3,089 ft, DEM
//      under the gazetteer feature 3,093 ft — four feet apart — against a stated 4,000 ft.
//
// So the pin is right and the NUMBER is wrong. That is the direction that matters: had the pin been
// the wrong half, moving it would be a different repair and this script would not be the one to make
// it.
//
// WHY WRITE THE DEM RATHER THAN RESEARCH A FIGURE: the DEM is the same source solve-camp-elevations
// writes from for every camp it fills, gated by the control probe that reproduces four known heights
// within 68 ft. Using a different standard for this one row would make the column hold two
// conventions.
//
// DECLARED-STATE CONTRACT: the expected current value and coordinate are named, and the run REFUSES
// if the row has moved. It re-measures the ground at apply time rather than trusting the constant
// below, so the argument has to still hold when it runs — not merely when it was written.
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const ROUTE = "wa_storm_king_southwest_scramble";
const NAME = "Skagit Queen Camp";
const EXPECT_ELEV = 4000;
const EXPECT_LAT = 48.542266;
const EXPECT_LNG = -121.014315;
const TOL_M = 0.0002;          // ~20 m; the pin must be the one this was reasoned about

const H = headers(requireServiceKey());
const get = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${ROUTE}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json();
  if (j.length !== 1) throw new Error(`${ROUTE}: ${j.length} rows`);
  return j[0];
};

const row = await get();
const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
const idx = wps.findIndex((w) => w && String(w.name || "").trim() === NAME);
if (idx < 0) { console.log(`REFUSED — no waypoint named "${NAME}" on ${ROUTE}`); process.exit(1); }
const w = wps[idx];

if (Number(w.elev) !== EXPECT_ELEV) {
  console.log(`REFUSED — states ${w.elev} ft, expected ${EXPECT_ELEV}. The row has moved; re-derive.`);
  process.exit(1);
}
if (Math.abs(Number(w.lat) - EXPECT_LAT) > TOL_M || Math.abs(Number(w.lng) - EXPECT_LNG) > TOL_M) {
  console.log(`REFUSED — pin is ${w.lat},${w.lng}, expected ${EXPECT_LAT},${EXPECT_LNG}.`);
  console.log("A moved pin invalidates the whole argument: the ground under it is different ground.");
  process.exit(1);
}

// RE-MEASURE rather than trusting the number in this file.
const ground = Math.round(await elevationAt(Number(w.lat), Number(w.lng)));
console.log(`pin ${w.lat},${w.lng}`);
console.log(`states ${w.elev} ft; ground under it now measures ${ground} ft (diff ${ground - w.elev} ft)`);
if (Math.abs(ground - EXPECT_ELEV) < 500) {
  console.log("REFUSED — the ground now agrees with the stated value. The disagreement is gone.");
  process.exit(1);
}
if (ground < 2500 || ground > 3700) {
  console.log(`REFUSED — ${ground} ft is outside the range this repair was reasoned about.`);
  process.exit(1);
}

const next = JSON.parse(JSON.stringify(wps));
next[idx] = { ...next[idx], elev: ground };
await patchRow("routes", ROUTE, { waypoints: next });

const back = (await get()).waypoints[idx];
const ok = Number(back.elev) === ground && Number(back.lat) === Number(w.lat);
console.log(`\nwrote ${w.elev} -> ${ground} ft; re-read ${back.elev} ft, pin unchanged: ${Number(back.lat) === Number(w.lat)}`);
console.log(ok ? "verified" : "MISMATCH");
process.exitCode = ok ? 0 : 1;
