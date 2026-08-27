// Cut parentheticals that contain NOTHING but publisher names.
//
// THE ONLY MECHANICAL SUBSET OF THE CITATION BACKLOG, and the measurement is the point: of 588
// findings `audit:prose-citations` reports, **23 are a parenthetical whose entire content is
// publisher names**, 50 are "PUBLISHER describes/notes/..." (rewritable, but the verb changes and
// the subject moves, so not mechanical), and **515 need individual reading**. This backlog is
// ~515 editorial rewrites, NOT a scriptable sweep. Do not plan one.
//
// What makes this subset safe is that the parenthetical carries no content: "(SummitPost)" after
// a complete sentence is pure attribution, so removing it loses nothing. That is checked rather
// than assumed -- strip the publisher names and what remains must be separators only.
//
// TWO GUARDS, because the obvious version damages copy:
//   - the REMAINDER must not still name a source. `wa_iron_peak_teanaway_scramble` reads
//     "source (WTA) does not give a formal class rating"; cutting the parenthetical leaves
//     "source does not give...", which is still an attribution wearing different clothes. That
//     row is REFUSED here and belongs in a batch someone rewrites.
//   - punctuation is repaired, not left: cutting " (WTA)" before a full stop must not leave a
//     double space or a stranded separator.
//
// Declared per-edit, dry-run by default, all-or-nothing, and every write re-read.
import { requireServiceKey, SUPABASE_URL, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const COLS = ["crowds","pro_tips","itinerary","best_season","pitch_detail","approach_variants",
  "watch_out","partner_requirements","bivy","hazards","climate","beta","seasonal_guidance",
  "emergency","overview"];
const PUB = /(?:SummitPost|Mountain ?Project|AllTrails|WTA|Mountaineers|Peakbagger|Wikipedia|CalTopo|AAJ)/i;
// Attribution language that must not survive in the remainder.
const LEFTOVER = /\bsources?\b|\bper\s+(?:the\s+)?[A-Z]|\baccording to\b|\breported by\b|\bcited\b/;

const cuttable = (inner) =>
  PUB.test(inner) &&
  /^[\s,;/&.\-–—]*$/.test(inner.replace(new RegExp(PUB.source, "gi"), "").replace(/\band\b/gi, ""));

const tidy = (s) => s.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();

function editLeaf(s) {
  let out = s, cut = [];
  for (const m of [...s.matchAll(/\s*\(([^()]{1,90})\)/g)]) if (cuttable(m[1])) { out = out.replace(m[0], ""); cut.push(m[0].trim()); }
  return cut.length ? { next: tidy(out), cut } : null;
}
const walk = (v, path, out) => {
  if (typeof v === "string") { out.push([path, v]); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, out)); return; }
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, out);
};
/* `path` is column-rooted ("pitch_detail[1].notes"), so the first segment names the column and
   the rest addresses inside it. Pass the COLUMN VALUE and drop that first segment — an earlier
   version passed a { [col]: value } wrapper and then also sliced, so it indexed past the wrapper
   and threw on the first nested leaf. */
const setAt = (colValue, path, value) => {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").slice(1);
  if (!parts.length) return value;   // a SCALAR column: the path IS the leaf, so hand it back
  let o = colValue;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
  return colValue;
};

const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}` };
let from = 0; const plans = new Map(); let refused = 0;
while (true) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,${COLS.join(",")}&id=like.wa_*&limit=1000&offset=${from}`, { headers: H });
  if (!r.ok) { console.error(`read failed: HTTP ${r.status}`); process.exit(1); }
  const rows = await r.json(); if (!rows.length) break;
  for (const row of rows) for (const c of COLS) {
    if (row[c] == null) continue;
    const leaves = []; walk(row[c], c, leaves);
    for (const [path, s] of leaves) {
      const e = editLeaf(s); if (!e) continue;
      if (LEFTOVER.test(e.next)) {
        console.error(`  REFUSE ${row.id} ${path}: the remainder still names a source — needs a rewrite, not a cut`);
        console.error(`         ${e.next.slice(0, 120)}`);
        refused++; continue;
      }
      if (!plans.has(row.id)) plans.set(row.id, { cols: {}, edits: [] });
      const p = plans.get(row.id);
      if (!p.cols[c]) p.cols[c] = JSON.parse(JSON.stringify(row[c]));
      p.cols[c] = setAt(p.cols[c], path, e.next);
      p.edits.push({ path, cut: e.cut, before: s, after: e.next });
    }
  }
  from += rows.length; if (rows.length < 1000) break;
}

let n = 0;
for (const [id, p] of plans) for (const e of p.edits) {
  n++;
  console.log(`\n  ${id}  ${e.path}   cut ${e.cut.map(x => JSON.stringify(x)).join(", ")}`);
  console.log(`    after: …${e.after.slice(Math.max(0, e.after.length - 110))}`);
}
console.log(`\nscanned ${from} WA routes — ${n} cut(s) across ${plans.size} route(s); ${refused} refused.`);
if (!n) { console.log("nothing to do"); process.exit(0); }
if (!APPLY) { console.log("dry run — pass --apply to write"); process.exit(0); }

for (const [id, p] of plans) await patchRow("routes", id, p.cols);
let bad = 0;
for (const [id, p] of plans) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=${Object.keys(p.cols).join(",")}`, { headers: H });
  const [row] = await r.json();
  for (const c of Object.keys(p.cols)) {
    const leaves = []; walk(row[c], c, leaves);
    for (const [, s] of leaves) for (const m of s.matchAll(/\(([^()]{1,90})\)/g))
      if (cuttable(m[1])) { console.error(`  VERIFY FAILED ${id} ${c}: ${m[0]} survives`); bad++; }
  }
}
if (bad) process.exit(1);
console.log(`\nverified: ${plans.size} route(s) re-read, no publisher-only parenthetical survives`);
