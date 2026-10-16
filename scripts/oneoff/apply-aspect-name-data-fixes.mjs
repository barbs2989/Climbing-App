// Applies audits/sql/2026-08-14-aspect-name-data-fixes.sql through the guarded write path instead of
// the SQL editor. Same two statements, same guards, but patchRow throws unless exactly one row comes
// back — so a wrong id or an RLS rejection cannot read as success, which a hand-run UPDATE can
// (the editor reports success for a statement that matched zero rows).
//
// Evidence for both: research-data/ASPECT-NAME-RESOLUTIONS-2026-08-14.md
//
//   node scripts/oneoff/apply-aspect-name-data-fixes.mjs [--dry]
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");

// `expect` mirrors the SQL's `AND <col> = <value>` guard: the row must still hold the value the
// research was done against, or another session has changed it and this must not fire.
const FIXES = [
  {
    id: "wa_luahna_peak_east_slopes",
    expect: { aspect: "N" },
    set: { aspect: "E", face: "Upper Richardson Glacier to the East Ridge" },
    why: "face described the Napeequa-side Pilz/Butterfly route; this row's own approach is the Richardson Glacier / East Ridge line. The NAME is right and the DATA is wrong — the only row in the set that runs that way.",
  },
  {
    id: "wa_spire_point_southwest_face",
    expect: { grade: "Grade II-III, 5.6" },
    set: { grade: "Class 4", pitches: null },
    why: "grade and pitches are the SOUTH FACE's numbers (5.6, 5 pitches, per Beckey) on a row whose prose is the East Face standard route (Class 4). No South Face row exists, so nothing is lost.",
  },
];

const ids = FIXES.map(f => f.id);
const before = await selectAll("routes", "id,name,aspect,face,grade,pitches", `id=in.(${ids.join(",")})`, { pageSize: 10 });
const byId = Object.fromEntries(before.map(r => [r.id, r]));

let refused = 0;
for (const f of FIXES) {
  const row = byId[f.id];
  if (!row) { console.error(`REFUSING ${f.id} — row not returned`); refused++; continue; }
  for (const [k, v] of Object.entries(f.expect)) {
    if (row[k] !== v) {
      console.error(`REFUSING ${f.id} — ${k} is ${JSON.stringify(row[k])}, expected ${JSON.stringify(v)}. The row has changed since this was researched.`);
      refused++;
    }
  }
}
if (refused) { console.error(`\n${refused} refusal(s); nothing written.`); process.exit(1); }

for (const f of FIXES) {
  const row = byId[f.id];
  console.log(`\n${f.id}  "${row.name}"`);
  for (const [k, v] of Object.entries(f.set)) console.log(`   ${k}: ${JSON.stringify(row[k])} -> ${JSON.stringify(v)}`);
  if (DRY) { console.log("   --dry, not written"); continue; }
  await patchRow("routes", f.id, f.set);
  console.log("   written");
}
if (DRY) process.exit(0);

// Re-read and reconcile. A 200 is not evidence the data changed.
const after = await selectAll("routes", "id,name,aspect,face,grade,pitches", `id=in.(${ids.join(",")})`, { pageSize: 10 });
const afterById = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
console.log("\n--- verify on re-read ---");
for (const f of FIXES) {
  const row = afterById[f.id];
  if (!row) { console.error(`  BAD ${f.id} — gone`); bad++; continue; }
  for (const [k, v] of Object.entries(f.set)) {
    const ok = JSON.stringify(row[k]) === JSON.stringify(v);
    console.log(`  ${ok ? "ok  " : "BAD "} ${f.id}.${k} = ${JSON.stringify(row[k])}`);
    if (!ok) bad++;
  }
}
console.log(bad ? `\n${bad} PROBLEM(S)` : "\nboth fixes verified on re-read");
process.exitCode = bad ? 1 : 0;
