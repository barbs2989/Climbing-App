// BATCH 110 REPAIRS. Four rows, every one settled by the row ITSELF -- no external source consulted
// and none needed. Two are rope-off-the-end arithmetic, which is the worst thing in this dataset to
// get wrong; two are a false clause deleted from a rendered field.
//
// 1. wa_mount_despair_northeast_buttress -- A PACK LIST PRESCRIBING A ROPE THAT CANNOT LEAD THE
//    CRUX. `gear` says "60m rope" and `detailed_rack` "a 60m rope", while the row's OWN `beta` states
//    TWO 70 m pitches, unambiguously as pitch lengths: "the first-ascent party found a 70m, 5.9 pitch
//    up a right-trending ramp" and "a final 70m steep rock pitch gains the upper north ridge". A 60 m
//    rope cannot LEAD a 70 m pitch. `rope_note` and `rope_length_m` are both empty, so `gear` is the
//    only length a party would see, and this row's own text calls the line committing with no bail.
//    NOT the option/negation/superseded false-positive class that defeated four rope detectors this
//    session: this is a flat instruction, and its modality is an instruction.
//    REPAIR: 60 -> 70, which is a COPY of a figure the row states twice, not an invention. Unlike
//    batch 108's Inner Constance ("30m+ rope", a misleading FLOOR, deleted rather than replaced),
//    here a specific wrong value stands against a specific right one the row already holds.
//
// 2. wa_mount_bigelow_tribute_to_richard -- A RETREAT THAT DOES NOT REACH. `bail` says "the pitches
//    are 25-35 m so a single 60 m rope reaches". A rope doubled through an anchor reaches HALF its
//    length, so a single 60 m gives 30 m, and this row's own `pitch_detail` puts P1 and P3 at 35 m.
//    REPAIR: delete the false clause. The lengths remain in `pitch_detail` where a climber can do the
//    arithmetic; asserting what the rope DOES reach would be composing a new claim.
//
// 3. wa_mount_bigelow_tribute_to_richard -- `pitches` COUNTS A WALKING STAGE. It says 5; the row says
//    FOUR everywhere else -- `descent_text` ("from the top of pitch 4") and `length_m` 110, which is
//    exactly 35+25+35+15, the four roped pitches. The fifth `pitch_detail` entry is "Approach
//    scramble", Class 2-3, 290 m. A stage entry in `pitch_detail` is legitimate (ROUTE BREAKDOWN
//    renders stages and pitches in one ordered list), but `pitches` is the roped count.
//
// 4. wa_mount_triumph_west_route -- `road.name` NARRATES OUR RECORD-KEEPING TO THE CLIMBER: "...;
//    specific Triumph Pass trailhead/road not documented on file", with status, driveNote and
//    seasonalGate all null beneath it. "not documented on file" is about our records, not the road.
//    REPAIR: delete that clause, keeping the true regional statement. Deliberately NOT filled in from
//    the sibling Despair row (which exits via Triumph Pass and the Thornton Lakes Trail) -- that is a
//    cross-row inference about a different route's approach, and this script only deletes or copies
//    within a row.
//
// 5. wa_mount_rahm_south_side -- `access.passRequired` reads "(per SummitPost)". `access.*` renders,
//    so this is a live breach of the no-sources rule. Delete the attribution, keep the fact.
//
// NOT REPAIRED, recorded so the omissions are not read as oversight:
//   * wa_mount_fury_east_north_buttress stores high_point_ft 8322 and area elevation_ft 8356 -- a real
//     split, but choosing between them needs a survey, not a copy.
//   * wa_mount_index_north_face's area coordinate appears to be the massif's MAIN summit while its
//     elevation is the North Peak's. Fixing the coordinate is research.
//   * wa_mount_washington_olympic_winter_direct sits under `wa_olympic_np` in the area tree while its
//     own `access.landManager` says Olympic National FOREST. Moving an area is a structural change.
//   * wa_mount_chaval_north_ridge's 61-character `grade` is NOT a defect: shortGrade() cuts at the
//     "(" and renders "5.6-5.7" in the pill, with the qualifier shown in the GRADES panel. The group
//     graded it `wrong`; that is the defended case working as designed.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const S = v => (typeof v === "string" ? v : JSON.stringify(v ?? ""));
const APPLY = process.argv.includes("--apply");
const IDS = ["wa_mount_despair_northeast_buttress", "wa_mount_bigelow_tribute_to_richard",
             "wa_mount_triumph_west_route", "wa_mount_rahm_south_side"];

const rows = await selectAll("routes", "*", `id=in.(${IDS.join(",")})`, { pageSize: 10, key: KEY });
if (rows.length !== IDS.length) { console.error(`SHORT READ: ${rows.length} of ${IDS.length}`); process.exit(1); }
const by = Object.fromEntries(rows.map(r => [r.id, r]));
const plans = [];
const refuse = m => { console.error(`REFUSED: ${m}`); process.exit(1); };

// ---------------------------------------------------- 1. Despair: 60 m -> 70 m, twice
{
  const r = by.wa_mount_despair_northeast_buttress;
  const seventies = (S(r.beta).match(/\b70\s?m\b/gi) || []).length;
  if (seventies < 2) refuse(`despair: beta no longer states two 70 m pitches (found ${seventies}) — the replacement value would have to be invented`);
  // TEST THE RAW VALUE, NOT S(). S(null) is JSON.stringify("") = the two-character string '""',
  // which is TRUTHY after .trim() -- so this guard fired on a null field and refused a correct run.
  const stated = v => v != null && String(v).trim() !== "" && String(v).trim() !== '""';
  if (stated(r.rope_note) || stated(r.rope_length_m)) refuse(`despair: the row now states a rope length elsewhere (rope_note=${JSON.stringify(r.rope_note)}, rope_length_m=${JSON.stringify(r.rope_length_m)}) — re-read before editing gear`);
  const gear = Array.isArray(r.gear) ? r.gear : refuse("despair: gear is not an array");
  const dr = S(r.detailed_rack);
  const gHit = gear.filter(g => String(g) === "60m rope").length;
  const dHit = dr.split("a 60m rope").length - 1;
  if (!gHit && gear.includes("70m rope")) console.log("  == despair: already applied — no-op.");
  else {
    if (gHit !== 1) refuse(`despair: gear holds ${gHit} entries equal to "60m rope" — expected 1`);
    if (dHit !== 1) refuse(`despair: detailed_rack holds ${dHit} copies of "a 60m rope" — expected 1`);
    plans.push({ id: r.id, label: `gear + detailed_rack: 60m rope -> 70m rope (beta states two 70 m pitches)`,
      body: { gear: gear.map(g => (String(g) === "60m rope" ? "70m rope" : g)),
              detailed_rack: dr.replace("a 60m rope", "a 70m rope") },
      show: ["gear", "detailed_rack"] });
  }
}

// ---------------------------------------------------- 2+3. Bigelow: false bail clause, pitch count
{
  const r = by.wa_mount_bigelow_tribute_to_richard;
  const pd = r.pitch_detail || [];
  const roped = pd.filter(p => !/^\s*(approach|descent|walk)/i.test(String(p.pitch || "")));
  const sum = roped.reduce((a, p) => a + (Number(p.lengthM) || 0), 0);
  if (roped.length !== 4) refuse(`bigelow: ${roped.length} roped pitch entries, expected 4`);
  if (Number(r.length_m) !== sum) refuse(`bigelow: length_m ${r.length_m} != the roped pitches' sum ${sum} — the "pitches is 4" argument rests on that equality`);
  const longest = Math.max(...roped.map(p => Number(p.lengthM) || 0));
  if (longest <= 30) refuse(`bigelow: longest roped pitch is ${longest} m, so a doubled 60 m rope DOES reach — the premise is gone`);
  const bail = S(r.bail);
  const CLAUSE = " the pitches are 25–35 m so a single 60 m rope reaches, but";
  const body = {};
  if (Number(r.pitches) === 4) console.log("  == bigelow pitches: already applied.");
  else if (Number(r.pitches) !== 5) refuse(`bigelow: pitches is ${r.pitches}, expected 5`);
  else body.pitches = 4;
  if (!bail.includes(CLAUSE)) {
    if (/single 60 m rope reaches/.test(bail)) refuse(`bigelow: the bail clause is present but not in the exact expected form — re-read:\n     ${bail.slice(0, 260)}`);
    console.log("  == bigelow bail: already applied.");
  } else body.bail = bail.replace(CLAUSE, "");
  if (Object.keys(body).length) plans.push({ id: r.id, label: `pitches 5 -> 4 (length_m ${r.length_m} = the four roped pitches) + delete the false 60 m retreat claim (longest roped pitch ${longest} m)`, body, show: ["bail"] });
}

// ---------------------------------------------------- 4. Triumph: delete the pipeline-voice clause
{
  const r = by.wa_mount_triumph_west_route;
  const road = r.road && typeof r.road === "object" ? r.road : refuse("triumph: road is not an object");
  const cur = S(road.name);
  const CLAUSE = "; specific Triumph Pass trailhead/road not documented on file";
  if (!cur.includes(CLAUSE)) console.log("  == triumph: already applied — no-op.");
  else plans.push({ id: r.id, label: `road.name — delete "not documented on file" (our records, not the road)`,
    body: { road: { ...road, name: cur.replace(CLAUSE, "") } }, show: ["road.name"] });
}

// ---------------------------------------------------- 5. Rahm: delete the rendered citation
{
  const r = by.wa_mount_rahm_south_side;
  const acc = r.access && typeof r.access === "object" ? r.access : refuse("rahm: access is not an object");
  const cur = S(acc.passRequired);
  const CLAUSE = " (per SummitPost)";
  if (!cur.includes(CLAUSE)) console.log("  == rahm: already applied — no-op.");
  else plans.push({ id: r.id, label: `access.passRequired — delete the SummitPost attribution`,
    body: { access: { ...acc, passRequired: cur.replace(CLAUSE, "") } }, show: ["access.passRequired"] });
}

if (!plans.length) { console.log("\nNothing to do."); process.exit(0); }
console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${plans.length} row(s):\n`);
const dig = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
for (const p of plans) {
  console.log(`  -> ${p.id}\n     ${p.label}`);
  // PRINT THE COMPOSED RESULT, and the CHANGED SUBFIELD rather than the whole jsonb column -- a
  // find/replace pair cannot show a stranded connective, and a whole-object print buries the clause.
  for (const path of p.show || Object.keys(p.body)) {
    const top = path.split(".")[0];
    console.log(`     RESULT ${path} = ${JSON.stringify(S(dig(p.body, path) ?? p.body[top])).slice(0, 330)}`);
  }
  for (const k of Object.keys(p.body)) if (!(p.show || []).some(s => s.startsWith(k))) console.log(`     RESULT ${k} = ${JSON.stringify(p.body[k])}`);
  console.log("");
}
if (!APPLY) { console.log("Re-run with --apply."); process.exit(0); }

for (const p of plans) { await patchRow("routes", p.id, p.body, { key: KEY }); console.log(`  applied ${p.id}`); }

// VERIFY BY RE-READ. A 200 is not evidence the row changed.
const after = await selectAll("routes", "id,gear,detailed_rack,pitches,bail,road,access", `id=in.(${IDS.join(",")})`, { pageSize: 10, key: KEY });
const a = Object.fromEntries(after.map(r => [r.id, r]));
let bad = 0;
if (!(a.wa_mount_despair_northeast_buttress.gear || []).includes("70m rope") || /\b60m rope\b/.test(S(a.wa_mount_despair_northeast_buttress.detailed_rack))) { console.error("  !! despair rope did not take"); bad++; }
if (Number(a.wa_mount_bigelow_tribute_to_richard.pitches) !== 4 || /single 60 m rope reaches/.test(S(a.wa_mount_bigelow_tribute_to_richard.bail))) { console.error("  !! bigelow did not take"); bad++; }
if (/not documented on file/.test(S(a.wa_mount_triumph_west_route.road?.name))) { console.error("  !! triumph did not take"); bad++; }
if (/SummitPost/i.test(S(a.wa_mount_rahm_south_side.access?.passRequired))) { console.error("  !! rahm did not take"); bad++; }
console.log(bad ? `\nVERIFY FAILED on ${bad} row(s).` : "\nVerified by re-read: all edits are live.");
process.exit(bad ? 1 : 0);
