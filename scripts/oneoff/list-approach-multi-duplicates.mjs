// Routes with MORE THAN ONE interior duplicate, and every cut each one would take.
//
// The single-removal applier refuses these whole, because sentence indices shift the moment one
// span is removed and a half-done route is worse than an untouched one. Handling them means
// removing successively — re-deriving the spans after each cut, and re-running every gate
// against the text as it then stands, never against the original.
//
// That re-derivation is the whole difficulty and it is why they were deferred: a seam that was
// clean before the first removal may not be after it. So this prints EVERY cut a route would
// take, in the order they would happen, with the seam each one leaves — because approving a
// route here is approving a sequence, not a sentence.
//
//   node scripts/oneoff/list-approach-multi-duplicates.mjs [--state wa] [--list 10] [--json out]
import fs from "fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const LIST = +arg("--list", 10);
const JSON_OUT = arg("--json", null);
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
const BACKREF = /^(beyond|above|below|past|from there|from here|after that|after this|this|these|those|it |its |then\b|thereafter|continue|carry on|keep going|the same|that same|higher up|further|farther)/i;
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
const SAFE_SIM = 0.9;

// One removal against the CURRENT text. Returns the next text plus what it took, or a reason.
// Shared shape with the applier so "what the lister showed" and "what the applier does" cannot
// drift — the two disagreeing is how a reviewed batch stops meaning anything.
export function stepOnce(approach, cr) {
  const spans = sentenceSpans(approach);
  if (spans.length < 3) return { done: true, why: "fewer than 3 sentences" };
  const best = spans.map(x => Math.max(0, ...cr.map(b => jaccard(x.s, b))));
  for (let i = 1; i < spans.length - 1; i++) {
    if (best[i] < SAFE_SIM) continue;
    const nextS = spans[i + 1];
    if (BACKREF.test(nextS.s)) return { blocked: true, why: `sentence ${i + 1} — the next one opens with a back-reference` };
    const orph = orphanedAntecedent(spans[i].s, nextS.s, approach.slice(0, spans[i].start));
    if (orph.length) return { blocked: true, why: `sentence ${i + 1} — would orphan "${orph.join('", "')}"` };
    const next = (approach.slice(0, spans[i].start) + approach.slice(nextS.start)).replace(/\s+$/, "");
    return { next, cut: spans[i].s, seam: nextS.s, sim: +best[i].toFixed(2) };
  }
  return { done: true, why: "no further near-verbatim interior duplicate" };
}

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,approach,climbing_route` +
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = [];
  for (let after = null; ;) {
    const p = await page(after);
    if (!p.length) break;
    rows.push(...p);
    if (p.length < 500) break;
    after = p[p.length - 1].id;
  }
  if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");

  const out = [];
  let blockedAfterFirst = 0;
  for (const r of rows) {
    const cr = sentenceSpans(crProse(r)).map(x => x.s);
    if (!cr.length) continue;
    let text = String(r.approach);
    const cuts = [];
    let blocked = null;
    for (;;) {
      const step = stepOnce(text, cr);
      if (step.done) break;
      if (step.blocked) { blocked = step.why; break; }
      cuts.push({ cut: step.cut, seam: step.seam, sim: step.sim });
      text = step.next;
    }
    if (cuts.length < 2) continue;                       // batch 1 already handled the singles
    if (blocked) blockedAfterFirst++;
    out.push({ id: r.id, name: r.name, discipline: r.discipline, cuts, blocked,
      before: String(r.approach).length, after: text.length });
  }

  out.sort((a, b) => b.cuts.length - a.cuts.length);
  for (const o of out.slice(0, LIST)) {
    console.log(`\n── ${o.name}  (${o.id})  [${o.discipline}]  ${o.cuts.length} removals, ${o.before} -> ${o.after} chars`);
    o.cuts.forEach((c, n) => {
      console.log(`   ${n + 1}. CUT  [${c.sim}] ${c.cut.slice(0, 150)}`);
      console.log(`      seam: ${c.seam.slice(0, 110)}…`);
    });
    if (o.blocked) console.log(`   then STOPS: ${o.blocked}`);
  }
  if (out.length > LIST) console.log(`\n… ${out.length - LIST} more (raise --list)`);

  console.log(`\n${out.length} routes take 2 or more successive removals`);
  console.log(`  ${blockedAfterFirst} of them stop partway — a later seam fails a gate, which is exactly`);
  console.log(`  what re-deriving after each cut is for. A partial run is allowed here: each removal`);
  console.log(`  stands on its own, and stopping early leaves prose that still reads.`);
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2)); console.log(`\nwrote ${JSON_OUT}`); }
  console.log("\nRead-only. Nothing was changed.");
}
