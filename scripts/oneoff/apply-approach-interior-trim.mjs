// Remove ONE duplicated sentence from the middle of `routes.approach`, for routes approved by id.
//
// The tail applier could only truncate, which made inventing prose impossible. An interior
// removal cannot have that property in full — the two halves must meet — but it keeps the half
// that matters:
//
//     approach := approach[:cutStart] + approach[cutEnd:]
//
// NO WORD IS EVER ADDED OR ALTERED. It asserts the result is the concatenation of two
// substrings of the original, so a fix needing new prose still cannot be expressed. What it
// cannot inherit is the tail's freedom from seams, so the seam is gated instead:
//
//   - the following sentence must not open with a BACK-REFERENCE ("Beyond that…", "From
//     there…", "Above it…") whose antecedent may be the sentence being removed;
//   - the sentence before must still end on a full stop, with balanced brackets and quotes;
//   - exactly ONE interior duplicate on the route, because indices shift after a removal and a
//     half-done route is worse than an untouched one.
//
// Everything is re-derived from the LIVE row at apply time; the worklist is a hint, never
// authority. The human decision is the id list and nothing else.
//
//   node scripts/oneoff/apply-approach-interior-trim.mjs interior.json <id>... [--apply]
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const [file, ...ids] = argv.filter(a => a !== "--apply");
if (!file || !ids.length) { console.error("usage: apply-approach-interior-trim.mjs interior.json <id>... [--apply]"); process.exit(1); }

const key = requireServiceKey();
const work = JSON.parse(fs.readFileSync(file, "utf8"));

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
const DANGLING = /\b(and|or|but|then|with|via|to|from|through|toward|towards|into|onto|the|a|an|of|at|on|in|before|after|until|while|where|which|that)\s*[.;]?$/i;
function readsFinished(t) {
  const s = String(t || "").trim();
  if (!s) return { ok: false, why: "would empty the column" };
  const bal = ch => (s.split(ch[0]).length - s.split(ch[1]).length);
  if (bal("()") !== 0) return { ok: false, why: "unbalanced parentheses" };
  if (bal("[]") !== 0) return { ok: false, why: "unbalanced brackets" };
  if ((s.split('"').length - 1) % 2) return { ok: false, why: "unbalanced quotes" };
  if (!/[.;!?]$/.test(s)) return { ok: false, why: "does not end on a full stop" };
  if (DANGLING.test(s.replace(/[.;!?]+$/, ""))) return { ok: false, why: "ends on a dangling connective" };
  return { ok: true };
}

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

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,approach,climbing_route&id=in.(${ids.join(",")})`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const live = JSON.parse(await res.text());
if (live.length !== ids.length) throw new Error(`asked for ${ids.length}, got ${live.length} — refusing a partial batch`);

const plans = [];
let refused = 0;
for (const id of ids) {
  const r = live.find(x => x.id === id);
  const bail = why => { console.log(`REFUSED  ${id}: ${why}`); refused++; };
  if (!work.some(w => w.id === id)) { bail("not in the worklist"); continue; }

  const spans = sentenceSpans(r.approach);
  const cr = sentenceSpans(crProse(r)).map(x => x.s);
  if (spans.length < 3 || !cr.length) { bail("too few sentences, or climbing_route is empty"); continue; }

  const best = spans.map(x => Math.max(0, ...cr.map(b => jaccard(x.s, b))));
  const hits = [];
  for (let i = 1; i < spans.length - 1; i++) if (best[i] >= SAFE_SIM) hits.push(i);
  if (hits.length !== 1) { bail(`${hits.length} interior duplicates on the live row, expected exactly 1`); continue; }

  const i = hits[0];
  if (BACKREF.test(spans[i + 1].s)) { bail("the following sentence opens with a back-reference"); continue; }
  const orphans = orphanedAntecedent(spans[i].s, spans[i + 1].s, String(r.approach).slice(0, spans[i].start));
  if (orphans.length) { bail(`removing it would orphan "${orphans.join('", "')}" in the next sentence`); continue; }

  const before = String(r.approach);
  const next = (before.slice(0, spans[i].start) + before.slice(spans[i + 1].start)).replace(/\s+$/, "");
  const fin = readsFinished(before.slice(0, spans[i].start).trim());
  if (!fin.ok) { bail(`the text before the cut ${fin.why}`); continue; }
  if (!readsFinished(next).ok) { bail("the joined result does not read as finished prose"); continue; }

  // DELETION ONLY: the result must be exactly two substrings of the original, joined.
  if (!before.startsWith(next.slice(0, spans[i].start))) { bail("result is not a prefix-plus-suffix of the original"); continue; }
  if (next.length >= before.length) { bail("nothing would be removed"); continue; }

  plans.push({ id, name: r.name, before, next, cut: spans[i].s, seam: spans[i + 1].s });
}

for (const p of plans) {
  console.log(`\n${p.id} — ${p.name}`);
  console.log(`  ${p.before.length} -> ${p.next.length} chars`);
  console.log(`  REMOVED: ${p.cut.slice(0, 160)}`);
  console.log(`  seam now reads: …${p.next.slice(Math.max(0, p.next.indexOf(p.seam) - 90), p.next.indexOf(p.seam) + 90)}`);
}

if (!APPLY) { console.log(`\ndry run — ${plans.length} planned, ${refused} refused. Re-run with --apply.`); process.exit(refused ? 1 : 0); }

for (const p of plans) await patchRow("routes", p.id, { approach: p.next });

const back = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach&id=in.(${plans.map(p => p.id).join(",")})`, { headers: headers(key) });
if (!back.ok) throw new Error(`verify read -> ${back.status}`);
const after = JSON.parse(await back.text());
let verified = 0;
for (const p of plans) {
  const got = (after.find(x => x.id === p.id) || {}).approach;
  if (got === p.next) verified++; else console.log(`MISMATCH ${p.id}`);
}
console.log(`\napplied ${plans.length}, verified ${verified} of ${plans.length}, refused ${refused}`);
process.exit(verified === plans.length && !refused ? 0 : 1);
