// `rappels` on wa_west_face_2 denies per-station lengths its own row states FIVE ways.
//
// The RAPPELS panel on the Plan tab reads, in this order:
//
//   RAPPELS - 4 stations - two ropes (longest 50 m) - On file - 558 ft total
//   "A single 60 m rope does not reach the longest station here (50 m)..."
//   "the published descent is roughly 50 m, 50 m, 50 m and a short 20 m..."
//   R1 164 ft   R2 164 ft   R3 164 ft   R4 66 ft
//   "4 double-rope rappels down the West Face; per-station lengths unconfirmed"   <- this
//
// The page states four station lengths three times over and then says the per-station lengths
// are unconfirmed. One screen, two answers, on a rappel record.
//
// WHICH HALF IS STALE IS NOT A JUDGEMENT CALL HERE. #1043 nulled 50/50/50/20 on the reasoning
// that this route's own `descent_text` said "~30 m each" and its gear list specified a single
// 60 m rope. A later research pass reversed that with a source, and updated every record EXCEPT
// this summary:
//
//   rappel_detail       50, 50, 50, 20
//   rappel_count_note   "the published descent is roughly 50 m, 50 m, 50 m and a short 20 m",
//                       "Two independent accounts describe the descent as double-rope throughout"
//   descent_text        "four consecutive double-rope rappels of roughly 50 m, 50 m, 50 m and 20 m"
//   gear                "Two 60m dynamic ropes - the descent is four double-rope rappels and one
//                        rope will not complete it"
//
// Five records against one clause. All four are re-asserted at apply time, so if the row is
// re-researched again this refuses rather than writing over the new state.
//
// A CLASS OF ONE, MEASURED: across the 113 WA routes whose `rappel_detail` states lengths,
// exactly ONE has a `rappels` string denying them. No detector - that is the thing this repo
// keeps declining to build.
//
// THE HEDGE IS NOT LOST WITH THE CLAUSE, which is the rule this file is held to: the count note
// says "roughly" and names its two accounts, and both render directly above the summary. What is
// removed is a claim the row contradicts, not an uncertainty it carries.
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_west_face_2";
const WAS = "4 double-rope rappels down the West Face; per-station lengths unconfirmed";
const NOW = "4 double-rope rappels down the West Face";
// Each corroborating record, and the fragment that must still be in it.
const CORROBORATE = [
  ["rappel_count_note", "50 m, 50 m, 50 m and a short 20 m"],
  ["descent_text", "roughly 50 m, 50 m, 50 m and 20 m"],
];
const LENGTHS = [50, 50, 50, 20];

const apply = process.argv.includes("--apply");
const h = headers(requireServiceKey());
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${ID}`, { headers: h });
if (!res.ok) { console.error(`read failed ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== 1) { console.error(`REFUSED - ${ID} returned ${rows.length} rows`); process.exit(1); }
const r = rows[0];

if (r.rappels !== WAS) {
  console.error(`REFUSED - \`rappels\` is not the value this repair was written against.`);
  console.error(`  expected ${JSON.stringify(WAS)}`);
  console.error(`  found    ${JSON.stringify(r.rappels)}`);
  process.exit(1);
}
const det = Array.isArray(r.rappel_detail) ? r.rappel_detail.map((x) => x && x.lengthM) : [];
if (det.length !== LENGTHS.length || det.some((v, i) => v !== LENGTHS[i])) {
  console.error(`REFUSED - rappel_detail no longer states ${LENGTHS.join("/")}; it states ${JSON.stringify(det)}.`);
  console.error(`  The summary would then not be contradicting anything, and this repair has no basis.`);
  process.exit(1);
}
for (const [col, frag] of CORROBORATE) {
  if (!String(r[col] || "").includes(frag)) {
    console.error(`REFUSED - ${col} no longer says ${JSON.stringify(frag)}.`);
    console.error(`  The five-against-one reading this rests on is gone; re-read the row.`);
    process.exit(1);
  }
}
const gearSaysTwoRopes = (Array.isArray(r.gear) ? r.gear : []).some((g) => /two\s*60\s*m/i.test(String(g)));
if (!gearSaysTwoRopes) { console.error("REFUSED - the gear list no longer names two 60 m ropes."); process.exit(1); }

console.log(`${ID} - ${r.name}`);
console.log(`  rappel_detail states  : ${LENGTHS.join(" / ")} m  (${LENGTHS.reduce((a, b) => a + b, 0)} m total)`);
for (const [col, frag] of CORROBORATE) console.log(`  ${col.padEnd(21)}: ...${frag}...`);
console.log(`  gear                 : names two 60 m ropes`);
console.log(`\n  was : ${JSON.stringify(WAS)}`);
console.log(`  now : ${JSON.stringify(NOW)}`);

if (!apply) { console.log("\ndry run - pass --apply to write"); process.exit(0); }

await patchRow("routes", ID, { rappels: NOW });
const back = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=rappels,rappel_detail&id=eq.${ID}`, { headers: h })).json();
if (back[0].rappels !== NOW) { console.error("VERIFY FAILED - the row did not come back with the new value."); process.exit(1); }
const d2 = (back[0].rappel_detail || []).map((x) => x && x.lengthM);
if (d2.join(",") !== LENGTHS.join(",")) { console.error("VERIFY FAILED - rappel_detail moved during the write."); process.exit(1); }
console.log("\nverified: the summary no longer denies the lengths, and the station table is unchanged.");
