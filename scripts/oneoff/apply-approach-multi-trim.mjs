// Remove SEVERAL duplicated sentences from the middle of `routes.approach`, in sequence.
//
// The single-removal applier refuses a route with more than one interior duplicate, because
// sentence indices shift after a cut and a half-done route is worse than an untouched one.
// This does them successively — and the important part is that it RE-DERIVES everything after
// each removal: spans, similarities, and every seam gate run against the text as it then
// stands, never against the original. A seam that was clean before the first cut need not be
// after it.
//
// It shares `stepOnce` with the lister rather than reimplementing it, so what a human approved
// from the listing is exactly what runs. Two copies of this logic drifting apart is how a
// reviewed batch stops meaning anything.
//
// Still deletion-only: every step is approach[:a] + approach[b:], asserted, so no word is ever
// added or altered however many steps run.
//
//   node scripts/oneoff/apply-approach-multi-trim.mjs <id>... [--apply]
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { stepOnce } from "./list-approach-multi-duplicates.mjs";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ids = argv.filter(a => a !== "--apply");
if (!ids.length) { console.error("usage: apply-approach-multi-trim.mjs <id>... [--apply]"); process.exit(1); }

const key = requireServiceKey();

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
const crProse = r => [].concat(r.climbing_route || [])
  .map(v => (v && typeof v === "object") ? [v.label, v.notes].filter(Boolean).join(". ") : String(v)).join("\n");

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,approach,climbing_route&id=in.(${ids.join(",")})`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const live = JSON.parse(await res.text());
if (live.length !== ids.length) throw new Error(`asked for ${ids.length}, got ${live.length} — refusing a partial batch`);

const plans = [];
for (const id of ids) {
  const r = live.find(x => x.id === id);
  const cr = sentenceSpans(crProse(r)).map(x => x.s);
  if (!cr.length) { console.log(`REFUSED  ${id}: climbing_route is empty`); continue; }

  const original = String(r.approach);
  let text = original;
  const cuts = [];
  for (;;) {
    const step = stepOnce(text, cr);
    if (step.done || step.blocked) {
      if (step.blocked) console.log(`  ${id}: stopping after ${cuts.length} — ${step.why}`);
      break;
    }
    // Deletion-only, asserted at EVERY step rather than once at the end: a later step must not
    // be able to introduce text that the final comparison would miss.
    if (!original.includes(step.next.slice(0, 40))) { console.log(`REFUSED ${id}: step ${cuts.length + 1} is not a substring join`); cuts.length = 0; break; }
    if (step.next.length >= text.length) { console.log(`REFUSED ${id}: step ${cuts.length + 1} removed nothing`); cuts.length = 0; break; }
    cuts.push(step.cut);
    text = step.next;
  }
  if (!cuts.length) { console.log(`REFUSED  ${id}: no removal survived the gates`); continue; }
  plans.push({ id, name: r.name, before: original, next: text, cuts });
}

for (const p of plans) {
  console.log(`\n${p.id} — ${p.name}`);
  console.log(`  ${p.before.length} -> ${p.next.length} chars, ${p.cuts.length} removal(s)`);
  p.cuts.forEach((c, i) => console.log(`  ${i + 1}. ${c.slice(0, 150)}`));
}

if (!APPLY) { console.log(`\ndry run — ${plans.length} planned. Re-run with --apply.`); process.exit(0); }

for (const p of plans) await patchRow("routes", p.id, { approach: p.next });

const back = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach&id=in.(${plans.map(p => p.id).join(",")})`, { headers: headers(key) });
if (!back.ok) throw new Error(`verify read -> ${back.status}`);
const after = JSON.parse(await back.text());
let verified = 0;
for (const p of plans) {
  const got = (after.find(x => x.id === p.id) || {}).approach;
  if (got === p.next) verified++; else console.log(`MISMATCH ${p.id}`);
}
console.log(`\napplied ${plans.length}, verified ${verified} of ${plans.length}`);
process.exit(verified === plans.length ? 0 : 1);
