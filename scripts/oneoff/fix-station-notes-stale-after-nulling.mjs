// 20 station notes describe a distance that is no longer on the page.
//
// #1245 nulled 57 invented station lengths; #1259 fixed the two COUNT notes left describing them.
// This is the same defect one level down, and it is larger: every station whose number went null
// still carries the sentence that justified it -- "Length not documented; estimated.", "exact
// length not stated in source, estimated similar to the first rappel". The table now prints an em
// dash beside each one, so the note explains a figure the reader cannot see.
//
// FOUR OF THE TWENTY SAY NOTHING ELSE AT ALL. "Length not documented; estimated." is, now, a note
// whose entire content is a footnote to a deleted number. Those are removed outright: the em dash
// already says there is no distance, and a row of identical non-sentences is worse than a clean
// blank.
//
// TWO THINGS ARE PRESERVED, and they are why this is a rewrite rather than a delete:
//   * ROUTE CONTENT welded to the dead clause -- "A loose gully to climbers' right can be
//     downclimbed instead of rappelled", "Caution advised near the 'cannon hole' feature",
//     "Begins the descent of the loose East Ridge crest toward C-J col".
//   * PLANNING GUIDANCE that survives the number going -- "similar to the first rappel", "half of
//     the full double-rope rappel", "roughly one pitch". Those tell a climber what rope to bring,
//     which is the useful half of an estimate and does not depend on a figure being displayed.
//
// It also takes "source" out of the copy on the way. The standing rule is that no screen names
// where information came from, and "not stated in source" is exactly that -- the same class the
// verif.source removal and the road/access citation sweep already cleared.
//
// PRECONDITION, asserted per station: lengthM must be null. A note explaining an estimate NEXT TO
// A NUMBER THAT IS STILL SHOWN is doing its job and must not be touched.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

// STRUCTURAL, after the literal rules below stopped scaling. The first version enumerated
// phrasings and I added two more when the post-write check caught them, then found 31 still
// standing — "length estimated", "not specified in source", "approximated at", "an approximation
// from", "estimated evenly". That is the deny-list treadmill this repo documents; the fix is to
// stop naming forms and ask a structural question instead.
//
// A CLAUSE goes if it is ABOUT THE LENGTH and says the length is absent: it must name the
// measurement (length/distance/spacing) AND admit it (not …/estimat…/approxim…/assum…). Both
// halves, because "exact ANCHOR TYPE not documented" is an honest remark about something else and
// must survive — the object test this repo has now needed on five separate needles.
//
// Clause-level rather than sentence-level because these notes weld the dead statement onto real
// content with a semicolon: "Cat Scratch Gullies; length estimated".
const ABOUT_LENGTH = /\b(?:length|distance|spacing)\b/i;
const ADMITS = /\bnot\b|\bestimat|\bapproxim|\bassum|\bunconfirmed\b/i;
function dropLengthClauses(note) {
  // Split on ; and . but keep the delimiter with the clause so rebuilding reads naturally.
  const parts = note.split(/(?<=[.;])\s+/);
  const kept = parts.filter((p) => !(ABOUT_LENGTH.test(p) && ADMITS.test(p)));
  // Dropping a middle clause strands the semicolon that joined it to the one before:
  // "…using doubled 60m ropes; Treat as a natural/gear anchor…". A semicolon followed by a
  // capital is not punctuation anyone wrote — it is the seam left by the removal — so it becomes
  // a full stop. Caught by reading the dry run, not by any assertion.
  return kept.join(" ")
    .replace(/\s*;\s*$/, ".")
    .replace(/;\s+(?=[A-Z])/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Ordered. Guidance-bearing forms first, so the bare sweep cannot eat the phrase they need.
const RULES = [
  [/^Length not documented; estimated as roughly one pitch length\.\s*/i, "Plan on roughly one pitch. "],
  [/^Length not documented; estimated as a typical single-rope rappel\.\s*/i, "Plan on a typical single-rope rappel. "],
  [/;\s*length not documented, estimated as half of the full double-rope rappel some parties use instead\./i,
    ". Plan on about half the full double-rope rappel some parties use instead."],
  [/;\s*exact length not stated in source, estimated similar to the first rappel\./i,
    ". Plan on similar to the first rappel."],
  [/;\s*individual length not stated in source, estimated from the 60m rope used throughout the descent\./i,
    ". Plan on what a 60 m rope reaches doubled, as used throughout the descent."],
  [/;\s*length is an approximate estimate, not stated in the source\./i, "."],
  [/;\s*length is an assumed typical figure, not stated in the source\./i, "."],
  [/;\s*exact length not stated in source, estimated as a typical double-rope pitch\./i,
    ". Plan on a typical double-rope pitch."],
  [/;\s*length not documented, estimated\./i, "."],
  // Two more phrasings, added after the POST-WRITE CHECK caught them. That check scans every note
  // in the row, not just the ones a rule matched, which is why it saw what the rules missed —
  // "one more phrasing" is the failure this repo records for every deny-list, and the only reason
  // it did not ship here is that the verification was wider than the transform.
  [/;\s*length estimated, not individually documented\./i, "."],
  [/;\s*exact length not given, estimated near single-rope max with a 60m rope\./i,
    ". Plan on near the full reach of a doubled 60 m rope."],
  [/^Length not documented; estimated\.\s*/i, ""],
  [/^Length estimated, not (?:individually )?documented\.?\s*/i, ""],
  [/^Length estimated from 60m rope doubled;\s*/i, "Plan on what a 60 m rope reaches doubled. "],
  [/\s*exact station not individually documented\./i, "."],
  [/\s{2,}/g, " "],
  [/\s+\./g, "."],
  [/\.\s*\./g, "."],
];

// Scoped to THIS pass's claim: no note beside an em dash may still explain the missing distance.
//
// `source` is deliberately NOT a blocker here. It is a real and separate defect — the standing
// rule that no screen names where information came from — but it also appears on stations whose
// number is still shown, which this pass does not touch. Blocking on it meant one class-B note
// (wa_chimney_rock_west_face, a bolt-replacement claim) refused an otherwise clean class-A fix.
// Counted and reported at the end instead, so scoping the gate does not become hiding the finding.
const FORBIDDEN = [
  [/\b(?:length|distance|spacing)\b[^.;]*\b(?:not\b|estimat|approxim|assum)/i, "still explains a distance that is not shown"],
  [/\b(?:not|estimat|approxim|assum)\w*\b[^.;]*\b(?:length|distance|spacing)\b/i, "still explains a distance that is not shown"],
];
const NAMES_SOURCE = /\bsource\b/i;

const res = await fetch(`${U}/rest/v1/routes?select=id,rappel_detail&rappel_detail=not.is.null&limit=10000`,
  { headers: H, signal: AbortSignal.timeout(30000) });
if (!res.ok) { console.error(`read failed ${res.status}`); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.error("zero rows -- broken read, not a clean catalog."); process.exit(1); }

// The ENTRY GATE asks the same question as the transform. A narrower one was skipping notes the
// structural pass would have fixed — "approximated at", "an approximation from", "not specified",
// "not given" — so the run reported 25 where the class is 31. A gate and its transform disagreeing
// about scope is a silently shorter worklist, which is the failure mode this whole thread is about.
const TRIGGER = (n) => ABOUT_LENGTH.test(n) && ADMITS.test(n);
const targets = []; const refused = [];
for (const x of rows) {
  const d = Array.isArray(x.rappel_detail) ? x.rappel_detail : [];
  const edits = [];
  const next = d.map((s, i) => {
    const n = typeof s.notes === "string" ? s.notes : "";
    if (!n || !TRIGGER(n)) return s;
    // A note beside a number that IS shown is doing its job.
    if (typeof s.lengthM === "number") return s;
    // Literal rules first — they RESCUE guidance ("plan on roughly one pitch") that the
    // structural pass would otherwise drop with the clause carrying it. Then the structural
    // sweep takes whatever phrasing they did not anticipate.
    let out = n;
    for (const [re, to] of RULES) out = out.replace(re, to);
    out = dropLengthClauses(out).trim();
    if (out === n) return s;
    const bad = FORBIDDEN.filter(([re]) => re.test(out)).map(([, w]) => w);
    if (bad.length) { refused.push({ id: x.id, i, bad, out }); return s; }
    edits.push({ i, before: n, after: out });
    const copy = { ...s };
    if (out) copy.notes = out; else delete copy.notes;
    return copy;
  });
  if (edits.length) targets.push({ id: x.id, edits, next });
}

if (refused.length) {
  console.error(`REFUSING TO WRITE — ${refused.length} note(s) still carry the dead explanation after rewriting:\n`);
  for (const r of refused) console.error(`  ${r.id}[${r.i}] — ${r.bad.join("; ")}\n    ${r.out.slice(0, 200)}`);
  process.exit(1);
}
if (!targets.length) { console.log("nothing to change."); process.exit(0); }

let n = 0, dropped = 0;
for (const t of targets) {
  console.log(`### ${t.id}`);
  for (const e of t.edits) {
    n++; if (!e.after) dropped++;
    console.log(`  [${e.i}] - ${e.before.replace(/\s+/g, " ")}`);
    console.log(`      + ${e.after ? e.after.replace(/\s+/g, " ") : "(note removed — the em dash already says there is no distance)"}`);
  }
  console.log("");
}
console.log(`${n} note(s) across ${targets.length} route(s); ${dropped} removed outright.`);

// Reported, not fixed here: the separate "no screen names a source" rule. Scoping the gate
// above must not become hiding this.
const srcLeft = rows.flatMap((x) => (x.rappel_detail || [])
  .filter((s) => typeof s.notes === "string" && NAMES_SOURCE.test(s.notes)).map(() => x.id));
console.log(`\nSEPARATE CLASS, not touched here: ${srcLeft.length} station note(s) on ${new Set(srcLeft).size} route(s)`);
console.log('still contain the word "source" — the standing no-sources rule, a different pass.');
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let bad = 0;
for (const t of targets) {
  await patchRow("routes", t.id, { rappel_detail: t.next });
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${t.id}&select=rappel_detail`, { headers: H })).json();
  const arr = after.rappel_detail || [];
  const still = arr.filter((s) => typeof s.notes === "string" && FORBIDDEN.some(([re]) => re.test(s.notes))).length;
  if (arr.length !== t.next.length || still) { console.log(`  MISMATCH ${t.id} (${still} still carrying it)`); bad++; }
  else console.log(`  ok ${t.id}`);
}
console.log(bad ? `\n${bad} did not take` : `\nall ${targets.length} verified on re-read`);
process.exit(bad ? 1 : 0);
