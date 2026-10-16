// CAN a one-line summary honestly say "water" / "no permit", or would that be a parse of
// English pretending to be a fact? This repo already records what happens when a number is
// read out of prose (`rappels`: "~5 single-rope raps via East Ledges" is not 5 rappels), and
// the two fields here are worse than a count, because both are safety- or money-adjacent:
//   - claiming WATER where there is none sends a party up dry
//   - claiming NO PERMIT where one is required gets somebody fined or turned around
//
// So the test is not "can I classify most of them" — it is "is there a conservative rule that
// is never wrong in the dangerous direction, and how much of the catalog does it leave blank".
// A rule that abstains is fine; a rule that guesses is not.
//
// Read-only. Fails closed on an empty read.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
const sites = rows.flatMap(r => (Array.isArray(r.bivy) ? r.bivy : []));
if (!sites.length) { console.log("FAIL: read no bivy sites"); process.exit(1); }

// Deliberately narrow and anchored to the FIRST clause. Prose about a camp routinely mentions
// the opposite case later in the sentence ("no water at the col; the last reliable source is
// the tarn 400 ft below"), so a whole-field keyword scan reads both ways at once.
const firstClause = v => String(v || "").split(/[;.]/)[0].trim();

const NO_WATER = /\b(no|none|dry|without)\b[^,]{0,30}\bwater\b|\bwater\b[^,]{0,20}\b(none|unavailable|absent)\b|\bcarry (all )?water\b|\bdry camp\b/i;
const YES_WATER = /\b(stream|creek|tarn|lake|spring|snowmelt|melt|river|pond|water (is )?available|running water|potable)\b/i;
const NO_PERMIT = /\bno (wilderness |overnight |camping )?permit\b|\bpermit(s)? (are|is) not required\b|\bno permit required\b|\bwithout a permit\b|\bself[- ]issue/i;
const YES_PERMIT = /\bpermit (is )?required\b|\brequires? a( wilderness| overnight)? permit\b|\bquota\b|\breservation (is )?required\b|\bmust (be )?reserve/i;

const bucket = (v, no, yes) => {
  const c = firstClause(v);
  if (!c) return "blank";
  const n = no.test(c), y = yes.test(c);
  if (n && y) return "BOTH — abstain";
  if (n) return "negative";
  if (y) return "positive";
  return "unclassified";
};

for (const [field, no, yes] of [["water", NO_WATER, YES_WATER], ["permit", NO_PERMIT, YES_PERMIT]]) {
  const counts = new Map();
  for (const s of sites) {
    const b = bucket(s && s[field], no, yes);
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  console.log(`\n== ${field} (${sites.length} sites)`);
  [...counts.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`   ${String(n).padStart(5)}  ${Math.round(n / sites.length * 100)}%  ${k}`));

  // Read the actual strings, never just the counts — a bucket is only as good as what fell in it.
  for (const want of ["negative", "BOTH — abstain", "unclassified"]) {
    const ex = sites.filter(s => bucket(s && s[field], no, yes) === want).slice(0, 3);
    if (!ex.length) continue;
    console.log(`   -- ${want}:`);
    for (const s of ex) console.log(`      ${JSON.stringify(firstClause(s[field]).slice(0, 120))}`);
  }
}
