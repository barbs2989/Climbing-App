// A waypoint whose own directions string states a different elevation from the one it stores.
//
// wa_johannesburg_mountain_northeast_buttress's first pin, "Cascade Pass Road (near trailhead)", stores
// 3,200 ft. Its OWN directions read "Follow Cascade River Road to its end at the Cascade Pass trailhead,
// roughly 3,600 ft." Four records say 3,600 and one says 3,200, and the one is the number sitting beside
// the sentence that contradicts it:
//
//   the waypoint's own directions   "...at the Cascade Pass trailhead, roughly 3,600 ft."
//   the row's own approach          "Start at the Cascade Pass Trailhead (~3,600 ft)..."
//   the sibling route's pin         wa_johannesburg_mountain_cj_couloir stores 3600 at the
//                                   BYTE-IDENTICAL coordinate 48.476,-121.076
//   USGS 3DEP under that coordinate 3,584 ft
//
// This is audit:cross-route-pins section 2 exactly — two routes storing one point at one coordinate with
// two elevations, where the ground admits only one — arrived at from the audit side rather than found by
// that audit, which had not been re-run over this pair.
//
// THE DONOR IS THE SIBLING, so no elevation is typed: the value written is read off
// wa_johannesburg_mountain_cj_couloir at apply time, and the script refuses unless that row still stores
// it at the same coordinate. Both text corroborations are re-asserted too, so if the directions or the
// approach are ever rewritten this refuses rather than writing against them.
//
// A GENERAL DETECTOR FOR THIS SHAPE WAS BUILT, MEASURED AND REJECTED — recorded so it is not re-derived.
// "A waypoint whose own prose states an elevation contradicting its stored one" needs no external source
// at all, which makes it tempting. It reports 411 candidates and near enough none are real, because
// almost every height in waypoint prose is RELIEF rather than elevation: "the ~1000' West Face Wall",
// "~400 ft total" of rappel, "1,300 ft of 40-50 degree snow". Requiring a positional preposition ("at",
// "near", "roughly") and excluding a relief noun after the number still leaves deltas — "gaining about
// 750 ft over", "descend about 200 ft into", "only about 600 ft below the top", "gaining roughly 400 to
// 500 feet in about half a mile". Each tightening meets another phrasing, which is the
// deny-list-beaten-by-one-more-adjective failure this repo keeps recording. The distinction a rule would
// have to draw is between a height something IS AT and a height something COVERS, and that is not
// separable by vocabulary. So this repairs the one instance the audit found and builds nothing.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_johannesburg_mountain_northeast_buttress";
const DONOR = "wa_johannesburg_mountain_cj_couloir";
const PIN = /cascade pass road \(near trailhead\)/i;
const SAYS_3600 = /roughly 3,600 ft|~3,600 ft|\(~3,600 ft\)/i;

const rows = await selectAll("routes", "id,waypoints,approach", `id=in.(${TARGET},${DONOR})`, { pageSize: 10 });
const t = rows.find(x => x.id === TARGET), d = rows.find(x => x.id === DONOR);
if (!t || !d) { console.error("target or donor row not found — refusing"); process.exit(1); }

const i = (t.waypoints || []).findIndex(w => PIN.test(w.name || ""));
if (i < 0) { console.error("the trailhead pin is not on the target row — refusing"); process.exit(1); }
const w = t.waypoints[i];
const dw = (d.waypoints || []).find(x => PIN.test(x.name || ""));
if (!dw) { console.error("the donor row has no matching pin — refusing"); process.exit(1); }

// the two pins must be the SAME POINT, or this is not one fact stored twice
if (Number(w.lat) !== Number(dw.lat) || Number(w.lng) !== Number(dw.lng)) {
  console.error(`the two pins are at different coordinates (${w.lat},${w.lng} vs ${dw.lat},${dw.lng}) — refusing`); process.exit(1);
}
const donorElev = Number(dw.elev ?? dw.elevFt);
if (!Number.isFinite(donorElev)) { console.error("the donor pin has no elevation — refusing"); process.exit(1); }
if (Number(w.elev ?? w.elevFt) === donorElev) { console.log("nothing to do — the two already agree."); process.exit(0); }

// and the target row's own prose must still corroborate the donor's number
if (!SAYS_3600.test(String(w.directions || ""))) { console.error("the pin's own directions no longer state 3,600 ft — refusing"); process.exit(1); }
if (!SAYS_3600.test(String(t.approach || ""))) { console.error("the row's approach no longer states 3,600 ft — refusing"); process.exit(1); }

console.log(`  ${TARGET}  waypoint[${i}] "${w.name}"   ${w.lat},${w.lng}`);
console.log(`     stored elev/elevFt : ${w.elev} / ${w.elevFt}`);
console.log(`     donor (${DONOR}) at the same coordinate: ${donorElev}`);
console.log(`     its own directions : ${JSON.stringify(String(w.directions).slice(0, 120))}`);
console.log(`     the row's approach : ${JSON.stringify((String(t.approach).match(/[^.]*3,600[^.]*\./) || [""])[0].trim().slice(0, 120))}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const next = t.waypoints.map((x, j) => j !== i ? x : { ...x, elev: donorElev, elevFt: donorElev });
await patchRow("routes", TARGET, { waypoints: next });
const a = (await selectAll("routes", "id,waypoints", `id=eq.${TARGET}`, { pageSize: 10 }))[0];
const now = (a.waypoints || [])[i];
console.log(Number(now.elev) === donorElev && Number(now.elevFt) === donorElev
  ? `verified: the trailhead pin now reads ${donorElev} ft, matching its own directions, the row's approach, the sibling route and the ground`
  : `NOT APPLIED — reads ${now.elev}/${now.elevFt}`);
