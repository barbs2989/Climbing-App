// `wa_don_t_climb_that_she_said`'s `approach` column opens by admitting no beta exists — "No
// route-specific trailhead or approach beta ... turned up anywhere online" — and then CARRIES ON
// FOR ANOTHER HUNDRED WORDS inventing one: "Expect an informal boot-path or use-trail through
// forest/talus for under a mile with negligible elevation change; watch for the usual approach
// hazards ...". That second half is derived from the row's `dist_km` and nothing else, and it
// renders on the Planner tab under APPROACH, where a climber reads it as beta.
//
// TWO DIFFERENT THINGS LIVE IN THAT COLUMN AND ONLY ONE IS A DEFECT. CLAUDE.md already records
// that a DOCUMENTED NEGATIVE RESULT is evidence worth keeping — five Goose Egg routes say "no
// published approach, pitch-by-pitch, or gear beta was found beyond this record", and writing a
// plausible approach over that is fabrication. So a bare admission is CORRECT. What is not correct
// is an admission followed by speculation dressed as beta.
//
// MEASUREMENT ONLY — nothing is written. The question is whether this is one row or a class, which
// is what decides whether it deserves a detector at all.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,discipline,area_id,approach,beta,overview,dist_km", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read zero routes; a broken scan, not a clean catalog."); process.exit(1); }

/* An ADMISSION that the record is empty. These are lifted from the prose that exists rather than
   imagined, so the scan is not fishing. */
const ADMITS = /\bno (?:route-specific |published |documented |detailed )?(?:trailhead|approach|pitch|gear|beta|information|details?)\b[^.]{0,80}\b(?:turned up|was found|were found|is available|are available|could be found|exists?)\b|\bnot (?:cross-referenced|documented|published)\b|\bno .{0,40}beta\b[^.]{0,60}\b(?:found|available|online)\b/i;
/* SPECULATION presented as advice. "Expect", "likely", "presumably" are the tell — a real beta
   sentence states what IS there, not what a reader should assume. */
const SPECULATES = /\b(?:expect|presumably|likely|probably|would likely|should expect|reads like|appears to be|is likely to be)\b/i;

const admits = [], both = [];
for (const r of rows) {
  for (const f of ["approach", "beta", "overview"]) {
    const v = r[f];
    if (typeof v !== "string" || !v.trim()) continue;
    if (!ADMITS.test(v)) continue;
    admits.push({ r, f, v });
    if (SPECULATES.test(v)) both.push({ r, f, v });
    break;
  }
}

console.log(`${rows.length} WA routes`);
console.log(`${admits.length} carry prose ADMITTING the record is empty  (a documented negative — evidence, not a defect)`);
console.log(`${both.length} of those go on to SPECULATE in the same field  (the defect: an admission dressed up as beta)\n`);

console.log(`--- admission AND speculation (${both.length}) ---`);
for (const x of both.slice(0, 20)) {
  console.log(`\n  ${x.r.id}  [${x.r.discipline}]  field=${x.f}  dist_km=${x.r.dist_km}`);
  const spec = x.v.split(/(?<=[.!?])\s+/).filter((s) => SPECULATES.test(s));
  for (const s of spec.slice(0, 3)) console.log(`     SPECULATES: ${s.trim().slice(0, 200)}`);
}
if (both.length > 20) console.log(`\n  … ${both.length - 20} more`);

console.log(`\n--- admission ONLY, i.e. correct (${admits.length - both.length}) — sample ---`);
for (const x of admits.filter((a) => !both.includes(a)).slice(0, 5)) {
  console.log(`  ${x.r.id.padEnd(52)} field=${x.f}`);
}

console.log(`\nNOT A DEFECT LIST until read. A documented negative result is worth keeping; only the`);
console.log(`speculation half is the problem, and telling them apart needs the sentence, not the flag.`);
console.log(`\nMEASURED PRECISION, and the number does NOT go to zero after the fix — deliberately.`);
console.log(`Both rows still flag, and both are now HONEST HEDGES ABOUT EVIDENCE rather than invented`);
console.log(`terrain: "the name itself reads like a locally-known label" (part of the admission that`);
console.log(`was KEPT) and "parties would likely use the same general approach as the neighbouring`);
console.log(`route" (a stated uncertainty, left alone on purpose). The hedge word is the same in both`);
console.log(`the honest and the invented case — "expect", "likely", "reads like" — so the discriminator`);
console.log(`is whether the sentence asserts TERRAIN THE ROW HAS NO SOURCE FOR, which no regex can see.`);
console.log(`Tightening this scan until it printed 0 would be fitting it to the answer already known;`);
console.log(`it stays a 2-row reading list. Class size across 8,365 routes: 1 real defect, now fixed.`);
