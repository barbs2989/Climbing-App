// West Twin Needle's original route headlined Class 2 while a party must climb Class 4 to reach its
// summit slope (owner note: a route is graded by its HIGHEST class). Researched 2026-10-29: the
// Twin Needles' easiest route is class 4, and the gullies below the col run class 3-5; the
// stored "Class 2-3" described only the final slope. One row, compare-and-set on the old value.
import { writeFileSync } from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
const ID = "wa_west_twin_needle_west_slope";
const key = requireServiceKey();
const cols = "id,name,area_id,discipline,grade,grade_system,grade_num,rock_grade";
const read = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=${cols}`, { headers: headers(key) })).json())[0];
const before = await read();
if (!before) throw new Error("row not found");
console.log("before", before);
if (before.grade === "Class 4" && Number(before.grade_num) === 4) { console.log("already Class 4"); process.exit(0); }
if (before.grade !== "Class 2" || before.grade_system !== "class") throw new Error("row changed since research; re-read it");
writeFileSync(new URL(`../rollback-west-twin-needle-class-${Date.now()}.json`, import.meta.url), JSON.stringify([before], null, 2));
if (process.argv.includes("--dry")) process.exit(0);
await patchRow("routes", ID, { grade: "Class 4", grade_num: 4 });
const after = await read();
console.log("after", after);
if (after.grade !== "Class 4" || Number(after.grade_num) !== 4) throw new Error("write did not land");
