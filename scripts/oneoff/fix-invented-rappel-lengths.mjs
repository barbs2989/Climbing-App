// A rappel length the row's own note admits was invented does not belong in `lengthM`.
//
// CLAUDE.md states the rule and #1043 already applied it to this column:
//
//   "`null` is the CORRECT value where no source gives a distance, and writing nulls rather than
//    inventing numbers is what the repair did. Halving is also wrong: a rappel with no published
//    distance may be 35m or 15m, so a halved figure replaces one fabricated number with another."
//
// 56 stations across 23 routes still hold one. Their own notes say so — "length is an assumed
// typical figure, not stated in the source", "Length not documented; estimated."
//
// WHY THE NOTE IS NOT ENOUGH, and this is the part I learned the hard way on my own work.
// RappelTable renders each station's note directly under its number, so the caveat IS on screen
// and the per-station honesty is real. Two things defeat it anyway:
//
//   1. THE SUMMARY TOTAL IS NOT CAVEATED. The header sums `lengthM` and prints e.g. "210 m
//      total". Its `partial` wording ("60 m across 2 of 3") fires only on NULL lengths, so a
//      route whose every station is an estimate prints a confident total for a descent nobody
//      measured. That is the `||0` defect the code comment beside it already records, one step
//      along: there, unknown read as zero; here, invented reads as measured.
//   2. THE MARKER IS PROSE, AND PROSE GETS REWRITTEN. #1220 rephrased one of these notes for
//      readability — "The previously claimed 55m length … have been removed" became "No source
//      found documents its exact length" — and the detector stopped seeing it while the invented
//      30 m stayed in the field. I made the admission invisible without removing the thing it
//      was admitting. A number's honesty cannot depend on the wording of the sentence beside it.
//
// So the number goes and the prose stays: the note still tells a climber to expect a typical
// single-rope rappel, the table prints an em dash, and the total counts only what was measured.
// No schema change and no reader change — RappelTable already handles a null length, and with
// every station null it prints no total at all rather than "0 m".
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

// Same object test the measurement uses: ONE SENTENCE must both admit the gap and name the
// measurement, so "exact ANCHOR TYPE not documented" and "station COORDINATES are not
// independently documented" are left alone — they are honest remarks about something that is not
// the number in the table.
//
// `no source found documents` is here because #1220's rewrite produced it. Widening a detector to
// match text you yourself introduced is not cheating; the alternative is a false negative I
// created.
const INVENTED = /\b(?:not (?:independently )?(?:documented|stated|specified|published)|not stated in (?:the )?source|no source found documents|estimated(?: as| from| similar| a typical)?|assumed typical|approximate estimate|typical figure)\b/i;
const ABOUT_LENGTH = /\b(?:length|distance|per-rap|how (?:long|far)|\d+\s*m\b)/i;
const admits = (note) => note.split(/(?<=[.;!?])\s+/).some((s) => INVENTED.test(s) && ABOUT_LENGTH.test(s));
const lenOf = (s) => (typeof s.lengthM === "number" ? s.lengthM : null);
const noteOf = (s) => [s.notes, s.note, s.description].filter((v) => typeof v === "string").join(" ");

const res = await fetch(`${U}/rest/v1/routes?select=id,rappel_detail,rappel_count_note&rappel_detail=not.is.null&limit=10000`,
  { headers: H, signal: AbortSignal.timeout(30000) });
if (!res.ok) { console.error(`read failed ${res.status} — nothing measured.`); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.error("zero rows with rappel_detail — broken read, not a clean catalog."); process.exit(1); }

// A table that goes all-em-dash needs one sentence saying why. Three of the four already have
// one; this is the fourth, and it is a RESTATEMENT of the row's own descent_text and gear list,
// not research — doubled 60 m ropes, the slab band, both anchors natural.
const ADD_NOTE = new Map([
  ["wa_west_twin_needle_south_route",
    "Two rappels on doubled 60 m ropes get you past the band of vertical slabs below the "
    + "Himmelhorn–West Twin Needle notch. No per-station distance is published for either, so none "
    + "is given here — carry the two 60 m ropes the gear list names and judge each station on the "
    + "ground. Both anchors are natural rather than fixed: bring cord and rap rings."],
]);

const targets = [];
for (const x of rows) {
  const d = Array.isArray(x.rappel_detail) ? x.rappel_detail : [];
  const hit = [];
  for (let i = 0; i < d.length; i++) {
    if (lenOf(d[i]) !== null && admits(noteOf(d[i]))) hit.push(i);
  }
  if (!hit.length) continue;
  const numbered = d.filter((s) => lenOf(s) !== null).length;
  const next = d.map((s, i) => (hit.includes(i) ? { ...s, lengthM: null } : s));
  targets.push({
    id: x.id, hit, numbered, next,
    all: hit.length === numbered,
    wasTotal: hit.reduce((a, i) => a + lenOf(d[i]), 0),
    note: x.rappel_count_note || "",
  });
}

if (!targets.length) { console.log("nothing to change — no station holds an admitted-invented length."); process.exit(0); }

let stations = 0;
for (const t of targets.sort((a, b) => b.hit.length - a.hit.length)) {
  stations += t.hit.length;
  console.log(`### ${t.id} — nulling ${t.hit.length} of ${t.numbered} numbered station(s)${t.all ? "  ** the whole table **" : ""}`);
  if (t.all) console.log(`    removes a rendered total of ${t.wasTotal} m that nobody measured`);
}
console.log(`\n${stations} station length(s) across ${targets.length} route(s).`);
console.log(`${targets.filter((t) => t.all).length} route(s) lose their rendered total entirely — for those the`);
console.log("count note must explain it in a climber's terms; checked below.\n");

// A table that goes all-em-dash needs one sentence saying why, in the same voice #1188 established.
let missingNote = 0;
for (const t of targets.filter((x) => x.all)) {
  const willBe = ADD_NOTE.get(t.id) || t.note;
  const explains = /not (?:documented|published|recorded)|no (?:published|source|per-station)|unconfirmed|estimate/i.test(willBe);
  if (!explains) missingNote++;
  const tag = !explains ? "NEEDS A NOTE" : ADD_NOTE.has(t.id) ? "ok (adding)" : "ok         ";
  console.log(`  ${tag}  ${t.id}: ${willBe ? willBe.replace(/\s+/g, " ").slice(0, 120) : "(no rappel_count_note)"}`);
}
// Fails closed: emptying a rappel table without saying why is a worse screen than the one we
// started with, so the run REFUSES rather than leaving a silent wall of em dashes.
if (missingNote) {
  console.error(`\nREFUSING — ${missingNote} route(s) would lose every rendered distance with nothing`);
  console.error("on screen explaining it. Add a rappel_count_note for each before applying.");
  process.exit(1);
}

if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let bad = 0;
for (const t of targets) {
  const body = { rappel_detail: t.next };
  if (ADD_NOTE.has(t.id)) body.rappel_count_note = ADD_NOTE.get(t.id);
  await patchRow("routes", t.id, body);
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${t.id}&select=rappel_detail`, { headers: H })).json();
  const still = (after.rappel_detail || []).filter((s) => lenOf(s) !== null && admits(noteOf(s))).length;
  const kept = (after.rappel_detail || []).length === t.next.length;
  if (still || !kept) { console.log(`  MISMATCH ${t.id} (still ${still} invented, ${kept ? "" : "STATION COUNT CHANGED"})`); bad++; }
  else console.log(`  ok ${t.id}`);
}
console.log(bad ? `\n${bad} did not take` : `\nall ${targets.length} verified on re-read`);
process.exit(bad ? 1 : 0);
