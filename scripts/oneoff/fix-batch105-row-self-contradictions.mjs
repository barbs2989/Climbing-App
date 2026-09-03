// BATCH 105'S SELF-CONTRADICTIONS: six edits across four rows, none of which needs a source.
//
// Every edit below is a DELETION of a false clause or a COPY of a value the row already holds in
// another field. Nothing here is researched, and nothing invents a number. Each declares the exact
// string it expects, re-asserts its premises against the live row at apply time, refuses rather
// than writing on any mismatch, is idempotent by EQUALITY (never by a phrase its own replacement
// contains -- the fix-batch104 trap), and verifies by re-read.
//
// 1. wa_east_ridge_9.descent_text -- ROPE OFF THE END, and the row forbids it three times over.
//    descent_text instructs "three rappels with a single 60m rope". The same row's `rappels` says
//    "4 rappels on a single 60 m rope, or 3 on two 60 m ropes"; its `rappel_count_note` says "The
//    three stations listed here are the TWO-ROPE sequence"; and its approach_variants.hazards says
//    "A 60 m rope comes up short on the shared South Ridge rappel descent". So the three-station
//    sequence descent_text describes is the two-rope one, and a party rigging it on a single 60 m
//    rope runs off the end. A rope doubled through an anchor reaches HALF its length; this is the
//    worst thing in this dataset to get wrong. The replacement is copied verbatim from `rappels`.
//
// 2. wa_earl_peak_standup_creek_route.discipline -- `trad` on an unroped walk-up. The row's own
//    rock_grade is "Class 2-3 (scramble)", its detailed_rack is "No rack used; treated as an
//    unroped scramble", and grade, grade_system, grade_num, pitches and rappels are ALL null. There
//    is nothing on the row that is a trad climb. `scrambling` is an established spelling (220 WA
//    rows), not a coinage. It is not cosmetic: discipline gates the safety advice and the camping
//    panel, so a scramble filed as trad is offered rock-climbing advice and mislabelled everywhere
//    a discipline chip renders.
//
// 3. wa_earl_peak_standup_creek_route.gear -- "Northwest Forest Pass" as a gear entry. `gear`
//    renders as the RACK/packing bullets, so a parking pass reads as something to carry up the
//    route. The documented non-gear-packing-entry shape. Deleting it loses nothing: the same fact
//    is stated in what_to_bring[0], access.fees AND access.passRequired.
//
// 4. wa_dirty_sanchez.access.notes -- "basalt" where the row's own `hazards` says "Columnar
//    andesite". One screen, two rock types. Only the one word is touched; the rest of that sentence
//    ("hundreds of bolted routes") is a claim about the CRAG that the row cannot settle, so it is
//    deliberately left for a sourced pass. A partial repair is fine here because the rock type is
//    independently wrong and fixing it creates no new inconsistency.
//
// 5. wa_dirty_sanchez.length_m -- 274 m = 899 ft against the row's OWN overview, "A 700-foot,
//    7-pitch alpine rock climb". 700 ft = 213 m, and 7 pitches x ~30 m corroborates 213 rather than
//    274. MEASURED FIRST, because two unrelated rows in this batch both store 274 and that is the
//    duplicate-value fingerprint: 19 WA rows hold it, but the whole length_m distribution is round
//    FEET converted (244=800ft x38, 610=2000ft x34, 305=1000ft x31, 366=1200ft x30), so 274 is
//    simply 900 ft and not a placeholder. wa_earl_peak_standup_creek_route's own 274 is its beta's
//    genuine "900 ft" of vertical for the final scramble and is deliberately NOT touched.
//
// 6. wa_der_dihedral.access.permit -- "Free Self-Issue Day Permit" on a row whose own itinerary is
//    a THREE-DAY trip camping two nights at Colchuck Lake, whose own itinerary.cal says "Requires a
//    Colchuck Lake overnight permit (May 15-Oct 31 lottery) if camping", and whose own
//    timing.recommendedStart is "3:30 AM from camp". A climber reading the PERMIT field is told a
//    free day permit covers the trip the row describes. The day-use half is kept -- it is correct
//    in isolation -- and the overnight condition is copied from itinerary.cal.
//
// NOT TOUCHED, deliberately, and each for a stated reason:
//   * wa_der_dihedral.access.fees "Free" beside a Northwest Forest Pass -- the open product
//     decision (158 WA rows across 43 blobs). Do not sweep either way.
//   * wa_dirty_sanchez.dist_km 0.25 below its own 0.337 km chord -- a real defect, but the correct
//     value needs a measured approach and this applier must not invent one.
//   * wa_davis_peak_nc_north_face.grade 5.6 against its own pitch_detail 5.9-5.10 -- the row is a
//     MERGE of two different climbs, so correcting one field before the merge is untangled would
//     make the row more confidently wrong, not less.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const DRY = !process.argv.includes("--apply");
const S = v => typeof v === "string" ? v : JSON.stringify(v ?? "");

const IDS = ["wa_east_ridge_9", "wa_earl_peak_standup_creek_route", "wa_dirty_sanchez", "wa_der_dihedral"];
const rows = await selectAll("routes",
  "id,discipline,length_m,gear,what_to_bring,rock_grade,detailed_rack,grade,grade_system,grade_num," +
  "pitches,rappels,rappel_count_note,descent_text,overview,hazards,access,itinerary,timing",
  `id=in.(${IDS.join(",")})`, { pageSize: 20, key: KEY });
const by = Object.fromEntries(rows.map(r => [r.id, r]));
for (const id of IDS) if (!by[id]) { console.error(`REFUSED: ${id} not found.`); process.exit(1); }

const RAP_FIND = "three rappels with a single 60m rope";
const RAP_REPL = "three rappels on two 60 m ropes (four rappels if you carry a single 60 m rope)";
const PASS_ENTRY = "Northwest Forest Pass";
const PERMIT_OLD = "Free Self-Issue Day Permit";
const PERMIT_NEW = "Free self-issue day permit for a day ascent. This route's own itinerary camps " +
  "two nights at Colchuck Lake, which additionally requires a Colchuck Lake overnight permit " +
  "(May 15-Oct 31 lottery).";

const plans = [];
const refuse = [];
const premise = (id, what, held) => { console.log(`  ${held ? "HOLDS " : "FAILED"} [${id}] ${what}`); if (!held) refuse.push(`${id}: premise failed — ${what}`); };

// ---- 1. rope ---------------------------------------------------------------------------------
{
  const r = by.wa_east_ridge_9, dt = S(r.descent_text);
  premise(r.id, "`rappels` states the two-rope/one-rope split", /4 rappels on a single 60\s?m rope, or 3 on two 60\s?m ropes/i.test(S(r.rappels)));
  premise(r.id, "`rappel_count_note` calls the three stations the two-rope sequence", /three stations listed here are the two-rope sequence/i.test(S(r.rappel_count_note)));
  if (dt.includes(RAP_REPL)) console.log(`  == ${r.id}.descent_text: already applied — no-op.`);
  else if (!dt.includes(RAP_FIND)) refuse.push(`${r.id}.descent_text: does not contain ${JSON.stringify(RAP_FIND)}`);
  else if (dt.split(RAP_FIND).length - 1 !== 1) refuse.push(`${r.id}.descent_text: the clause appears more than once`);
  else plans.push({ id: r.id, label: "descent_text (rope)", body: { descent_text: dt.replace(RAP_FIND, RAP_REPL) },
    old: RAP_FIND, neu: RAP_REPL, check: v => S(v.descent_text).includes(RAP_REPL) && !S(v.descent_text).includes(RAP_FIND) });
}

// ---- 2 + 3. discipline and the non-gear entry (one row, so one patch) -------------------------
{
  const r = by.wa_earl_peak_standup_creek_route;
  premise(r.id, "rock_grade calls it a scramble", /scramble/i.test(S(r.rock_grade)));
  premise(r.id, "detailed_rack says no rack, unroped", /no rack used|unroped scramble/i.test(S(r.detailed_rack)));
  premise(r.id, "grade/grade_system/grade_num/pitches/rappels are all null",
    [r.grade, r.grade_system, r.grade_num, r.pitches, r.rappels].every(x => x === null || x === undefined));
  premise(r.id, "the pass is stated elsewhere (what_to_bring + access)",
    /northwest forest pass/i.test(S(r.what_to_bring)) && /northwest forest pass/i.test(S(r.access?.passRequired) + S(r.access?.fees)));
  const gear = Array.isArray(r.gear) ? r.gear.slice() : null;
  if (!gear) refuse.push(`${r.id}.gear is not an array`);
  const body = {}; const labels = [];
  if (r.discipline === "scrambling") console.log(`  == ${r.id}.discipline: already applied — no-op.`);
  else if (r.discipline !== "trad") refuse.push(`${r.id}.discipline is ${JSON.stringify(r.discipline)}, not "trad"`);
  else { body.discipline = "scrambling"; labels.push(`discipline trad -> scrambling`); }
  if (gear) {
    const idx = gear.findIndex(g => String(g).trim() === PASS_ENTRY);
    if (idx < 0) console.log(`  == ${r.id}.gear: already applied — no-op.`);
    else if (gear.filter(g => String(g).trim() === PASS_ENTRY).length !== 1) refuse.push(`${r.id}.gear: the pass entry appears more than once`);
    else { const g2 = gear.slice(); g2.splice(idx, 1); body.gear = g2; labels.push(`gear -= ${JSON.stringify(PASS_ENTRY)} (${gear.length} -> ${g2.length})`); }
  }
  if (labels.length) plans.push({ id: r.id, label: labels.join(" + "), body,
    old: `trad / ${gear ? gear.length : "?"} gear entries`, neu: `scrambling / ${body.gear ? body.gear.length : "?"} gear entries`,
    check: v => v.discipline === "scrambling" && Array.isArray(v.gear) && !v.gear.some(g => String(g).trim() === PASS_ENTRY) });
}

// ---- 4 + 5. rock type and length (one row, so one patch) -------------------------------------
{
  const r = by.wa_dirty_sanchez;
  premise(r.id, "the row's own hazards say columnar andesite", /columnar andesite/i.test(S(r.hazards)));
  premise(r.id, "the row's own overview says 700-foot", /700-foot/i.test(S(r.overview)));
  const acc = r.access ? JSON.parse(JSON.stringify(r.access)) : null;
  if (!acc) refuse.push(`${r.id}: no access blob`);
  const body = {}; const labels = [];
  if (acc) {
    const n = S(acc.notes);
    if (/andesite/i.test(n) && !/basalt/i.test(n)) console.log(`  == ${r.id}.access.notes: already applied — no-op.`);
    else if (!/\bbasalt\b/i.test(n)) refuse.push(`${r.id}.access.notes: no "basalt" to correct; it now reads ${JSON.stringify(n.slice(0, 90))}`);
    else if ((n.match(/\bbasalt\b/gi) || []).length !== 1) refuse.push(`${r.id}.access.notes: "basalt" appears more than once`);
    else { acc.notes = n.replace(/\bbasalt\b/i, "andesite"); body.access = acc; labels.push(`access.notes basalt -> andesite`); }
  }
  if (r.length_m === 213) console.log(`  == ${r.id}.length_m: already applied — no-op.`);
  else if (r.length_m !== 274) refuse.push(`${r.id}.length_m is ${r.length_m}, not 274`);
  else { body.length_m = 213; labels.push(`length_m 274 (899 ft) -> 213 (700 ft, the row's own overview)`); }
  if (labels.length) plans.push({ id: r.id, label: labels.join(" + "), body,
    old: `basalt / 274 m`, neu: `andesite / 213 m`,
    check: v => v.length_m === 213 && /andesite/i.test(S(v.access?.notes)) && !/\bbasalt\b/i.test(S(v.access?.notes)) });
}

// ---- 6. day permit on a three-day itinerary --------------------------------------------------
{
  const r = by.wa_der_dihedral;
  premise(r.id, "itinerary.cal names the Colchuck Lake overnight permit lottery", /colchuck lake overnight permit \(may 15-oct 31 lottery\)/i.test(S(r.itinerary?.cal)));
  premise(r.id, "the itinerary really is three days with a camp", (r.itinerary?.days || []).length === 3 && /camp/i.test(S((r.itinerary?.days || []).map(d => d.title))));
  const acc = r.access ? JSON.parse(JSON.stringify(r.access)) : null;
  if (!acc) refuse.push(`${r.id}: no access blob`);
  else if (S(acc.permit) === PERMIT_NEW) console.log(`  == ${r.id}.access.permit: already applied — no-op.`);
  else if (S(acc.permit) !== PERMIT_OLD) refuse.push(`${r.id}.access.permit is ${JSON.stringify(S(acc.permit).slice(0, 90))}, not the string this repair is about`);
  else { acc.permit = PERMIT_NEW; plans.push({ id: r.id, label: "access.permit (day permit on a 3-day trip)", body: { access: acc },
    old: PERMIT_OLD, neu: PERMIT_NEW, check: v => S(v.access?.permit) === PERMIT_NEW }); }
}

console.log("");
if (refuse.length) { for (const x of refuse) console.error(`  !! REFUSED ${x}`); console.error(`\nWriting nothing. Re-read the rows.`); process.exit(1); }
if (!plans.length) { console.log("Nothing to do — every edit is already applied."); process.exit(0); }
for (const p of plans) console.log(`  -> ${p.id}\n     ${p.label}\n     OLD ${JSON.stringify(String(p.old).slice(0, 130))}\n     NEW ${JSON.stringify(String(p.neu).slice(0, 130))}`);
if (DRY) { console.log(`\nDRY RUN — ${plans.length} row patch(es). Re-run with --apply.`); process.exit(0); }

for (const p of plans) await patchRow("routes", p.id, p.body, { key: KEY });

// VERIFY BY RE-READ. A 200 is not evidence the data changed.
const after = await selectAll("routes", "id,discipline,length_m,gear,descent_text,access", `id=in.(${IDS.join(",")})`, { pageSize: 20, key: KEY });
const aby = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
console.log("");
for (const p of plans) { const held = p.check(aby[p.id] || {}); console.log(`  ${held ? "OK  " : "FAIL"} ${p.id}: ${p.label}`); if (!held) bad++; }
console.log(bad ? `\n${bad} check(s) FAILED — re-read the rows.` : `\nApplied and verified: ${plans.length} row patch(es).`);
process.exitCode = bad ? 1 : 0;
