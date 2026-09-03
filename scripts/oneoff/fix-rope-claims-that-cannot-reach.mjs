// Descent prose telling a party a rope is enough for a rappel that rope cannot make.
//
// A rope doubled through an anchor reaches HALF its length. Three rows say otherwise, each in a
// field a climber reads while deciding what to carry. These are the last unrepaired findings from
// the full-scope rope sweep; the two Whitehorse rows flagged alongside them turned out to be a
// FALSE POSITIVE of the probe and are recorded, not edited (see the closing note).
//
// TWO GATES, MUTUALLY EXCLUSIVE, AND THE WEAKER ONE IS PRINTED LOUDLY. The repo's precedent is
// `fix-road-blocks-from-a-named-sibling.mjs` (strong: the repair is a copy of a value the row
// already holds) beside `fix-road-blocks-from-research.mjs` (weak: the repair rests on a judgement
// made outside the catalog). Same split here:
//
//   `evidence`   -- the row REFUTES ITSELF. The premise is re-read from the live row at apply time
//                   and the run is refused if it no longer holds. No source is needed and none is
//                   trusted. Every such repair here is a pure DELETION of the false clause.
//
//   `researched` -- an external source settles it. The URL and the quoted sentence are recorded per
//                   entry. Refused if the row turns out to refute itself after all, because then it
//                   belongs under `evidence` and needs no judgement.
//
// Declaring both, or neither, is a malformed entry rather than a lenient one.
//
// ------------------------------------------------------------------------------------------------
// wa_concerto_in_c_for_drill_and_hammer -- EVIDENCE. A DELETION.
//
//   descent_text  "...; several rappels require a 60m rope, and parties typically rappel to..."
//   rappels       "Rappel the line of ascent on its fixed Fixe chain anchors; some rappels are a
//                  full 60 m"
//   gear          "60m rope(s) for rappels"
//   rappel_count_note  "...545 m at full 60 m rappels would be roughly 9-10."
//
// The row states twice that rappels here are a full 60 m, and its own count note does arithmetic
// treating a "60 m rappel" as 60 m of descent. 60 m of descent needs 120 m of rope. So "several
// rappels require a 60m rope" is the row contradicting itself, and it errs toward telling a party
// that one rope is enough on a 14-pitch, 1,800 ft wall they would be rappelling to escape.
//
// THE REPAIR IS A DELETION AND NOTHING ELSE. The false clause comes out; nothing is written and no
// rope is chosen. A reader still meets the rope question in `gear`, whose "(s)" admits the plural,
// and still meets "some rappels are a full 60 m" in `rappels`. Both are untouched.
//
// Research corroborates the deletion and is deliberately NOT used to justify a rewrite -- the
// sources disagree on WHICH two ropes, so writing one would be picking kit:
//   * Mountain Project, the route's own Descent field: "Rappel the route, which has some 60m
//     rappels" -- https://www.mountainproject.com/route/118299770/concerto-in-c-for-drill-and-hammer
//   * Mountain Project, Darrington area: "Bring two ropes, ideally 70m, as many of the pitches
//     (single and multi) here require full length rappels." -- .../area/106006698/darrington
//   * Western Dihedral, same wall: "two 60m ropes" -- .../route/118571310/western-dihedral
//   * Skeena26, same wall: "most of the pitches take all of 50 meters and so will the rappels"
// Two ropes, three different lengths recommended. The deletion needs none of them.
//
// ------------------------------------------------------------------------------------------------
// wa_mount_shuksan_fisher_chimneys -- EVIDENCE. A DELETION.
//
//   descent_text   "...A single 30-60m rope works; a 60m reaches farther between stations and cuts
//                   down on exposed downclimbing."
//   rappel_detail  four stations, lengthM 30, 30, 30, 20
//   gear           "60m rope for glacier travel and belays"
//
// A single 30 m rope doubled reaches 15 m. It cannot make ANY of the three 30 m stations this row
// records. So the low end of that range is refuted by the row's own station table, and it is the
// dangerous end: a party on the standard west-side route to Shuksan, descending the summit gully to
// Hell's Highway, told that the short glacier rope many Cascade parties carry "works".
//
// THE REPAIR DELETES THE LOW END AND THE COMPARATIVE THAT DEPENDED ON IT. "A single 30-60m rope
// works; a 60m reaches farther between stations and cuts down on exposed downclimbing." becomes
// "A single 60m rope works and cuts down on exposed downclimbing." -- two contiguous fragments of
// the original spliced after the false half comes out. NO WORD IS INTRODUCED. Removing "30-" alone
// was tried and rejected: it leaves "a 60m reaches farther between stations" comparing 60 m against
// itself, which is incoherent rather than merely redundant.
//
// Research corroborates the deletion; it is not what justifies it:
//   * NPS North Cascades, official 2024 climbing conditions: "60m rope works for all existing
//     anchors" -- https://home.nps.gov/noca/blogs/climbing-conditions-mt-shuksan-2024.htm
//   * TrailCatJim 2023: "Our 60-meter rope was barely able to reach the established rappel stations.
//     Parties using a shorter rope would need to do more down-climbing and/or improvise some
//     intermediate rappel stations." -- https://trailcatjim.com/mt-shuksan-via-sulphide-glacier-southwest-gully-2023/
//   * NPS 2022: "Descending the gully with a 60m rope took most teams about 3 rappels"
// No source found describes a short rope as adequate here, and one says outright that it is not.
//
// NOT REPAIRED, and recorded rather than swept: rappel_detail[1].notes still reads "a 60m rope
// reaches farther between stations than a 30m". That is a TRUE comparative and it does not assert a
// 30 m rope is sufficient, so deleting it would be editing correct prose.
//
// ------------------------------------------------------------------------------------------------
// wa_vanishing_point -- RESEARCHED. ONE WORD.
//
//   rappels  "...the approach can be reversed with a single 70 m rappel where the updated anchors
//             allow it."
//
// "A single 70 m rappel" reads as one rappel 70 m long, which would need 140 m of rope. The first
// ascensionist who did the anchor work wrote the sentence this is a mis-transcription of:
//
//     "Just turning around with a single 70m is safe. (We tried it!)"
//     -- Nathan Hadley, https://nathanhadley.com/stories/vanishing-point-2-0-a-classic-route-modernized
//
// "A single 70m" is the ordinary idiom for ONE 70-METRE ROPE. It is corroborated by arithmetic the
// same author publishes: he lists the approach anchors one by one at 35, 35, 30, 35 and 30 m, and a
// single 70 m doubled reaches exactly 35 m. No source anywhere describes a 70 m long rappel here.
//
// A DELETION WOULD MAKE THIS ROW WORSE, which is why it is a word change instead. The sentence
// carries a real and useful fact -- that the fixed-line approach can now be retreated from at all,
// which the same source says was the route's main psychological commitment before the 2020 work.
// Deleting it removes the fact; correcting one word keeps it and makes it true.
//
// NOT REPAIRED HERE, and recorded so the next pass does not read the silence as a pass: the row's
// `gear` says "60-meter single rope", and a 60 m doubled reaches 30 m against those documented 35 m
// spacings. The sources say 60 m is genuinely fine FOR CLIMBING THE PITCHES (Blake Herrington's
// trip report: "A 60m rope is fine.") and 70 m is what reverses the approach. Fixing that means
// writing a gear entry that distinguishes the two, which is composition, not correction.
//
// ------------------------------------------------------------------------------------------------
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// Each entry declares the exact edit and the exact premises. `find` must match EXACTLY ONCE in the
// live value or the entry is refused -- a field that has moved on is re-read by a person, not
// rewritten by a script.
const EDITS = [
  {
    id: "wa_concerto_in_c_for_drill_and_hammer",
    field: "descent_text",
    evidence: "The row's own `rappels` says rappels here are 'a full 60 m' and its `rappel_count_note` "
      + "does arithmetic treating a 60 m rappel as 60 m of descent. 60 m of descent needs 120 m of rope, "
      + "so 'require a 60m rope' is refuted by the row itself.",
    find: "several rappels require a 60m rope, and parties",
    repl: "parties",
    // premises re-read from the live row at apply time
    premises: r => {
      const rap = String(r.rappels ?? "");
      const note = String(r.rappel_count_note ?? "");
      if (!/full\s*60\s*m/i.test(rap)) return "`rappels` no longer says the rappels are a full 60 m — that claim is the whole basis for calling the descent_text clause false.";
      if (!/full\s*60\s*m\s*rappels/i.test(note)) return "`rappel_count_note` no longer does its 'at full 60 m rappels' arithmetic — the second refuting record is gone.";
      const gear = (Array.isArray(r.gear) ? r.gear : []).join(" | ");
      if (!/60\s*m\s*rope\(s\)/i.test(gear)) return "the gear line no longer reads '60m rope(s)'. A bare deletion is only safe while the plural hedge still reaches the reader.";
      return null;
    },
  },
  {
    id: "wa_mount_shuksan_fisher_chimneys",
    field: "descent_text",
    evidence: "The row's own rappel_detail records stations of 30, 30, 30 and 20 m. A 30 m rope doubled "
      + "reaches 15 m and cannot make any of the three 30 m stations, so the low end of 'a single 30-60m "
      + "rope works' is refuted by the row itself.",
    find: "A single 30-60m rope works; a 60m reaches farther between stations and cuts down on exposed downclimbing.",
    repl: "A single 60m rope works and cuts down on exposed downclimbing.",
    premises: r => {
      const st = Array.isArray(r.rappel_detail) ? r.rappel_detail.map(d => Number(d && d.lengthM)) : [];
      if (!st.length || !st.every(Number.isFinite)) return "rappel_detail no longer parses as numeric stations — the arithmetic that makes the 30 m end false rests on them.";
      // a 30 m rope doubled reaches 15 m
      const unreachable = st.filter(x => x > 15);
      if (!unreachable.length) return `no station exceeds the 15 m a 30 m rope reaches doubled (stations: ${st.join(", ")}) — the claim being deleted would not be false.`;
      const gear = (Array.isArray(r.gear) ? r.gear : []).join(" | ");
      if (!/60\s?m rope/i.test(gear)) return "the gear line naming a 60 m rope is gone. Without it the surviving sentence would be the only place the reader meets a rope length.";
      return null;
    },
  },
  {
    id: "wa_vanishing_point",
    field: "rappels",
    researched: {
      source: "https://nathanhadley.com/stories/vanishing-point-2-0-a-classic-route-modernized",
      quote: "Just turning around with a single 70m is safe. (We tried it!)",
      why: "Written by the climber who replaced the approach anchors. 'A single 70m' is the ordinary "
        + "idiom for one 70-metre rope; the same page lists the approach anchors at 35/35/30/35/30 m, "
        + "and a single 70 m doubled reaches exactly 35 m. No source describes a 70 m long rappel here.",
    },
    find: "with a single 70 m rappel where",
    repl: "with a single 70 m rope where",
    premises: r => {
      const rap = String(r.rappels ?? "");
      // If the row refuted itself this would belong under `evidence` and need no outside judgement.
      if (/\b70\s*m\s*rope\b/i.test(rap)) return "the row already names a 70 m rope — re-read it; this may no longer need a researched gate.";
      if (!/30\s*[-–]\s*35\s*m/.test(rap)) return "`rappels` no longer records the 30-35 m anchor spacing that makes a 70 m rope (35 m doubled) the coherent reading.";
      return null;
    },
  },
];

const ids = EDITS.map(e => e.id);
const rows = await selectAll("routes",
  "id,rappels,rappel_count_note,descent_text,gear,rappel_detail",
  `id=in.(${ids.join(",")})`, { pageSize: 20 });

if (rows.length !== ids.length) {
  console.error(`FAIL: expected ${ids.length} rows, read ${rows.length}. Refusing to act on a partial read.`);
  process.exit(1);
}

let planned = 0, skipped = 0, refused = 0;
const plan = [];

for (const e of EDITS) {
  const r = rows.find(x => x.id === e.id);
  const gate = e.evidence ? "evidence" : e.researched ? "researched" : null;
  if (!gate || (e.evidence && e.researched)) {
    console.error(`FAIL: ${e.id} declares ${e.evidence && e.researched ? "BOTH gates" : "neither gate"}. Malformed entry.`);
    process.exit(1);
  }

  const cur = String(r[e.field] ?? "");

  // idempotence: a second run is a no-op and says which state it found
  if (!cur.includes(e.find) && cur.includes(e.repl)) {
    console.log(`\n== ${e.id}.${e.field}\n   already applied — no-op.`);
    skipped++;
    continue;
  }

  const n = cur.split(e.find).length - 1;
  if (n !== 1) {
    console.error(`\n== ${e.id}.${e.field}\n   REFUSED: the declared clause matches ${n} times, not exactly once. Re-read the field.`);
    refused++;
    continue;
  }

  const bad = e.premises(r);
  if (bad) {
    console.error(`\n== ${e.id}.${e.field}\n   REFUSED: ${bad}`);
    refused++;
    continue;
  }

  const next = cur.replace(e.find, e.repl);
  console.log(`\n== ${e.id}.${e.field}   [gate: ${gate.toUpperCase()}]`);
  if (gate === "researched") {
    console.log(`   !! WEAKER GATE — this repair rests on a source outside the catalog.`);
    console.log(`      source: ${e.researched.source}`);
    console.log(`      quote:  "${e.researched.quote}"`);
    console.log(`      why:    ${e.researched.why}`);
  } else {
    console.log(`   evidence: ${e.evidence}`);
  }
  console.log(`   BEFORE: ${cur}`);
  console.log(`   AFTER:  ${next}`);
  plan.push({ id: e.id, field: e.field, next, find: e.find });
  planned++;
}

console.log(`\nplanned ${planned}, already-applied ${skipped}, refused ${refused}`);
if (refused) { console.error("one or more entries were refused — nothing will be written."); process.exit(1); }
if (!planned) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, { [p.field]: p.next });

// verify by RE-READ, never by the write's own status
const after = await selectAll("routes", "id,rappels,descent_text", `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
let bad = 0;
for (const p of plan) {
  const got = String(after.find(x => x.id === p.id)?.[p.field] ?? "");
  if (got !== p.next) { console.error(`FAIL: ${p.id}.${p.field} re-read does not match what was written.`); bad++; }
  else if (got.includes(p.find)) { console.error(`FAIL: ${p.id}.${p.field} still contains the false clause.`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified by re-read: ${plan.length} field(s) corrected.`);
