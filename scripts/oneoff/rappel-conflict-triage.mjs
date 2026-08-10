/* #687 put the rappel summary and the rappel table side by side on Overview, so where the two
   disagree the contradiction is now visible on ONE screen. audit-rappel-count-conflicts.mjs
   finds 23 of those. This triages them into what can be reconciled from the row's own
   evidence and what needs a source.

   The split that matters: many rows carry a `rappel_count_note`, written when the table was
   built, that ALREADY adjudicates the disagreement — wa_liberty_bell_nw_face's says "Route's
   own field lists 2, but the descent text describes 3 distinct rappels". Where such a note
   exists, matching `rappels` to the table is bookkeeping, not a new claim. Where it does not,
   the conflict is a real open question and is printed for research rather than auto-resolved.

   Read-only. Emits SQL to stdout with --sql; run `npm run check:sql` on it before pasting. */
import { anonKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";

const key = anonKey();
const emitSql = process.argv.includes("--sql");

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,name,rappels,rappel_detail,rappel_count_note&rappel_detail=not.is.null`, { headers: headers(key) });
if (!res.ok) throw new Error(res.status + " " + (await res.text()).slice(0, 200));
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error("empty read — refusing to report a clean result on no data");

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, single: 1, a: 1, an: 1 };
const NUM = String.raw`(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|single)`;
const QUAL = String.raw`(?:\s*~?\s*\d+(?:\.\d+)?\s*(?:-|\s)?\s*(?:ft|foot|feet|m|meter|metre)s?\b)?`;
const stated = (r) => {
  const v = r.rappels;
  if (v == null) return { n: null, range: false };
  if (typeof v === "object") return { n: v.count != null ? Number(v.count) : null, range: false };
  const s = String(v).trim().toLowerCase();
  if (/^\s*\d+$/.test(s)) return { n: Number(s), range: false };
  if (new RegExp(String.raw`${NUM}\s*(?:-|–|to)\s*${NUM}${QUAL}\s+(?:short\s+|full\s+)?raps?(?:pels?)?\b`).test(s)) return { n: null, range: true };
  if (/\broughly\s+\d+\s*(?:-|–|to)\s*\d+/.test(s)) return { n: null, range: true };
  const m = new RegExp(String.raw`\b(?:~|about|approx\.?|roughly\s+)?${NUM}${QUAL}\s+(?:short\s+|full\s+|single\s+|half-rope\s+|documented\s+)?raps?(?:pels?)?\b`).exec(s);
  if (!m) return { n: null, range: false };
  return { n: /^\d+$/.test(m[1]) ? Number(m[1]) : WORDS[m[1]], range: false };
};

// Does the note actually adjudicate, i.e. acknowledge the mismatch and say which side is right?
const ADJUDICATES = /\b(?:route'?s own field|own field lists|metadata (?:likely )?counts|on-file summary|summary (?:says|states|lists)|listed as \d|stated count|field lists|is not accurate|corroborated|descent text (?:describes|specifies|states))\b/i;

const conflicts = [];
for (const r of rows) {
  const detail = Array.isArray(r.rappel_detail) ? r.rappel_detail.length : 0;
  const { n, range } = stated(r);
  if (r.rappels == null || range || n == null || n === detail) continue;
  conflicts.push({ r, n, detail, adjudicated: !!(r.rappel_count_note && ADJUDICATES.test(r.rappel_count_note)) });
}

const auto = conflicts.filter((c) => c.adjudicated);
const research = conflicts.filter((c) => !c.adjudicated);

console.log(`routes with a rappel table: ${rows.length}`);
console.log(`summary contradicts the table on screen: ${conflicts.length}`);
console.log(`  ...where the row's own rappel_count_note adjudicates: ${auto.length}`);
console.log(`  ...needing a source before anything is changed:       ${research.length}\n`);

console.log("RECONCILABLE FROM THE ROW'S OWN NOTE");
for (const c of auto) {
  console.log(`  ${c.r.id.padEnd(46)} says ${String(c.n).padStart(2)} -> table ${String(c.detail).padStart(2)}`);
  console.log(`      note: ${String(c.r.rappel_count_note).slice(0, 160)}`);
}
console.log("\nNEEDS RESEARCH — do not change these without a source");
for (const c of research) {
  console.log(`  ${c.r.id.padEnd(46)} says ${String(c.n).padStart(2)} -> table ${String(c.detail).padStart(2)}   ${JSON.stringify(String(c.r.rappels).slice(0, 90))}`);
}

if (emitSql) {
  console.log("\n-- ===== SQL (reconcilable only; research set deliberately excluded) =====");
  for (const c of auto) {
    const id = c.r.id.replace(/'/g, "''");
    console.log(`UPDATE routes SET rappels = '${c.detail}' WHERE id = '${id}' AND rappels IS DISTINCT FROM '${c.detail}';`);
  }
}
