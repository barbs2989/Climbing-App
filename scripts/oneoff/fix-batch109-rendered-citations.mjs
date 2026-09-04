// BATCH 109 REPAIRS. Two rendered fields name a third party as the source of a claim, which the
// app's standing rule forbids anywhere a climber can read it. Both were verified to RENDER before
// being touched -- `access.passRequired` and `pro_tips` both reach the route page.
//
// 1. wa_magic_mountain_northwest_ridge `access.passRequired` -- NAMES A PUBLISHER AND THEN ARGUES
//    WITH IT ON SCREEN. It reads "None at the Cascade Pass trailhead. SummitPost's claim that a
//    Northwest Forest Pass is needed conflicts with NPS and current guide information — the
//    trailhead is inside the park." A climber learns nothing from the dispute and is shown the app
//    contending with a website. This is the same shape CLAUDE.md records for
//    wa_don_t_climb_that_she_said, where an editor's note to the next editor shipped to a climber.
//    THE FACT IS CORRECT AND IS KEPT: no pass is required, because the trailhead is inside the
//    park. Only the attribution and the argument go. Both surviving clauses are the row's own words.
//
// 2. wa_little_annapurna_south_face `pro_tips` -- "Identify the correct gully (west of the tarn)
//    matching Beckey's description before committing to the talus apron". Here "Beckey" is a
//    CITATION, not a route name, which is the distinction that matters: CLAUDE.md records that the
//    citation audit's needle requires a guide word beside the name precisely because "Beckey Route"
//    names a line rather than a source. "Beckey's DESCRIPTION" is a source. A pure deletion of the
//    attributing clause leaves the sentence grammatical and keeps everything a climber needs --
//    which gully (west of the tarn) and what not to do before identifying it.
//
// NOT REPAIRED, recorded so the omissions are not read as oversight:
//   * wa_little_sister_southeast_ridge has a waypoint NAMED "Little Sister Southeast Ridge (Mountain
//     Project reference point)" whose value is byte-for-byte that area's coordinate. It is a rendered
//     sources-rule breach AND a centroid copy -- but deleting the parenthetical leaves a pin claiming
//     to be the route's location when it is the area's, so the citation is currently the honest half.
//     Removing it would make the row assert MORE than it knows. Needs the pin fixed, not the name.
//   * wa_lichtenberg_mountain_west_face narrates our own research in four rendered fields ("the
//     detail in it could not be recovered here", "Not documented in any available source"). The voice
//     is wrong AND the underlying negative is false -- AAJ 1995 documents the route (Bertulis, 6
//     pitches, II 5.8) -- so a voice-only fix would leave a false claim in better prose. Needs the
//     source read directly.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const S = v => (typeof v === "string" ? v : JSON.stringify(v ?? ""));
const APPLY = process.argv.includes("--apply");
const IDS = ["wa_magic_mountain_northwest_ridge", "wa_little_annapurna_south_face"];

const rows = await selectAll("routes", "*", `id=in.(${IDS.join(",")})`, { pageSize: 10, key: KEY });
if (rows.length !== IDS.length) { console.error(`SHORT READ: ${rows.length} of ${IDS.length}`); process.exit(1); }
const by = Object.fromEntries(rows.map(r => [r.id, r]));
const plans = [];
const refuse = m => { console.error(`REFUSED: ${m}`); process.exit(1); };

// ------------------------------------------------- 1. Magic Mountain: drop the publisher + argument
{
  const r = by.wa_magic_mountain_northwest_ridge;
  const acc = r.access;
  if (!acc || typeof acc !== "object") refuse("magic: `access` is not an object");
  const cur = S(acc.passRequired);
  const NEW = "None at the Cascade Pass trailhead — it is inside the park.";
  if (cur === NEW) console.log("  == magic: already applied — no-op.");
  else {
    // PREMISES re-asserted against the live row, not trusted from the audit.
    if (!/SummitPost/i.test(cur)) refuse(`magic: passRequired no longer names SummitPost — re-read before editing:\n     ${cur}`);
    if (!/inside the park/i.test(cur)) refuse("magic: the surviving fact (\"inside the park\") is not in the current value — it would have to be invented");
    if (!/^None at the Cascade Pass trailhead/.test(cur)) refuse("magic: the value no longer opens with the fact being kept");
    plans.push({ id: r.id, label: `access.passRequired — drop the SummitPost attribution and the on-screen argument`,
                 show: "passRequired", body: { access: { ...acc, passRequired: NEW } } });
  }
}

// ------------------------------------------------- 2. Little Annapurna: delete the attributing clause
{
  const r = by.wa_little_annapurna_south_face;
  const tips = Array.isArray(r.pro_tips) ? r.pro_tips : null;
  if (!tips) refuse(`little annapurna: pro_tips is not an array (${typeof r.pro_tips})`);
  const CLAUSE = " matching Beckey's description";
  const hits = tips.filter(t => String(t).includes(CLAUSE)).length;
  if (!hits && tips.some(t => /Identify the correct gully/.test(String(t)))) console.log("  == little annapurna: already applied — no-op.");
  else if (hits !== 1) refuse(`little annapurna: ${hits} pro_tips entries contain ${JSON.stringify(CLAUSE)} — expected exactly 1`);
  else plans.push({ id: r.id, label: `pro_tips — delete ${JSON.stringify(CLAUSE)} (a source, not a route name)`,
                    body: { pro_tips: tips.map(t => String(t).replace(CLAUSE, "")) } });
}

if (!plans.length) { console.log("\nNothing to do."); process.exit(0); }
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${plans.length} edit(s):\n`);
for (const p of plans) {
  console.log(`  -> ${p.id}\n     ${p.label}`);
  // PRINT THE COMPOSED RESULT. A find/replace pair cannot show a stranded connective or a doubled
  // space; batch 107 shipped exactly that, and I did it again in a note this session.
  // Print the CHANGED SUBFIELD, not the whole column. A jsonb edit printed as the whole object
  // buries the one clause that moved -- the first run of this script sliced `access` at 400 chars
  // and the new passRequired was past the cut, so the result was unreadable and the print useless.
  for (const [k, v] of Object.entries(p.body)) {
    if (p.show) console.log(`     RESULT ${k}.${p.show} = ${JSON.stringify(S(v[p.show]))}`);
    else console.log(`     RESULT ${k} = ${JSON.stringify(S(v)).slice(0, 400)}`);
  }
  console.log("");
}
if (!APPLY) { console.log("Re-run with --apply."); process.exit(0); }

for (const p of plans) { await patchRow("routes", p.id, p.body, { key: KEY }); console.log(`  applied ${p.id}`); }

// VERIFY BY RE-READ. A 200 is not evidence the row changed.
const after = await selectAll("routes", "id,access,pro_tips", `id=in.(${IDS.join(",")})`, { pageSize: 10, key: KEY });
const a = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
const mg = S(a.wa_magic_mountain_northwest_ridge.access?.passRequired);
if (/SummitPost/i.test(mg) || !/inside the park/i.test(mg)) { console.error(`  !! magic did not take: ${mg}`); bad++; }
const la = S(a.wa_little_annapurna_south_face.pro_tips);
if (/Beckey/i.test(la) || !/Identify the correct gully/.test(la)) { console.error("  !! little annapurna did not take"); bad++; }
console.log(bad ? `\nVERIFY FAILED on ${bad} row(s).` : "\nVerified by re-read: both edits are live.");
process.exit(bad ? 1 : 0);
