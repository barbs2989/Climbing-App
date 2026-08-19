// Which routes have their duplicated approach sentences as a CONTIGUOUS TAIL?
//
// 148 WA routes repeat approach prose inside climbing_route. Excising a sentence from the
// MIDDLE of a paragraph is prose surgery — it strands connectives ("From there…", "Beyond
// that…") and leaves text that reads worse than the duplication did. Trimming a contiguous
// TAIL cannot do that, and the tail is also exactly what the audit is about: the approach
// "keeps going past the base of the climb", so the offending text is a suffix by construction.
//
// This splits the queue into the part a structural applier can safely express and the part
// that needs a human reading the paragraph. It writes nothing.
//
//   node scripts/oneoff/list-approach-tail-duplicates.mjs [--state wa] [--json out.json]
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const JSON_OUT = arg("--json", null);
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

// Split on sentence ends but KEEP the offsets, because the applier has to remove the exact
// substring rather than re-join a parsed list — re-joining would silently normalise the
// author's spacing and punctuation across the whole column.
// A naive /(?<=[.;!?])\s+/ split is WRONG on this prose and the first batch proved it:
// wa_lake_mountain_pasayten_scramble reads "a subsidiary rock knob (Pk. 8165) blocks a direct
// line", and splitting at "Pk." would have left the approach ending mid-sentence on an
// unclosed parenthesis. Guidebook prose is full of these — Pk., Mt., Hwy., FR., ft., approx.
//
// The rule that fixes it generally, rather than by listing abbreviations: a real sentence
// starts with a capital or a quote. If the next non-space character is a DIGIT or lowercase,
// the period was an abbreviation or a decimal, not a full stop.
function sentenceSpans(text) {
  const t = String(text || "");
  const out = [];
  let start = 0;
  const re = /(?<=[.;!?])(\s+)/g;
  let m;
  while ((m = re.exec(t))) {
    const next = t[m.index + m[1].length];
    if (next && !/[A-Z"'(\u201c]/.test(next)) continue;      // abbreviation or decimal, not a break
    const piece = t.slice(start, m.index).trim();
    if (piece) out.push({ start, end: m.index, s: piece });
    start = m.index + m[1].length;
  }
  if (start < t.length) out.push({ start, end: t.length, s: t.slice(start).trim() });
  return out.filter(x => x.s.length > 0);
}

// Whatever survives a trim has to read as finished prose. Cheap structural tests only — this
// cannot judge meaning, and is not trying to; it refuses the cases where the CUT is provably
// mid-thought. Balanced brackets and quotes, and no trailing connective left dangling.
const DANGLING = /\b(and|or|but|then|with|via|to|from|through|toward|towards|into|onto|the|a|an|of|at|on|in|before|after|until|while|where|which|that)\s*[.;]?$/i;
function readsFinished(prefix) {
  const t = String(prefix || "").trim();
  if (!t) return { ok: false, why: "the trim would empty the column" };
  const bal = ch => (t.split(ch[0]).length - t.split(ch[1]).length);
  if (bal("()") !== 0) return { ok: false, why: "unbalanced parentheses" };
  if (bal("[]") !== 0) return { ok: false, why: "unbalanced brackets" };
  if ((t.split('"').length - 1) % 2) return { ok: false, why: "unbalanced quotes" };
  if (!/[.;!?]$/.test(t)) return { ok: false, why: "does not end on a full stop" };
  if (DANGLING.test(t.replace(/[.;!?]+$/, ""))) return { ok: false, why: "ends on a dangling connective" };
  return { ok: true };
}

const STOP = new Set(("the a an and or of to in on at from for with by is are was were be been " +
  "this that these those it its as up down out over under into onto then than but if you your " +
  "we they he she which where when while about above below after before around near").split(" "));
const contentWords = t => String(t).toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
  .filter(w => w.length > 3 && !STOP.has(w));
const jaccard = (a, b) => {
  const A = new Set(contentWords(a)), B = new Set(contentWords(b));
  if (A.size < 4 || B.size < 4) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / new Set([...A, ...B]).size;
};
const crProse = r => [].concat(r.climbing_route || [])
  .map(v => (v && typeof v === "object") ? [v.label, v.notes].filter(Boolean).join(". ") : String(v))
  .join("\n");

// Only near-verbatim counts as applier-eligible. A paraphrase can have DROPPED something — the
// Bryant Peak case, where climbing_route lost "the gully" — so deleting the approach copy would
// lose the only surviving mention. 0.9 keeps punctuation and article differences, nothing more.
const SAFE_SIM = 0.9;
const LOOSE_SIM = 0.6;

const tailRows = [], interiorRows = [];
for (const r of rows) {
  const spans = sentenceSpans(r.approach);
  if (spans.length < 2) continue;
  const cr = sentenceSpans(crProse(r)).map(x => x.s);
  if (!cr.length) continue;

  const best = spans.map(x => Math.max(0, ...cr.map(b => jaccard(x.s, b))));
  const dupLoose = best.filter(v => v >= LOOSE_SIM).length;
  if (!dupLoose) continue;

  // Walk back from the end while every sentence is a near-verbatim duplicate.
  let i = spans.length - 1;
  while (i >= 0 && best[i] >= SAFE_SIM) i--;
  const tailStart = i + 1;
  const tailLen = spans.length - tailStart;

  // Never propose emptying the column: an approach that is duplicated end to end is a route
  // whose whole approach lives in climbing_route, and THAT is a judgement about which column
  // should exist at all, not a trim.
  const prefixOk = tailLen > 0 && tailStart > 0
    ? readsFinished(String(r.approach).slice(0, spans[tailStart].start))
    : { ok: false, why: "no contiguous tail" };

  if (tailLen > 0 && tailStart > 0 && prefixOk.ok) {
    tailRows.push({
      id: r.id, name: r.name, discipline: r.discipline,
      keep: spans.length - tailLen, trimming: tailLen, dupLoose,
      cutFrom: spans[tailStart].start,
      lastKept: spans[tailStart - 1].s,
      cut: spans.slice(tailStart).map(x => x.s),
    });
  } else {
    interiorRows.push({ id: r.id, name: r.name, dupLoose, sentences: spans.length,
      wholeColumn: tailLen > 0 && tailStart === 0,
      why: tailLen > 0 && tailStart > 0 ? prefixOk.why : "duplicates are interior, not a tail" });
  }
}

tailRows.sort((a, b) => b.trimming - a.trimming);
console.log(`${rows.length} ${STATE} routes carry both columns`);
console.log(`${tailRows.length} have a contiguous near-verbatim TAIL an applier can express`);
console.log(`${interiorRows.length} have duplicates only in the interior, or duplicate the WHOLE column — human read required`);
console.log(`  of those, ${interiorRows.filter(x => x.wholeColumn).length} duplicate the entire approach end to end`);
const byWhy = new Map();
for (const x of interiorRows) byWhy.set(x.why, (byWhy.get(x.why) || 0) + 1);
for (const [w, n] of [...byWhy].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${w}`);
console.log("");

for (const t of tailRows.slice(0, 14)) {
  console.log(`── ${t.name}  (${t.id})  [${t.discipline}]  keep ${t.keep}, trim ${t.trimming}`);
  console.log(`   last kept: …${t.lastKept.slice(-110)}`);
  for (const c of t.cut.slice(0, 3)) console.log(`   CUT:       ${c.slice(0, 150)}`);
  console.log("");
}
if (tailRows.length > 14) console.log(`… ${tailRows.length - 14} more`);

if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(tailRows, null, 2)); console.log(`\nwrote ${JSON_OUT}`); }
console.log("\nRead-only. Nothing was changed.");
