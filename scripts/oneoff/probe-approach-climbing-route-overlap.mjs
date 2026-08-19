// When enrichment re-homed climbing prose into `climbing_route`, did it MOVE it or COPY it?
//
// audit:approach-scope reports 361 WA routes whose `approach` runs past the base of the climb,
// and its summary says that text "has nowhere else to live today". That line is stale: 239 of
// the 361 already have `climbing_route` populated. So the question is no longer "where should
// this go" but "is it in BOTH places" — and if it is, the route page states the same climbing
// description twice, once under APPROACH and once under CLIMBING ROUTE.
//
// CLAUDE.md says the batches were produced by re-homing, never researching. Re-homing means
// the source column should have been trimmed. Nothing has ever checked that it was.
//
// Measures SENTENCE overlap rather than substring, because the re-homing pass was allowed to
// rewrite prose freely — only specifics were pinned. A paraphrase is still a duplicate to a
// reader, so near-matching (shared rare-word shingles) counts as well as verbatim.
//
//   node scripts/oneoff/probe-approach-climbing-route-overlap.mjs [--state wa] [--list 20]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const LIST = +arg("--list", 12);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,approach,climbing_route` +
    `&climbing_route=not.is.null&approach=not.is.null` +
    (STATE ? `&id=like.${STATE}_*` : "") +
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
console.log(`${rows.length} ${STATE} routes have BOTH approach and climbing_route populated\n`);

const sentences = t => String(t || "").split(/(?<=[.;!?])\s+|\n+/)
  .map(s => s.trim()).filter(s => s.length > 40);

// Content words only. Stopwords and short tokens match everywhere and would make two unrelated
// sentences about walking uphill look like the same sentence.
const STOP = new Set(("the a an and or of to in on at from for with by is are was were be been " +
  "this that these those it its as up down out over under into onto then than but if you your " +
  "we they he she which where when while about above below after before around near").split(" "));
const words = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
  .filter(w => w.length > 3 && !STOP.has(w));

// Jaccard over content words. 0.6 is deliberately high: the two columns describe the same
// mountain, so a modest overlap ("summit", "gully", "snow") is expected and is NOT duplication.
const SIM = 0.6;
const similar = (a, b) => {
  const A = new Set(words(a)), B = new Set(words(b));
  if (A.size < 4 || B.size < 4) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / new Set([...A, ...B]).size;
};

const crText = r => [].concat(r.climbing_route || [])
  .map(v => (v && typeof v === "object") ? [v.label, v.notes].filter(Boolean).join(". ") : String(v))
  .join("\n");

let dupRoutes = 0, dupSentences = 0;
const findings = [];
for (const r of rows) {
  const ap = sentences(r.approach), cr = sentences(crText(r));
  if (!ap.length || !cr.length) continue;
  const hits = [];
  for (const a of ap) {
    let best = 0, bestB = null;
    for (const b of cr) { const s = similar(a, b); if (s > best) { best = s; bestB = b; } }
    if (best >= SIM) hits.push({ a, b: bestB, s: best });
  }
  if (!hits.length) continue;
  dupRoutes++; dupSentences += hits.length;
  findings.push({ r, hits, ratio: hits.length / ap.length });
}

findings.sort((x, y) => y.hits.length - x.hits.length);
for (const f of findings.slice(0, LIST)) {
  console.log(`── ${f.r.name}  (${f.r.id})  [${f.r.discipline || "?"}]  ${f.hits.length} of ${sentences(f.r.approach).length} approach sentences duplicated`);
  for (const h of f.hits.slice(0, 2)) {
    console.log(`   approach:       ${h.a.slice(0, 150)}`);
    console.log(`   climbing_route: ${h.b.slice(0, 150)}   [${h.s.toFixed(2)}]`);
  }
}
if (findings.length > LIST) console.log(`\n… ${findings.length - LIST} more (raise --list)`);

console.log(`\n${dupRoutes} of ${rows.length} routes repeat at least one approach sentence inside climbing_route`);
console.log(`${dupSentences} duplicated sentences in total, at a Jaccard threshold of ${SIM}`);
console.log("\nReport only — nothing was changed.");
