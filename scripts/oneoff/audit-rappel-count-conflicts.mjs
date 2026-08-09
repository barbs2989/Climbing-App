// #687 put the rappel summary and the rappel table side by side on Overview. Where the two
// disagree, the contradiction is now visible on one screen — e.g. wa_sherpa_peak_east_ridge
// says "2 rappels down the upper West Ridge" while rappel_detail holds 4 rows.
// Find every route where the stated count and the table's row count disagree.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const key = anonKey();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,name,rappels,rappel_detail,rappel_count_note&rappel_detail=not.is.null`, { headers: headers(key) });
if (!res.ok) throw new Error(res.status + " " + (await res.text()).slice(0, 200));
const rows = JSON.parse(await res.text());
console.log("routes with a rappel table:", rows.length);

// Extracting "the first integer" is WRONG here and produced 56 fake conflicts on the first
// pass: "Two ~200-ft rappels down slabs" is 2 rappels, not 200, and "Rappel the route with a
// 70m rope" states no count at all. Only take a number that actually QUALIFIES the word
// rappel, and read number-words, which is how most of these are written.
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, single: 1, a: 1, an: 1 };
const NUM = String.raw`(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|single)`;
// optional length/rope qualifier sitting between the count and the word "rappel"
const QUAL = String.raw`(?:\s*~?\s*\d+(?:\.\d+)?\s*(?:-|\s)?\s*(?:ft|foot|feet|m|meter|metre)s?\b)?`;
const stated = (r) => {
  const v = r.rappels;
  if (v == null) return { n: null, range: false };
  if (typeof v === "object") return { n: v.count != null ? Number(v.count) : null, range: false };
  const s = String(v).trim().toLowerCase();
  if (/^\s*\d+$/.test(s)) return { n: Number(s), range: false };        // bare count
  // a stated range is an admitted uncertainty, not a contradiction
  if (new RegExp(String.raw`${NUM}\s*(?:-|–|to)\s*${NUM}${QUAL}\s+(?:short\s+|full\s+)?raps?(?:pels?)?\b`).test(s)) return { n: null, range: true };
  if (/\broughly\s+\d+\s*(?:-|–|to)\s*\d+/.test(s)) return { n: null, range: true };
  const m = new RegExp(String.raw`\b(?:~|about|approx\.?|roughly\s+)?${NUM}${QUAL}\s+(?:short\s+|full\s+|single\s+|half-rope\s+|documented\s+)?raps?(?:pels?)?\b`).exec(s);
  if (!m) return { n: null, range: false };                              // prose, no count
  const raw = m[1];
  return { n: /^\d+$/.test(raw) ? Number(raw) : WORDS[raw], range: false };
};

const conflicts = [], ranges = [], agree = [], noSummary = [];
for (const r of rows) {
  const detail = Array.isArray(r.rappel_detail) ? r.rappel_detail.length : 0;
  const { n, range } = stated(r);
  if (r.rappels == null) { noSummary.push(r); continue; }
  if (range) { ranges.push({ r, detail }); continue; }
  if (n == null) continue;                 // prose with no number at all
  (n === detail ? agree : conflicts).push({ r, n, detail });
}
console.log("summary agrees with the table:", agree.length);
console.log("summary is a RANGE (uncertainty, not a conflict):", ranges.length);
console.log("no summary at all:", noSummary.length);
console.log("\nCONFLICTS — the two numbers on the same screen disagree:", conflicts.length);
for (const c of conflicts.sort((a, b) => Math.abs(b.n - b.detail) - Math.abs(a.n - a.detail))) {
  console.log(`  ${c.r.id.padEnd(46)} says ${String(c.n).padStart(2)}, table has ${String(c.detail).padStart(2)}   ${JSON.stringify(String(c.r.rappels).slice(0, 80))}`);
}
if (ranges.length) {
  console.log("\nranges (informational):");
  for (const x of ranges) console.log(`  ${x.r.id.padEnd(46)} table ${x.detail}  ${JSON.stringify(String(x.r.rappels).slice(0, 70))}`);
}
