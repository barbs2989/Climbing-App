// wa_shock_and_awe is a V3 boulder problem whose grade_num is 10, so it sorts among 5.10 routes.
//
// grade_num is the SORTABLE grade -- both finder RPCs (0018/0019) rank and filter on it -- so a
// wrong value is invisible: the route simply sits in the wrong place in a list nobody cross-checks.
//
// WHY THIS ONE IS SAFE TO WRITE WHEN THE OTHER 113 DISAGREEMENTS ARE NOT. The catalog's V-grade
// convention was measured against the population that PASSES rather than reasoned about:
// 2,277 of 2,278 V-graded WA rows store the V NUMBER, 0 store a YDS equivalent, and this is the
// single row that differs. A convention with one exception is a defect, not a convention.
// (`scripts/oneoff/probe-v-grade-convention.mjs` is that measurement.)
//
// Declared-state contract: the row must still hold exactly what was measured, or this refuses
// rather than writing. A stale table must not half-apply.
import { requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";

const ID = "wa_shock_and_awe";
const EXPECT = { grade: "V3", grade_system: "v", grade_num: 10 };
const TO = 3;

requireServiceKey();

const [row] = await selectAll("routes", "id,grade,grade_system,grade_num", `id=eq.${ID}`);
if (!row) { console.error(`FAIL — ${ID} not found. Refusing.`); process.exit(1); }

for (const [k, v] of Object.entries(EXPECT)) {
  if (String(row[k]) !== String(v)) {
    console.error(`FAIL — ${ID}.${k} is ${JSON.stringify(row[k])}, expected ${JSON.stringify(v)}.`);
    console.error("The row has changed since it was measured. Refusing to write.");
    process.exit(1);
  }
}

console.log(`${ID}: grade=${row.grade} system=${row.grade_system} grade_num ${row.grade_num} -> ${TO}`);
await patchRow("routes", ID, { grade_num: TO });

// A 200 is not evidence the data changed. Re-read.
const [after] = await selectAll("routes", "id,grade_num", `id=eq.${ID}`);
if (!after || Number(after.grade_num) !== TO) {
  console.error(`FAIL — re-read shows grade_num=${after && after.grade_num}, not ${TO}.`);
  process.exit(1);
}
console.log(`verified: grade_num is now ${after.grade_num}, matching the V number as 2,277 sibling rows do.`);
