// The numbers #1245's needle could not see.
//
// #1245 nulled 57 invented station lengths, matched by an ENUMERATED list of phrasings
// ("assumed typical figure", "approximate estimate", "not stated in source"). #1268 then had to
// abandon that approach for the notes, because each added rule bought exactly one phrasing.
// Re-asking the STRUCTURAL question of the numbers finds 12 more stations still showing a figure
// their own note calls a guess:
//
//     wa_free_mojo[0]      30 m   "length approximate."
//     wa_boving_roofs[0]   30 m   "per-rap length not given exactly, kept within single 60m rope range."
//     wa_big_four[3]       30 m   "length and exact count are approximate since trip reports only say 'several.'"
//
// Same defect as #1245, same rule from CLAUDE.md -- null is the correct value where no source
// gives a distance -- and the same consequence: these feed the table's summary total, which is
// not caveated.
//
// THE PREDICATE IS THE ONE #1268 SETTLED ON, deliberately reused rather than re-derived: a CLAUSE
// that names the measurement AND admits it is absent. Both halves, so "exact ANCHOR TYPE not
// documented" survives. That test found 12 where the phrase list found 0, which is the whole
// argument for it.
//
// Does BOTH things in one pass, because doing them separately is what produced three follow-up
// PRs last time: nulls the number, and drops the clause that explained it.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const ABOUT_LENGTH = /\b(?:length|distance|spacing)\b/i;
const ADMITS = /\bnot\b|\bestimat|\bapproxim|\bassum|\bunconfirmed\b/i;
const isDead = (clause) => ABOUT_LENGTH.test(clause) && ADMITS.test(clause);

// RESCUES, run first. The structural filter works on clauses, and two of these notes weld real
// guidance onto the dead statement with a COMMA rather than a semicolon — so the clause is one
// unit and the whole thing goes, taking the useful half with it:
//
//   "…; approximate length for a double-rope rappel, OR SPLIT INTO TWO SINGLE-ROPE RAPS…"
//   "…; per-rap length not given exactly, KEPT WITHIN SINGLE 60M ROPE RANGE."
//
// Both tell a climber what rope to bring, which survives the number going. Promoted to their own
// sentence so the filter drops only the half that is about the missing figure. Caught by reading
// the dry run — the post-conditions check that nothing dead REMAINS, never that nothing live was
// lost, and no assertion I have written today would have noticed.
const RESCUE = [
  [/;\s*approximate length for a double-rope rappel, or split into two single-rope raps of similar combined length\./i,
    ". Can be done as one double-rope rappel, or split into two single-rope raps."],
  [/;\s*per-rap length not given exactly, kept within single 60m rope range\./i,
    ". Each rap stays within a single 60 m rope."],
];

function dropLengthClauses(note) {
  for (const [re, to] of RESCUE) note = note.replace(re, to);
  const parts = note.split(/(?<=[.;])\s+/);
  const kept = parts.filter((p) => !isDead(p));
  return kept.join(" ")
    .replace(/\s*;\s*$/, ".")
    .replace(/;\s+(?=[A-Z])/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const res = await fetch(`${U}/rest/v1/routes?select=id,rappel_detail,rappel_count_note&rappel_detail=not.is.null&limit=10000`,
  { headers: H, signal: AbortSignal.timeout(30000) });
if (!res.ok) { console.error(`read failed ${res.status}`); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.error("zero rows -- broken read, not a clean catalog."); process.exit(1); }

const targets = [];
for (const x of rows) {
  const d = Array.isArray(x.rappel_detail) ? x.rappel_detail : [];
  const edits = [];
  const next = d.map((s, i) => {
    if (typeof s.lengthM !== "number") return s;
    const note = typeof s.notes === "string" ? s.notes : "";
    if (!note || !note.split(/(?<=[.;])\s+/).some(isDead)) return s;
    const after = dropLengthClauses(note);
    edits.push({ i, was: s.lengthM, before: note, after });
    const copy = { ...s, lengthM: null };
    if (after) copy.notes = after; else delete copy.notes;
    return copy;
  });
  if (edits.length) {
    const numbered = d.filter((s) => typeof s.lengthM === "number").length;
    targets.push({ id: x.id, edits, next, numbered, note: x.rappel_count_note || "",
      all: edits.length === numbered });
  }
}
if (!targets.length) { console.log("nothing to change — no shown number is admitted to be a guess."); process.exit(0); }

let n = 0;
for (const t of targets) {
  console.log(`### ${t.id} — nulling ${t.edits.length} of ${t.numbered} numbered station(s)${t.all ? "  ** the whole table **" : ""}`);
  for (const e of t.edits) {
    n++;
    console.log(`  [${e.i}] ${e.was} m -> —`);
    console.log(`      - ${e.before.replace(/\s+/g, " ").slice(0, 150)}`);
    console.log(`      + ${e.after ? e.after.replace(/\s+/g, " ").slice(0, 150) : "(note removed)"}`);
  }
}
console.log(`\n${n} station(s) across ${targets.length} route(s).`);

// Same fail-closed rule #1245 established: a table that loses EVERY distance must say why on
// screen, or the page is worse than the one we started with.
let missing = 0;
for (const t of targets.filter((x) => x.all)) {
  const ok = /not (?:documented|published|recorded)|no (?:published|source|per-station)|unconfirmed|estimate|approximate/i.test(t.note);
  if (!ok) missing++;
  console.log(`  ${ok ? "ok  " : "NEEDS A NOTE"}  ${t.id}: ${t.note ? t.note.replace(/\s+/g, " ").slice(0, 110) : "(no rappel_count_note)"}`);
}
if (missing) {
  console.error(`\nREFUSING — ${missing} route(s) would lose every distance with nothing explaining it.`);
  process.exit(1);
}
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let bad = 0;
for (const t of targets) {
  await patchRow("routes", t.id, { rappel_detail: t.next });
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${t.id}&select=rappel_detail`, { headers: H })).json();
  const arr = after.rappel_detail || [];
  const still = arr.filter((s) => typeof s.lengthM === "number"
    && typeof s.notes === "string" && s.notes.split(/(?<=[.;])\s+/).some(isDead)).length;
  if (arr.length !== t.next.length || still) { console.log(`  MISMATCH ${t.id} (${still} still showing an admitted guess)`); bad++; }
  else console.log(`  ok ${t.id}`);
}
console.log(bad ? `\n${bad} did not take` : `\nall ${targets.length} verified on re-read`);
process.exit(bad ? 1 : 0);
