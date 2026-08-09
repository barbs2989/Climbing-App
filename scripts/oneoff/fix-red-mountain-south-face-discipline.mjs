// wa_south_face_7 — Red Mountain (Snoqualmie), "South Face" — is filed `discipline: trad`
// while every other field describes a class 3-4 unroped scramble. It is the single genuine
// misclassification in the catalog-wide class-grade audit (226 hits; the other 225 are bare
// OpenBeta crag imports whose GRADE is the bad field — see memory
// class-grade-is-not-a-scramble-signal, do not touch those).
//
// It matches the same fingerprint as the one confirmed fix in the 2026-08-05 audit:
//   on a PEAK area (wa_red_mountain_snoqualmie), not a crag
//   an enrichment-written overview: "several class 3 pitches, typically done unroped"
//   pro_needs: "No gear generally needed on the standard class 3 line"
//   gear is helmet + optional rap webbing — no rack
//   pitches: 0, grade "4th" / grade_system "class"
//
// Consequence of the wrong value: catOf() -> "trad" put it under the Trad filter chip and
// gave it trad gear advice ("Trad rack", "place protection before the hard moves") that is
// wrong for an unroped scramble.
//
// Read-back reconciles the row afterwards; a 200 is not evidence the data changed.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_south_face_7";
const EXPECT_AREA = "wa_red_mountain_snoqualmie";
const APPLY = process.argv.includes("--apply");

const key = anonKey();
const get = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,name,discipline,grade,grade_system,pitches&id=eq.${ID}`, { headers: headers(key) });
  const rows = JSON.parse(await r.text());
  return rows[0];
};

const before = await get();
if (!before) throw new Error(`${ID} not in the live DB — refusing to write. A name-shaped id that returns nothing is exactly how Triple Couloirs was destroyed.`);
// Never trust a name-shaped id: assert the row sits on the peak we mean before writing.
if (before.area_id !== EXPECT_AREA) throw new Error(`${ID} is on ${before.area_id}, expected ${EXPECT_AREA} — aborting.`);
console.log("before:", JSON.stringify(before));

if (before.discipline === "scrambling") { console.log("already scrambling — nothing to do."); process.exit(0); }
if (before.discipline !== "trad") throw new Error(`expected discipline "trad", found ${JSON.stringify(before.discipline)} — someone else changed it; re-audit before writing.`);

if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

await patchRow("routes", ID, { discipline: "scrambling" });
const after = await get();
console.log("after: ", JSON.stringify(after));
if (after.discipline !== "scrambling") throw new Error("read-back does not show scrambling — the write did not land.");
console.log("\nreconciled: 1 row, discipline trad -> scrambling.");
