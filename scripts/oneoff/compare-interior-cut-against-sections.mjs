// Does an interior duplicate correspond to a NAMED climbing_route section?
//
// The same acceptance rule the tail batches settled on: a trim is correct only when the cut
// sentence is a restatement of a section the route already names. Where it is not, the
// enrichment copied the sentence because it was ADJACENT, and removing it from the approach is
// a judgement about where hazard or timing prose belongs rather than a de-duplication.
//
// Across 62 tail candidates that rule accepted 14. Expect a similar rate here.
//
//   node scripts/oneoff/compare-interior-cut-against-sections.mjs interior.json [id ...]
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const [file, ...only] = process.argv.slice(2);
if (!file) { console.error("give the interior json"); process.exit(1); }
const cands = JSON.parse(fs.readFileSync(file, "utf8"));
const want = only.length ? cands.filter(c => only.includes(c.id)) : cands;
if (!want.length) throw new Error("no matching rows");

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,climbing_route&id=in.(${want.map(c => c.id).join(",")})`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const byId = Object.fromEntries(JSON.parse(await res.text()).map(r => [r.id, r]));
if (!Object.keys(byId).length) throw new Error("zero rows read — a clean answer here would be a false pass");

// Content-word overlap between the cut and each section LABEL. A label is short, so the bar is
// lower than the sentence-level threshold — this ranks for a human, it does not decide.
const STOP = new Set("the a an and or of to in on at from for with by is are was to into onto".split(" "));
const words = t => String(t).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
const overlap = (a, b) => {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of B) if (A.has(w)) hit++;
  return hit / B.size;
};

for (const c of want) {
  const secs = [].concat((byId[c.id] || {}).climbing_route || [])
    .filter(v => v && typeof v === "object").map(v => v.label || "(no label)");
  const scored = secs.map(s => ({ s, o: overlap(c.cut, s) })).sort((x, y) => y.o - x.o);
  const top = scored[0];
  console.log(`\n${c.id}   sentence ${c.idx + 1}/${c.of}`);
  console.log(`  CUT: ${c.cut.slice(0, 150)}`);
  console.log(`  best-matching section: ${top ? `"${top.s}"  (${top.o.toFixed(2)})` : "(none)"}`);
  if (secs.length > 1) console.log(`  other sections: ${scored.slice(1).map(x => x.s).join(" | ")}`);
}
console.log(`\n${want.length} candidate(s). A high score is a POINTER, not a verdict — read the cut.`);
