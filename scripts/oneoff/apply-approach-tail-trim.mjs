// Trim a duplicated TAIL off `routes.approach`, for routes a human has approved by id.
//
// STRUCTURALLY INCAPABLE OF INVENTING PROSE. The only write it can perform is
//     approach := approach.slice(0, cut)
// and it asserts `oldApproach.startsWith(newApproach)` before sending. So the worst outcome is
// a sentence removed that should have stayed — never a word altered, never a fact introduced,
// and a fix that would need NEW text cannot be expressed at all. That is the same property the
// trailhead applier had, where a fix declared a WINNER and never a coordinate, and it is what
// made unreviewed batch work safe there.
//
// The human decision is the ID LIST and nothing else. Everything else is re-derived from the
// live row at apply time and re-checked, so a stale offset in the worklist cannot write.
//
//   node scripts/oneoff/apply-approach-tail-trim.mjs tails.json <id> [<id> ...] [--apply]
// Without --apply it is a dry run.
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const [file, ...rest] = argv.filter(a => a !== "--apply");
const ids = rest;
if (!file || !ids.length) { console.error("usage: apply-approach-tail-trim.mjs tails.json <id>... [--apply]"); process.exit(1); }

// requireServiceKey throws rather than degrading to anon — PostgREST answers a PATCH sent with
// the anon key as 200 with an empty array, so an RLS rejection would read as success.
const key = requireServiceKey();
const tails = JSON.parse(fs.readFileSync(file, "utf8"));

// --- the same helpers the lister used, so "safe to express" means the same thing here -------
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
const DANGLING = /\b(and|or|but|then|with|via|to|from|through|toward|towards|into|onto|the|a|an|of|at|on|in|before|after|until|while|where|which|that)\s*[.;]?$/i;
function readsFinished(prefix) {
  const t = String(prefix || "").trim();
  if (!t) return { ok: false, why: "would empty the column" };
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
const SAFE_SIM = 0.9;

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,approach,climbing_route&id=in.(${ids.join(",")})`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status} ${(await res.text()).slice(0, 200)}`);
const live = JSON.parse(await res.text());
if (live.length !== ids.length) throw new Error(`asked for ${ids.length} routes, got ${live.length} — refusing a partial batch`);

let planned = 0, applied = 0, refused = 0;
const plans = [];

for (const id of ids) {
  const r = live.find(x => x.id === id);
  const t = tails.find(x => x.id === id);
  const bail = why => { console.log(`REFUSED  ${id}: ${why}`); refused++; };

  if (!t) { bail("not in the worklist"); continue; }

  // Re-derive the tail from the LIVE row. The worklist's offsets are a hint, never authority —
  // the row may have changed since it was written, and a stale offset would cut mid-sentence.
  const spans = sentenceSpans(r.approach);
  const cr = sentenceSpans(crProse(r)).map(x => x.s);
  if (!cr.length) { bail("climbing_route is empty — nothing would survive the trim"); continue; }

  const best = spans.map(x => Math.max(0, ...cr.map(b => jaccard(x.s, b))));
  let i = spans.length - 1;
  while (i >= 0 && best[i] >= SAFE_SIM) i--;
  const tailStart = i + 1, tailLen = spans.length - tailStart;

  if (tailLen !== t.trimming) { bail(`worklist says trim ${t.trimming}, live row yields ${tailLen} — the row moved`); continue; }
  if (tailStart <= 0) { bail("the trim would empty the column"); continue; }

  const next = String(r.approach).slice(0, spans[tailStart].start).trimEnd();
  const fin = readsFinished(next);
  if (!fin.ok) { bail(fin.why); continue; }

  // THE invariant. Truncation only: no insertion, no substitution, nothing invented.
  if (!String(r.approach).startsWith(next)) { bail("result is not a prefix of the original — refusing"); continue; }
  if (next.length >= String(r.approach).length) { bail("nothing would be removed"); continue; }

  // Every removed sentence must still exist in climbing_route, or the trim loses content.
  // A flag rather than `continue`, which would only leave the INNER loop and let a failed row
  // be planned anyway — the kind of control-flow slip that makes a guard silently permissive.
  let lost = null;
  for (let k = tailStart; k < spans.length; k++) {
    if (best[k] < SAFE_SIM) { lost = `sentence ${k} is not near-verbatim in climbing_route (${best[k].toFixed(2)})`; break; }
  }
  if (lost) { bail(lost); continue; }

  plans.push({ id, name: r.name, before: r.approach, after: next, removed: spans.slice(tailStart).map(x => x.s) });
  planned++;
}

for (const p of plans) {
  console.log(`\n${p.id} — ${p.name}`);
  console.log(`  ${p.before.length} chars -> ${p.after.length} (removing ${p.removed.length} sentence(s))`);
  console.log(`  now ends: …${p.after.slice(-110)}`);
  for (const s of p.removed) console.log(`  REMOVED:  ${s.slice(0, 150)}`);
}

if (!APPLY) {
  console.log(`\ndry run — ${planned} planned, ${refused} refused. Re-run with --apply to write.`);
  process.exit(refused ? 1 : 0);
}

for (const p of plans) {
  await patchRow("routes", p.id, { approach: p.after });
  applied++;
}

// A 200 is not evidence the data changed. Re-read and reconcile.
const back = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,approach&id=in.(${plans.map(p => p.id).join(",")})`,
  { headers: headers(key) });
if (!back.ok) throw new Error(`verify read -> ${back.status}`);
const after = JSON.parse(await back.text());
let verified = 0;
for (const p of plans) {
  const got = (after.find(x => x.id === p.id) || {}).approach;
  if (got === p.after) verified++;
  else console.log(`MISMATCH ${p.id}: the row on the server is not what was written`);
}
console.log(`\napplied ${applied}, verified ${verified} of ${plans.length}, refused ${refused}`);
process.exit(verified === plans.length && !refused ? 0 : 1);
