// audit:grade-num-drift class F, 2026-10-14: eight rows read one at a time against the population that agrees.
//  - 5 "Easy 5th" rows stored 2; 248 of 255 plain "Easy 5th" rows store 5 -> set 5.
//  - Lovin' Arms stored 0 (an aid label read as the grade). Index's Davis-Holland -> Lovin' Arms is 5.10c on the usual
//    line (5.11b on the original); no record gives 5.11c, so the number follows the 5.10c: 10.75, not the parser's 11.75.
//  - The two wi rows (McClellan North Couloir, East Face Variation) are CORRECT: 72 wi grades led by a 5.x all store the
//    ice number (5.6 WI3 -> 3). The parser is what disagrees there; left untouched.
// Assert-then-set (each PATCH filters on the stored value it expects), then re-read. usage: [--dry]
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
const dry = process.argv.includes("--dry");
if (!dry) requireServiceKey();
const FIX = [
  ...["wa_lancaster_s_crack", "wa_lower_cracks", "wa_miracle_grow", "wa_north_ridge", "wa_simba_s_fury"].map((id) => ({ id, from: 2, to: 5 })),
  { id: "wa_full_or_nearly_wall_routes_lovin_arms", from: 0, to: 10.75 },
];
const rows = await selectAll("routes", "id,grade,grade_num", `id=in.(${FIX.map((f) => f.id).join(",")})`, { pageSize: 20 });
const by = Object.fromEntries(rows.map((r) => [r.id, r]));
for (const f of FIX) {
  const r = by[f.id];
  if (!r || Number(r.grade_num) !== f.from) { console.log("skip", f.id, r && r.grade_num); continue; }
  console.log(dry ? "would set" : "set", f.id, `"${r.grade}"`, f.from, "->", f.to);
  if (!dry) await patchRow("routes", f.id, { grade_num: f.to }, { filter: `grade_num=eq.${f.from}` });
}
if (!dry) {
  const back = await selectAll("routes", "id,grade_num", `id=in.(${FIX.map((f) => f.id).join(",")})`, { pageSize: 20 });
  const bad = FIX.filter((f) => Number(back.find((r) => r.id === f.id)?.grade_num) !== f.to);
  console.log("re-read:", back.length, "wrong:", bad.length);
  if (bad.length) process.exit(1);
}
