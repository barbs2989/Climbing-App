// The 10 rows audit:mountaineering-rule held (2026-10-08). Read row by row, not by fingerprint:
//  - 7 carry their own 5th-class evidence (rock_grade "low 5th"/"Easy 5th", a rack, a rope for pitched climbing, pitches):
//    the 5.0 is right and the LABEL was wrong -> alpine (the 0280 trigger would do it on the next edit anyway).
//  - Sahale Glacier and Overcoat East Face: sources give glacier + Class 3-4 rock, a 5.x only as an occasional/possible
//    summit-block move -> the GRADE was stale; correct it, keep mountaineering.
//  - Dragontail R3: Class 3 snow route, its 5.6 is stored as "optional, true summit pinnacle only" -> untouched.
// Assert-then-set (each PATCH filters on the value it expects), then re-read. usage: [--dry]
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
const dry = process.argv.includes("--dry");
if (!dry) requireServiceKey();

const ALPINE = "wa_andersons_thumb_standard wa_burnt_boot_peak_north_ridge wa_inner_constance_northwest_buttress wa_lemah_two_goatshead_spire wa_mount_crowder_northeast_ridge wa_storm_king_north_face wa_tepeh_towers".split(" ");
const REGRADE = [
  { id: "wa_sahale_mountain_sahale_glacier", expect: "grade=eq.5.0", body: { grade: "Class 4", grade_system: "class", grade_num: 4, rock_grade: "Class 3-4" } },
  { id: "wa_overcoat_peak_southeast_route", expect: "grade=eq.5.4", body: { grade: "Class 4", grade_system: "class", grade_num: 4, rock_grade: "Class 3-4 (a low 5th move is possible on the summit block)" } },
];

const rows = await selectAll("routes", "id,discipline,disciplines,grade", `id=in.(${[...ALPINE, ...REGRADE.map((r) => r.id)].join(",")})`, { pageSize: 50 });
const by = Object.fromEntries(rows.map((r) => [r.id, r]));
for (const id of ALPINE) {
  const r = by[id];
  if (!r || r.discipline !== "mountaineering") { console.log("skip", id, r && r.discipline); continue; }
  const ds = ["alpine", ...(Array.isArray(r.disciplines) ? r.disciplines : ["mountaineering"]).filter((d) => d !== "alpine")];
  console.log(dry ? "would alpine" : "alpine", id);
  if (!dry) await patchRow("routes", id, { discipline: "alpine", disciplines: ds }, { filter: "discipline=eq.mountaineering" });
}
for (const g of REGRADE) {
  console.log(dry ? "would regrade" : "regrade", g.id, by[g.id] && by[g.id].grade, "->", g.body.grade);
  if (!dry) await patchRow("routes", g.id, g.body, { filter: g.expect });
}
if (!dry) {
  const back = await selectAll("routes", "id,discipline,grade,grade_num", `id=in.(${[...ALPINE, ...REGRADE.map((r) => r.id)].join(",")})`, { pageSize: 50 });
  const bad = back.filter((r) => ALPINE.includes(r.id) ? r.discipline !== "alpine" : !(r.grade === "Class 4" && r.grade_num === 4 && r.discipline === "mountaineering"));
  console.log("re-read:", back.length, "wrong:", bad.length);
  if (bad.length) process.exit(1);
}
