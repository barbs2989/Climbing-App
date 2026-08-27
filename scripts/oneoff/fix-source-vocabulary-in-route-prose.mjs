// Route prose that says where its information came from, reworded — never deleted.
//
// #1284 widened audit:prose-citations from 3 prose columns to 26 and made 802 of these visible.
// Classifying them by repair shape said 588 were "mechanically safe" to drop. THAT CLASSIFICATION
// WAS MISLEADING AND I NEARLY ACTED ON IT:
//
//   "sources describe this station as natural/mixed rather than a clean bolted one"
//   "(type not specified in source)"
//
// The first carries a real fact about the anchor; the second tells a climber the anchor type is
// UNKNOWN, which is exactly what they need before deciding what to bring. Structurally droppable
// is not the same as content-free, and my post-conditions all check that nothing bad REMAINS
// rather than that nothing good was LOST — the asymmetry that has now cost a punctuation seam and
// two rescued guidance clauses today.
//
// So every rule here is a SUBSTITUTION. The provenance word goes; the fact it was attached to
// stays, in the idiom #1188 already established for this ("Accounts disagree on the count").
// Nothing is deleted outright.
//
// GUARDED AGAINST MY OWN BLIND SPOT: the run refuses any value that loses more than a rule's own
// phrase-length worth of text, so a rule that accidentally eats a sentence cannot ship. That is a
// post-condition about LOSS, which is the one I keep failing to write.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ONLY = (process.argv.find((a) => a.startsWith("--col=")) || "").slice(6);
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

// Every entry rewords. `sources` becomes what it actually means — the published record, or the
// accounts a climber could read — with no third party named and no claim about our pipeline.
const RULES = [
  [/\bnot (?:specified|documented|stated|given|recorded|broken out) in (?:the |any )?sources?(?: found| checked)?\b/gi, "not recorded"],
  [/\bnot supported by any source(?: specific to [^,.;]+)?\b/gi, "not corroborated anywhere"],
  [/\bno sources?\s+(?:gives?|describes?|documents?|states?|specifies|mentions?|confirms?)\b/gi, "no published account gives"],
  [/\bno confirmed ([a-z ]{1,28}?) found in sources?\b/gi, "no confirmed $1 on record"],
  [/\bsources?\s+differ\b/gi, "accounts differ"],
  [/\bsources?\s+disagree\b/gi, "accounts disagree"],
  [/\bsources?\s+vary\b/gi, "accounts vary"],
  [/\bsources?\s+conflict\b/gi, "accounts conflict"],
  [/\bsources?\s+describe\b/gi, "accounts describe"],
  [/\bsources?\s+report\b/gi, "accounts report"],
  [/\bsources?\s+say\b/gi, "accounts say"],
  [/\bsources?\s+state\b/gi, "accounts state"],
  [/\bsources?\s+agree\b/gi, "accounts agree"],
  [/\bsources?\s+indicate\b/gi, "accounts indicate"],
  [/\bsources?\s+confirm\b/gi, "accounts confirm"],
  [/\bsources?\s+list\b/gi, "accounts list"],
  [/\bsources?\s+only say\b/gi, "accounts only say"],
  [/\bdepending on the sources?\b/gi, "depending on the account"],
  [/\bthe sources?\s+(does not|doesn't|do not|don't)\b/gi, "the published record $1"],
  [/\bin the source (?:account|report|text|trip report)\b/gi, "in the account on record"],
  [/\bper (?:the )?sources?\b/gi, "on record"],
  [/\bsource range\b/gi, "published range"],
  [/\b(?:multiple|several|various|numerous|independent|published|online|climbing)\s+sources?\b/gi, "several accounts"],
  [/\bguidebook sources?\b/gi, "guidebook accounts"],
  [/\bby any source\b/gi, "anywhere"],
  [/\bfound in sources?\b/gi, "on record"],
  [/\bsourced (?:via|from)\b/gi, "taken from"],
  [/\s{2,}/g, " "],
];

// Nothing may still name where the information came from.
const LEFT = /\bsources?\b/i;

const PROSE_COLS = ["rappel_detail", "rappel_count_note", "rappels", "descent_text", "descent",
  "beta", "overview", "watch_out", "best_season", "approach", "approach_variants", "climbing_route",
  "itinerary", "bivy", "pitch_detail", "gear", "what_to_bring", "pro_tips", "hazards", "obj_haz",
  "seasonal_guidance", "seasonal_hazards", "climate", "emergency", "crowds", "partner_requirements"];
const COLS = ONLY ? PROSE_COLS.filter((c) => c === ONLY) : PROSE_COLS;
if (!COLS.length) { console.error(`--col=${ONLY} is not a prose column.`); process.exit(1); }

// The water trap this class is famous for. A creek can BE a source; it cannot be reworded.
const WATER = /\b(?:water|creek|stream|lake|tarn|spring|snowmelt|melt|puddle|bottle|fill|filter|treat|potable|drinking)\w*/i;
function transform(s) {
  let out = s;
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out.trim();
}

function deepMap(v, fn) {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => deepMap(x, fn));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, fn)]));
  return v;
}

let changed = 0, refusedLoss = 0, skippedWater = 0;
const targets = [];
for (const col of COLS) {
  let rows;
  try {
    const r = await fetch(`${U}/rest/v1/routes?select=id,${col}&${col}=not.is.null&limit=10000`,
      { headers: H, signal: AbortSignal.timeout(30000) });
    if (!r.ok) { console.error(`FAIL — ${col} read ${r.status}.`); process.exit(1); }
    rows = await r.json();
  } catch (e) { console.error(`FAIL — ${col} read threw (${String(e.message || e)}).`); process.exit(1); }

  for (const x of rows) {
    let touched = false, refuse = null;
    const next = deepMap(x[col], (s) => {
      if (!LEFT.test(s)) return s;
      const out = transform(s);
      if (out === s) return s;
      // A sentence whose SOURCE is water must not be reworded; the rules should not have matched.
      const bit = s.split(/(?<=[.;])\s+/).find((p) => LEFT.test(p) && transform(p) !== p);
      if (bit && WATER.test(bit) && !/\b(?:differ|disagree|vary|describe|report|say|state|record|document|specif|publish)/i.test(bit)) {
        skippedWater++; return s;
      }
      // LOSS GUARD: a substitution may shorten a value only by roughly what it replaced.
      if (out.length < s.length - 60) { refuse = { s, out }; return s; }
      touched = true; changed++;
      return out;
    });
    if (refuse) { refusedLoss++; console.log(`REFUSED (would lose ${refuse.s.length - refuse.out.length} chars) ${x.id} ${col}\n   ${refuse.s.slice(0, 130)}`); }
    if (touched) targets.push({ id: x.id, col, next, before: x[col] });
  }
}

console.log(`\n${changed} value(s) reworded across ${targets.length} row(s); ${skippedWater} water sentence(s) skipped; ${refusedLoss} refused for loss.`);
if (!targets.length) { console.log("nothing to change."); process.exit(0); }

for (const t of targets.slice(0, 12)) {
  const b = JSON.stringify(t.before), a = JSON.stringify(t.next);
  const i = [...b].findIndex((c, k) => c !== a[k]);
  console.log(`\n### ${t.id} ${t.col}`);
  console.log(`  - …${b.slice(Math.max(0, i - 70), i + 110)}…`);
  console.log(`  + …${a.slice(Math.max(0, i - 70), i + 110)}…`);
}
if (targets.length > 12) console.log(`\n… ${targets.length - 12} more rows`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let bad = 0;
for (const t of targets) {
  await patchRow("routes", t.id, { [t.col]: t.next });
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${t.id}&select=${t.col}`, { headers: H })).json();
  if (JSON.stringify(after[t.col]) !== JSON.stringify(t.next)) { console.log(`  MISMATCH ${t.id} ${t.col}`); bad++; }
}
console.log(bad ? `\n${bad} did not take` : `\nall ${targets.length} row(s) verified on re-read`);
process.exit(bad ? 1 : 0);
