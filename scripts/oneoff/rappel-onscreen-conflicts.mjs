/* Which routes actually show two DIFFERENT rappel counts on one screen, given how the page
   renders today?

   rappel-conflict-triage.mjs answers a slightly different question, and since #784 the two
   have drifted. The page now derives the RAPPELS heading from the TABLE (rappelHeadingCount
   takes a count only from a table, a bare number or an explicit range) and prints the
   `rappels` summary as prose underneath. So a contradiction exists only when that prose
   ASSERTS a count of its own that differs from the table's row count.

   That distinction matters before editing 20 rows: wa_goode_mountain_megalodon_ridge is
   flagged by the old triage but its summary states no count at all — the "5" comes from
   "a 50m rappel", a length. Rewriting its prose would be fixing nothing and risking real beta.

   The count regex here is the strict one: a digit only counts if it qualifies the word
   rappel/rap, with at most a length qualifier between ("Two ~200-ft rappels" is 2, not 200).

   The `\b` after the number is load-bearing and was missing in the first draft. Without it the
   length qualifier can eat part of the number itself: "a 50m rappel" matched with NUM="5" and
   QUAL="0m", reporting a count of 5 for a route that states none, and "~100 ft rappel from
   Sharkfin Col" reported 10. Both are LENGTHS. That mis-split invented 3 conflicts and would
   have sent someone rewriting correct beta. Self-tested at the bottom of this file. */
const SELFTEST = [
  ["a 50m rappel was used to bypass an icy moat", null],
  ["~100 ft rappel from Sharkfin Col onto Boston Glacier", null],
  ["75 feet (single rappel possible on descent)", 1],
  ["~5 rappels back down the face/gully system", 5],
  ["Two half-rope rappels through gaps/cols", 2],
  ["Two ~200-ft rappels down slabs", 2],
  // a stated total beats a leading per-segment count
  ["6 total: 3 rappels to Black Tooth Notch, 3 rappels into southwest couloir", 6],
];
/*

   Read-only. */
import { anonKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";

const key = anonKey();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,rappels,rappel_detail,rappel_count_note&rappel_detail=not.is.null`, { headers: headers(key) });
if (!res.ok) throw new Error(res.status + " " + (await res.text()).slice(0, 200));
const rows = await res.json();
if (!rows.length) throw new Error("empty read — refusing to report a clean result");

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, single: 1 };
const NUM = String.raw`(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|single)`;
const QUAL = String.raw`(?:\s*~?\s*\d+(?:\.\d+)?\s*(?:-|\s)?\s*(?:ft|foot|feet|m|meter|metre)s?\b)?`;
const RANGE = new RegExp(String.raw`${NUM}\s*(?:-|–|to)\s*${NUM}\b${QUAL}\s*(?:-|\s)\s*(?:short\s+|full\s+)?raps?(?:pels?)?\b`, "i");
const ONE = new RegExp(String.raw`\b(?:~|about|approx\.?|roughly\s+)?${NUM}\b${QUAL}\s*(?:-|\s)\s*(?:short\s+|full\s+|single\s+|half-rope\s+|documented\s+|double-rope\s+|single-rope\s+)?raps?(?:pels?)?\b`, "i");

/* A stated TOTAL wins over any per-segment count, wherever it sits. Mount Goode's Northeast
   Buttress reads "6 total: 3 rappels to Black Tooth Notch, 3 rappels into southwest couloir" —
   it agrees with its 6-row table, but a first-match rule reads the leading "3 rappels" and
   reports a contradiction that is not there. Otherwise the FIRST count-bearing clause is the
   claim, since later ones usually describe an alternative descent. */
const TOTAL = /\b(\d+)\s*(?:rappels?|raps?)?\s*(?:in\s+)?total\b|\btotal(?:ing)?\s*(?:of\s*)?(\d+)\s*(?:rappels?|raps?)\b/i;
const claimed = (v) => {
  if (typeof v === "string") {
    const t = TOTAL.exec(v);
    if (t) return { n: Number(t[1] ?? t[2]), range: false };
  }
  return claimedInner(v);
};
const claimedInner = (v) => {
  if (v == null) return { n: null, range: false };
  if (typeof v === "object") return { n: v.count ?? null, range: false };
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return { n: Number(s), range: false };
  if (RANGE.test(s)) return { n: null, range: true };
  const m = ONE.exec(s);
  if (!m) return { n: null, range: false };
  const raw = String(m[1]).toLowerCase();
  return { n: /^\d+$/.test(raw) ? Number(raw) : (WORDS[raw] ?? null), range: false };
};

// Refuse to report on the catalog until the extractor proves it can tell a count from a length.
for (const [s, want] of SELFTEST) {
  const got = claimed(s).n;
  if (got !== want) throw new Error(`SELFTEST failed: ${JSON.stringify(s)} -> ${got}, want ${want}`);
}
console.log(`extractor self-test: ${SELFTEST.length}/${SELFTEST.length} (counts vs lengths)\n`);

/* A row that names BOTH rope setups and states the table's count somewhere in its own text is
   not contradicting itself — it is describing one descent two ways, which is what these
   descents genuinely are (Forbidden West Ridge: 3 on two ropes, ~5 on one; Ingalls South
   Ridge: 3 on two, 4 on one). Counting those as defects sends someone to "correct" a number
   that is right, and the correction deletes the other half of the answer. */
const SINGLE = /\bsingle[- ]rope\b|\bone 60\s?m\b|\ba single 60\b|\bsingle 60\s?m\b|\bon a single\b/i;
const DOUBLE = /\bdouble[- ]rope\b|\btwo (?:60|70)\s?m ropes?\b|\btwo ropes\b|\bdoubled\b|\bhalf[- ]ropes?\b/i;
const reconciledByRope = (r, table) => {
  const hay = [r.rappels, r.rappel_count_note].filter(Boolean).join(" ");
  if (!(SINGLE.test(hay) && DOUBLE.test(hay))) return false;
  const nums = new Set();
  for (const m of hay.matchAll(/\b(\d{1,2})\b/g)) nums.add(Number(m[1]));
  for (const [w, n] of Object.entries(WORDS)) if (new RegExp(`\\b${w}\\b`, "i").test(hay)) nums.add(n);
  return nums.has(table);
};

const real = [], noClaim = [], ranges = [], agree = [], byRope = [];
for (const r of rows) {
  const table = Array.isArray(r.rappel_detail) ? r.rappel_detail.length : 0;
  if (!table) continue;
  const { n, range } = claimed(r.rappels);
  if (range) { ranges.push({ r, table }); continue; }
  if (n == null) { noClaim.push({ r, table }); continue; }
  if (n === table) { agree.push({ r, n, table }); continue; }
  (reconciledByRope(r, table) ? byRope : real).push({ r, n, table });
}
console.log(`routes with a rappel table: ${rows.length}`);
console.log(`  prose agrees with the table          : ${agree.length}`);
console.log(`  prose states a RANGE (admitted doubt): ${ranges.length}`);
console.log(`  prose states NO count (no conflict)  : ${noClaim.length}`);
console.log(`  reconciled by ROPE SETUP (both stated): ${byRope.length}`);
console.log(`\nGENUINE on-screen contradictions: ${real.length}\n`);
for (const c of real.sort((a, b) => Math.abs(b.n - b.table) - Math.abs(a.n - a.table))) {
  const adjudicated = c.r.rappel_count_note && /\b(?:used (?:as|here)|representative|better-supported|per source|commonly cited|corroborated|treat \d+ as)\b/i.test(c.r.rappel_count_note);
  console.log(`  ${c.r.id.padEnd(44)} prose ${String(c.n).padStart(2)} vs table ${String(c.table).padStart(2)}  ${adjudicated ? "[note adjudicates -> table]" : "[needs a source]"}`);
}
