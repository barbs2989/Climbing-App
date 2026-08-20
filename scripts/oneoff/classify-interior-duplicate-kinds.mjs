// What KIND of sentence is each remaining interior duplicate?
//
// Two reviewed batches have now judged 50 interior candidates by hand and accepted 10. The
// rejections were not close calls — they were hazard notes, conditions, gear advice and timing
// estimates that the enrichment copied because they sat next to climbing prose, not because
// they were climbing prose.
//
// If that is the shape of the whole remainder, then "118 interior duplicates" describes the
// column overlap and badly overstates the ACTIONABLE work, in the same way "254 routes have
// nowhere to put this text" did before it was checked. So this classifies rather than counts.
//
// REPORT-ONLY, and the classes are a triage aid rather than a verdict: a sentence can describe
// terrain and warn about it in the same breath, and those go to `mixed` for a human. The point
// is the distribution, not a label per row.
//
//   node scripts/oneoff/classify-interior-duplicate-kinds.mjs [--state wa] [--list 8]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const LIST = +arg("--list", 8);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

function sentenceSpans(text) {
  const t = String(text || "");
  const out = [];
  let start = 0;
  const re = /(?<=[.;!?])(\s+)/g;
  let m;
  while ((m = re.exec(t))) {
    const next = t[m.index + m[1].length];
    if (next && !/[A-Z"'(“]/.test(next)) continue;
    const piece = t.slice(start, m.index).trim();
    if (piece) out.push({ start, end: m.index, s: piece });
    start = m.index + m[1].length;
  }
  if (start < t.length) out.push({ start, end: t.length, s: t.slice(start).trim() });
  return out.filter(x => x.s.length > 0);
}
const STOP = new Set(("the a an and or of to in on at from for with by is are was were be been " +
  "this that these those it its as up down out over under into onto then than but if you your " +
  "we they he she which where when while about above below after before around near").split(" "));
const words = t => String(t).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
const jaccard = (a, b) => {
  const A = new Set(words(a)), B = new Set(words(b));
  if (A.size < 4 || B.size < 4) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / new Set([...A, ...B]).size;
};
const crProse = r => [].concat(r.climbing_route || [])
  .map(v => (v && typeof v === "object") ? [v.label, v.notes].filter(Boolean).join(". ") : String(v)).join("\n");

// Vocabulary drawn from the sentences two batches actually rejected, not invented up front.
const HAZARD = /\b(hazard|rockfall|loose rock|helmet|avalanche|crevasse|moat|cornice|exposure|slip|fatal|serious|careful|watch for|beware|do not|avoid|risk|danger)\b/i;
const GEAR = /\b(ice axe|crampon|microspike|rope|harness|rack|pickets?|screws?|carry|bring|required|recommended)\b/i;
const TIMING = /\b(hours?|round trip|one-way|car-to-car|overnight|two-day|2-day|miles? with|ft of gain|budget|figure roughly|typically takes)\b/i;
const CONDITIONS = /\b(early season|late season|into july|into august|midsummer|snow-free|lingers?|persists?|by mid|depending on the season|verglas|melts? out)\b/i;
// Movement verbs with a place — the shape of a sentence that tells you where the route goes.
const ROUTE = /\b(climb|ascend|descend|traverse|follow|gain|contour|scramble|cross|head|turn|angle|work up|continue)\b/i;

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,approach,climbing_route` +
    `&climbing_route=not.is.null&approach=not.is.null` + (STATE ? `&id=like.${STATE}_*` : "") +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=500`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 900 * (a + 1)));
  }
}

const rows = [];
for (let after = null; ;) {
  const p = await page(after);
  if (!p.length) break;
  rows.push(...p);
  if (p.length < 500) break;
  after = p[p.length - 1].id;
}
if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");

const kinds = { "route description": [], "hazard / warning": [], "gear": [], "timing / stats": [], "conditions": [], mixed: [], other: [] };
let total = 0;
for (const r of rows) {
  const cr = sentenceSpans(crProse(r)).map(x => x.s);
  if (!cr.length) continue;
  const spans = sentenceSpans(r.approach);
  for (let i = 1; i < spans.length - 1; i++) {
    const s = spans[i].s;
    if (Math.max(0, ...cr.map(b => jaccard(s, b))) < 0.9) continue;
    total++;
    const flags = [HAZARD.test(s), GEAR.test(s), TIMING.test(s), CONDITIONS.test(s)];
    const nonRoute = flags.filter(Boolean).length;
    const isRoute = ROUTE.test(s);
    let k;
    if (nonRoute && isRoute) k = "mixed";
    else if (!nonRoute && isRoute) k = "route description";
    else if (flags[0]) k = "hazard / warning";
    else if (flags[1]) k = "gear";
    else if (flags[2]) k = "timing / stats";
    else if (flags[3]) k = "conditions";
    else k = "other";
    kinds[k].push({ id: r.id, s });
  }
}

console.log(`${total} near-verbatim interior duplicate sentences across ${rows.length} ${STATE} routes\n`);
for (const [k, list] of Object.entries(kinds).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(list.length).padStart(4)}  ${k}`);
}
console.log("\nSamples:");
for (const [k, list] of Object.entries(kinds)) {
  if (!list.length) continue;
  console.log(`\n  ${k}:`);
  for (const x of list.slice(0, Math.min(LIST, 2))) console.log(`    ${x.id}: ${x.s.slice(0, 130)}`);
}
console.log("\nReport only. `mixed` and `route description` are where the actionable work is;");
console.log("the other classes were rejected on sight by both reviewed batches.");
