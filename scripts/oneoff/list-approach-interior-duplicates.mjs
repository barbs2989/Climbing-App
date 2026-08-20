// Interior duplicates: a repeated sentence in the MIDDLE of the approach, with its seam.
//
// The tail applier could only truncate — `approach.slice(0, cut)` — and that made it incapable
// of inventing prose. An interior removal cannot borrow that property in full: it takes a span
// out of the middle and the two halves have to meet. What it CAN keep is deletion-only:
//
//     approach := approach[:start] + approach[end:]
//
// No word is ever added or altered. The risk is not invention, it is a SEAM — the sentence
// after the cut may open with a back-reference ("Beyond that…", "From there…", "Above it…")
// whose antecedent was the sentence just removed. That reads as a non-sequitur, which is worse
// than the duplication it fixes.
//
// So this prints each candidate with the sentence BEFORE and AFTER it, because the seam is the
// whole question and it cannot be judged from the duplicate alone. Writes nothing.
//
//   node scripts/oneoff/list-approach-interior-duplicates.mjs [--state wa] [--list 12] [--json out]
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const LIST = +arg("--list", 12);
const JSON_OUT = arg("--json", null);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

// Same splitter as the tail lister — a naive split breaks on "(Pk. 8165)" and would cut a
// sentence in half. A real sentence starts with a capital or an opening quote.
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

// A sentence that opens by pointing BACKWARDS. If the removed sentence was its antecedent, the
// seam breaks. Deliberately generous: a false positive here only defers a row.
const BACKREF = /^(beyond|above|below|past|from there|from here|after that|after this|this|these|those|it |its |then\b|thereafter|continue|carry on|keep going|the same|that same|higher up|further|farther)/i;


// A back-reference is not always a stock phrase. Reading the first dry run caught two seams the
// BACKREF list missed entirely, and both are the same shape: the following sentence says "the
// col" / "the plateau", and the noun it points at was introduced BY THE SENTENCE BEING REMOVED.
// Devore would have read "...before the summit ridge). From the col, the route turns west..."
// with no col ever mentioned; Cannon would have said "Cross the plateau" having never named one.
//
// So the real test is antecedents, not phrasing: a definite noun phrase in the next sentence
// whose noun appears in the CUT and nowhere before it is an antecedent about to be orphaned.
function orphanedAntecedent(cutText, nextText, beforeText) {
  const cut = new Set(String(cutText).toLowerCase().match(/[a-z]{3,}/g) || []);
  const before = new Set(String(beforeText).toLowerCase().match(/[a-z]{3,}/g) || []);
  const out = [];
  const re = /\b(?:the|this|that|its)\s+([a-z]{3,})/gi;
  let m;
  while ((m = re.exec(String(nextText)))) {
    const noun = m[1].toLowerCase();
    if (cut.has(noun) && !before.has(noun)) out.push(noun);
  }
  return out;
}

const STOP = new Set(("the a an and or of to in on at from for with by is are was were be been " +
  "this that these those it its as up down out over under into onto then than but if you your " +
  "we they he she which where when while about above below after before around near").split(" "));
const words = t => String(t).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
  .filter(w => w.length > 3 && !STOP.has(w));
const jaccard = (a, b) => {
  const A = new Set(words(a)), B = new Set(words(b));
  if (A.size < 4 || B.size < 4) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / new Set([...A, ...B]).size;
};
const crProse = r => [].concat(r.climbing_route || [])
  .map(v => (v && typeof v === "object") ? [v.label, v.notes].filter(Boolean).join(". ") : String(v))
  .join("\n");

// Near-verbatim only. A paraphrase may have DROPPED something — Bryant Peak's climbing_route
// lost "the gully" — so deleting the approach copy would lose the only surviving mention.
const SAFE_SIM = 0.9;

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

let seamRisk = 0, multi = 0;
const cands = [];
for (const r of rows) {
  const spans = sentenceSpans(r.approach);
  if (spans.length < 3) continue;
  const cr = sentenceSpans(crProse(r)).map(x => x.s);
  if (!cr.length) continue;

  const best = spans.map(x => Math.max(0, ...cr.map(b => jaccard(x.s, b))));
  // INTERIOR only: not the last sentence (that is the tail applier's job, already done) and
  // not the first (removing it strands nothing, but it is also where the approach begins).
  const hits = [];
  for (let i = 1; i < spans.length - 1; i++) if (best[i] >= SAFE_SIM) hits.push(i);
  if (!hits.length) continue;

  // One at a time. A route with two interior duplicates needs both seams judged, and the
  // indices shift after the first removal — so it is deferred rather than half-done.
  if (hits.length > 1) { multi++; continue; }

  const i = hits[0];
  const after_ = spans[i + 1];
  if (BACKREF.test(after_.s)) { seamRisk++; continue; }
  if (orphanedAntecedent(spans[i].s, after_.s, String(r.approach).slice(0, spans[i].start)).length) { seamRisk++; continue; }

  cands.push({ id: r.id, name: r.name, discipline: r.discipline,
    idx: i, of: spans.length, sim: +best[i].toFixed(2),
    before: spans[i - 1].s, cut: spans[i].s, after: after_.s,
    cutStart: spans[i].start, cutEnd: after_.start });
}

cands.sort((a, b) => b.sim - a.sim);
for (const c of cands.slice(0, LIST)) {
  console.log(`\n── ${c.name}  (${c.id})  [${c.discipline}]  sentence ${c.idx + 1} of ${c.of}, sim ${c.sim}`);
  console.log(`   before: …${c.before.slice(-120)}`);
  console.log(`   CUT   : ${c.cut.slice(0, 190)}`);
  console.log(`   after : ${c.after.slice(0, 120)}…`);
}
if (cands.length > LIST) console.log(`\n… ${cands.length - LIST} more (raise --list)`);

console.log(`\n${rows.length} ${STATE} routes carry both columns`);
console.log(`  ${cands.length} have exactly ONE near-verbatim interior duplicate with a clean seam`);
console.log(`  ${seamRisk} were deferred — the following sentence opens with a back-reference`);
console.log(`  ${multi} were deferred — more than one interior duplicate, so the indices shift`);
if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(cands, null, 2)); console.log(`\nwrote ${JSON_OUT}`); }
console.log("\nRead-only. Nothing was changed.");
