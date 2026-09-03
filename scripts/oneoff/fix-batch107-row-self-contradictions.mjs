// THREE BATCH-107 DEFECTS THE ROWS SETTLE THEMSELVES. Two are rope/protection claims a party packs
// off; the third is a rendered citation. Each is a DELETION or a copy of what the row already says.
//
// 1. wa_huckleberry_mountain_east_ridge -- A PACKING LIST OFFERING A ROPE THE DESCENT RULES OUT.
//    `gear` says "50-60m rope" and `detailed_rack` "A 50-60 m rope is recommended", while the SAME
//    ROW says three times that 60 m is required: pro_tips "A 60m rope is strongly recommended for
//    the rappel off the summit block", approach_variants hazards "a 60 m rope is needed for the
//    rappel off the summit block", and approach_variants "Bring a 60 m rope: a 30 m is
//    insufficient". A party packing off `gear` -- which is what `gear` is FOR -- brings 50 m to a
//    rappel three of its own fields say needs 60. rappel_detail, rappel_count_note and
//    rope_length_m are all null, so nothing on the page lets them check it.
//    The row's own majority AND the conservative direction agree, which is why this is decidable.
//
// 2. wa_himmelhorn_wild_hair_crack -- A 12-INCH CRACK CANNOT BE PROTECTED BY 2-INCH CAMS.
//    `pro_needs` reads "the signature 12-inch crack (P2) takes larger pieces (~2\")". Twelve inches
//    is nearly six times two inches, and the row's own `gear` and `detailed_rack` both cap the rack
//    at 2". Its own `watch_out` already states the truth -- "Protection on pitch 2's crux crack is
//    sparse for the first ~20 feet before improving". So the false clause is DELETED rather than
//    rewritten: the sentence still reads correctly without it, and the warning survives in
//    watch_out. Deleting beats rewriting here because how wide the gear WOULD need to be is not
//    something the row states, and inventing it is the fabrication class.
//
// 3. wa_golden_horn_southwest_route -- a rendered field NAMES A PUBLISHER as its source.
//    `rock_grade` reads "Low 5th class (Mountain Project rates it 'Easy 5th, Grade I')" against the
//    standing no-sources-anywhere-in-the-app rule. The documented repair shape (see
//    redact-per-source-attributions.mjs) is to keep the fact and drop who said it -- the grade
//    disagreement is real content and must survive; only the attribution goes.
//
// NOT REPAIRED, deliberately, though all three are real findings from the same batch:
//   * wa_golden_horn_southwest_route `gain_ft` 2700 against a 3,486 ft floor from its OWN pins
//     (4,880 trailhead -> 8,366 summit). Impossible, and the correct value is not in the row.
//   * The same row states the SR-20 closure THREE ways (access.closures "roughly Nov-May",
//     access.seasonal "early December-mid/late April", road.driveNote "mid-November through
//     mid/late spring"). Which is right needs WSDOT, so making them merely CONSISTENT would pick a
//     winner this script has no basis to pick.
//   * wa_himmelhorn_stonehenge `descent_text` says "one easy but loose pitch down toward the
//     summit" -- incoherent, since you are descending FROM the summit. The real descent is
//     unpublished (the AAJ gives none), so a repair would have to invent one.
//   * wa_huckleberry_mountain_east_ridge `detailed_rack` "small cams (about 0.5-0.75 in)" are
//     Camalot SIZES read as inches, but the row's own baseFinding says "#1 Camalot" -- the row
//     gives two different answers, so it does not settle its own units.
//
// DISCIPLINE: premises re-asserted against the live row, exactly-once matching, refuse on any
// mismatch, idempotent by the RESULT (not by a phrase the result contains), verified by re-read.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const DRY = !process.argv.includes("--apply");
const S = v => typeof v === "string" ? v : JSON.stringify(v ?? "");

const IDS = ["wa_huckleberry_mountain_east_ridge", "wa_himmelhorn_wild_hair_crack", "wa_golden_horn_southwest_route"];
const rows = await selectAll("routes",
  "id,gear,detailed_rack,pro_needs,pro_tips,watch_out,rock_grade,approach_variants,areas!inner(name)",
  `id=in.(${IDS.join(",")})`, { pageSize: 10, key: KEY });
const by = Object.fromEntries(rows.map(r => [r.id, r]));
for (const id of IDS) if (!by[id]) { console.error(`REFUSED: ${id} not found.`); process.exit(1); }

const plans = [], refuse = [];
const premise = (id, what, held) => { console.log(`  ${held ? "HOLDS " : "FAILED"} [${id}] ${what}`); if (!held) refuse.push(`${id}: ${what}`); };
const once = (hay, needle) => (hay.split(needle).length - 1) === 1;

// ---- 1. Huckleberry rope --------------------------------------------------------------------
{
  const r = by.wa_huckleberry_mountain_east_ridge, id = r.id;
  const avs = S(r.approach_variants);
  premise(id, "pro_tips says a 60 m rope is strongly recommended", /60\s?m rope is strongly recommended/i.test(S(r.pro_tips)));
  premise(id, "approach_variants says a 60 m rope is NEEDED", /60\s?m rope is needed/i.test(avs));
  premise(id, "approach_variants says a 30 m is insufficient", /30\s?m is insufficient/i.test(avs));
  const gear = Array.isArray(r.gear) ? r.gear.slice() : null;
  if (!gear) refuse.push(`${id}.gear is not an array`);
  const dr = S(r.detailed_rack);
  const DR_OLD = "A 50-60 m rope is recommended;";
  const DR_NEW = "A 60 m rope is needed;";
  const body = {}, labels = [];
  if (gear) {
    const i = gear.findIndex(x => String(x).trim() === "50-60m rope");
    if (i < 0) { if (gear.some(x => String(x).trim() === "60m rope")) console.log(`  == ${id}.gear: already applied — no-op.`); else refuse.push(`${id}.gear has neither "50-60m rope" nor "60m rope"`); }
    else if (gear.filter(x => String(x).trim() === "50-60m rope").length !== 1) refuse.push(`${id}.gear: entry appears more than once`);
    else { const g2 = gear.slice(); g2[i] = "60m rope"; body.gear = g2; labels.push(`gear[${i}] "50-60m rope" -> "60m rope"`); }
  }
  if (dr.includes(DR_NEW)) console.log(`  == ${id}.detailed_rack: already applied — no-op.`);
  else if (!dr.includes(DR_OLD)) refuse.push(`${id}.detailed_rack does not contain ${JSON.stringify(DR_OLD)}`);
  else if (!once(dr, DR_OLD)) refuse.push(`${id}.detailed_rack: clause appears more than once`);
  else { body.detailed_rack = dr.replace(DR_OLD, DR_NEW); labels.push(`detailed_rack: ${JSON.stringify(DR_OLD)} -> ${JSON.stringify(DR_NEW)}`); }
  if (labels.length) plans.push({ id, body, label: labels.join(" + "),
    check: v => Array.isArray(v.gear) && v.gear.includes("60m rope") && !v.gear.some(x => String(x).includes("50-60"))
      && S(v.detailed_rack).includes(DR_NEW) && !S(v.detailed_rack).includes(DR_OLD) });
}

// ---- 2. Wild Hair Crack: delete the false protectability clause ------------------------------
{
  const r = by.wa_himmelhorn_wild_hair_crack, id = r.id;
  premise(id, "the row's own rack caps at 2 inches", /\b2\s?(?:"|in\b)/i.test(S(r.gear) + S(r.detailed_rack)));
  premise(id, "watch_out already states protection is sparse on P2", /sparse for the first/i.test(S(r.watch_out)));
  const pn = S(r.pro_needs);
  // DELETE THE CONNECTIVE WITH THE CLAUSE. The first version of this cut only
  // ` takes larger pieces (~2")` and left "the signature 12-inch crack (P2) AND HAS some face
  // holds" -- a stranded "and", shipped to a climber. CLAUDE.md states the rule this broke in as
  // many words: PRINT THE RESULTING SENTENCE, never just the find/replace pair, because a deletion
  // leaves a dangling connective or a doubled space that is invisible from the edit alone. The
  // dry run showed the pair and looked fine. It is the same failure the citation-redaction work
  // already recorded when it stranded an "and that" clause.
  const OLD = ` takes larger pieces (~2") and`;
  const BROKEN = `12-inch crack (P2) and has some face holds`;  // what the first version produced
  if (pn.includes(BROKEN)) {
    plans.push({ id, body: { pro_needs: pn.replace(`(P2) and has`, `(P2) has`) },
      label: `pro_needs: REPAIR the stranded "and" left by this script's first version`,
      check: v => !S(v.pro_needs).includes(BROKEN) && /12-inch crack \(P2\) has some face holds/i.test(S(v.pro_needs)) });
  } else if (!pn.includes(OLD)) {
    if (/12-inch crack \(P2\) has some face holds/i.test(pn)) console.log(`  == ${id}.pro_needs: already applied — no-op.`);
    else refuse.push(`${id}.pro_needs does not contain the clause this repair removes; it reads ${JSON.stringify(pn.slice(0, 120))}`);
  } else if (!once(pn, OLD)) refuse.push(`${id}.pro_needs: clause appears more than once`);
  else {
    const want = pn.replace(OLD, "");
    plans.push({ id, body: { pro_needs: want }, label: `pro_needs: delete ${JSON.stringify(OLD.trim())} (a 12-inch crack is not protected by 2-inch cams)`,
      check: v => !S(v.pro_needs).includes(OLD) && /12-inch crack/i.test(S(v.pro_needs)) });
  }
}

// ---- 3. Golden Horn SW: drop the publisher, keep the grade ------------------------------------
{
  const r = by.wa_golden_horn_southwest_route, id = r.id;
  const OLD = "Low 5th class (Mountain Project rates it 'Easy 5th, Grade I')";
  const NEW = "Low 5th class (also cited as Easy 5th, Grade I)";
  const rg = S(r.rock_grade);
  if (rg === NEW) console.log(`  == ${id}.rock_grade: already applied — no-op.`);
  else if (rg !== OLD) refuse.push(`${id}.rock_grade is ${JSON.stringify(rg.slice(0, 90))}, not the string this repair is about`);
  else plans.push({ id, body: { rock_grade: NEW }, label: `rock_grade: drop the named publisher, keep the grade`,
    check: v => S(v.rock_grade) === NEW });
}

console.log("");
if (refuse.length) { for (const x of refuse) console.error(`  !! REFUSED ${x}`); console.error(`\nWriting nothing.`); process.exit(1); }
if (!plans.length) { console.log("Nothing to do — every edit is already applied."); process.exit(0); }
for (const p of plans) {
  console.log(`  -> ${p.id}\n     ${p.label}`);
  // PRINT THE RESULT. A find/replace pair cannot show a stranded connective or a doubled
  // space; only the composed sentence can.
  for (const [k, v] of Object.entries(p.body)) console.log(`     RESULT ${k} = ${JSON.stringify(S(v)).slice(0, 300)}`);
}
if (DRY) { console.log(`\nDRY RUN — ${plans.length} row patch(es). Re-run with --apply.`); process.exit(0); }

for (const p of plans) await patchRow("routes", p.id, p.body, { key: KEY });
const after = await selectAll("routes", "id,gear,detailed_rack,pro_needs,rock_grade", `id=in.(${plans.map(p => p.id).join(",")})`, { pageSize: 10, key: KEY });
const aby = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
console.log("");
for (const p of plans) { const held = p.check(aby[p.id] || {}); console.log(`  ${held ? "OK  " : "FAIL"} ${p.id}`); if (!held) bad++; }
console.log(bad ? `\n${bad} check(s) FAILED — re-read the rows.` : `\nApplied and verified: ${plans.length} row patch(es).`);
process.exitCode = bad ? 1 : 0;
