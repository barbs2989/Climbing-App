// Fill `belay` (the belay station: where the belayer stands and how to find it) on existing
// pitch_detail rows from a researched batch (owner's note, 2026-10-25: "more detail about where to
// find the place to belay, ie belay stations. Do online research").
//
//   node scripts/oneoff/apply-belay-stations.mjs audits/belay-stations/batch-01.json           # dry run
//   node scripts/oneoff/apply-belay-stations.mjs audits/belay-stations/batch-01.json --apply   # write
//
// Batch shape: { "<route id>": { "review": { "sources": ["https://…"] }, "belay": { "<pitch label>": "<sentence>" } } }
//
// What it refuses, per sentence (the rules in docs/codebase/enrichment-prose.md):
//   - a label that is not exactly one entry of the stored table (labels are the comment keys),
//   - an entry that already has a belay (this ADDS; a climber's or an earlier batch's text wins),
//   - a source name ("per …", "Mountain Project", "guidebook"…), ALL-CAPS shouting, > 220 chars,
//   - any 8-word run shared with a page in review.sources, and a route whose sources all failed to load.
// Writes are throttled (>= 1000 ms apart, a minute's back-off on a timeout or 5xx, stop on a second),
// every route's stored table is kept in a rollback file first, and each write is re-read.
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { htmlToText, words, sourceIndex, copiedRuns, proseStrings } from "../lib/source-overlap.mjs";

// The copy check fetches each listed source with a PLAIN request (no browser user agent): a page
// that refuses an automated read cannot be checked, so the route is refused rather than the block
// worked around. (lib/source-overlap.mjs's checkEntry sends a browser agent; this does not.)
async function checkEntry(spec) {
  const urls = Array.isArray(spec?.review?.sources) ? spec.review.sources.filter(u => /^https?:\/\//.test(u)) : [];
  const texts = [], unread = [];
  for (const u of urls) {
    let t = null;
    try { const res = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(20000) }); if (res.ok) { const x = htmlToText(await res.text()); if (words(x).length > 150) t = x; } } catch { /* unreadable */ }
    if (t) texts.push(t); else unread.push(u);
  }
  const grams = sourceIndex(texts), hits = [];
  for (const s of proseStrings({ belay: spec.belay })) { const runs = copiedRuns(s.text, grams); if (runs.length) hits.push({ path: s.path, runs }); }
  return { listed: urls.length, read: texts.length, unread, hits };
}
import { shoutedStrings } from "../lib/shouted-prose.mjs";

const SOURCE_RE = /\b(mountain ?project|summit ?post|cascade ?climbers|nwhikers|peakbagger|the ?crag|openbeta|27 ?crags|beckey(?! route|-tate)|nelson|guide ?book|topo says|trip report|according to|reported by|the mountaineers|source)\b/i;
const PER_SOURCE_RE = /\b[Pp]er (?:the )?[A-Z]/;
const MAX_LEN = 220, PACE_MS = 1000;

const file = process.argv[2];
const APPLY = process.argv.includes("--apply");
// --fix corrects THIS script's own earlier writes after a re-verification: a string replaces the
// stored belay (same checks as a new one), and null removes it. Without --fix nothing is overwritten.
const FIX = process.argv.includes("--fix");
if (!file) { console.error("usage: apply-belay-stations.mjs <batch.json> [--apply]"); process.exit(2); }
const batch = JSON.parse(fs.readFileSync(file, "utf8"));
const key = requireServiceKey();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const labelOf = (p, i) => String(p && (p.pitch ?? p.n) != null ? (p.pitch ?? p.n) : i + 1).trim();

async function readRow(id) {
  const url = `${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,name,pitch_detail`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: headers(key), signal: AbortSignal.timeout(30000) }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
    if (res.ok) { const rows = JSON.parse(await res.text()); return rows[0] || null; }
    if (attempt === 0 && (res.status === 0 || res.status >= 500)) { console.error(`  read ${id} -> ${res.status}; backing off 60 s`); await sleep(60000); continue; }
    throw new Error(`read ${id} -> ${res.status} ${(await res.text()).slice(0, 160)}`);
  }
  throw new Error(`read ${id} failed twice — the database is struggling; stopping`);
}

const plan = [], refused = [];
for (const [id, spec] of Object.entries(batch)) {
  const belay = (spec && spec.belay) || {};
  const labels = Object.keys(belay).filter(l => String(belay[l] || "").trim() || (FIX && belay[l] === null));
  if (!labels.length) continue;
  const row = await readRow(id);
  if (!row) { refused.push(`${id}: no such route`); continue; }
  const pd = Array.isArray(row.pitch_detail) ? row.pitch_detail : [];
  const texts = Object.fromEntries(Object.entries(belay).filter(([, s]) => typeof s === "string"));
  const ov = Object.keys(texts).length ? await checkEntry({ review: spec.review, belay: texts }) : { read: 1, listed: 0, unread: [], hits: [] };
  if (!ov.read || ov.unread.length) { refused.push(`${id}: ${ov.unread.length || ov.listed} of its ${ov.listed} sources could not be read, so copying cannot be ruled out (${ov.unread.join(" ")})`); continue; }
  const copied = new Set(ov.hits.map(h => h.path.replace(/^belay\./, "")));
  const next = pd.map(p => ({ ...p }));
  let n = 0;
  for (const l of labels) {
    const at = pd.map((p, i) => labelOf(p, i) === l ? i : -1).filter(i => i >= 0);
    if (belay[l] === null) {
      if (at.length !== 1 || !pd[at[0]].belay) { refused.push(`${id}: P${l} has no belay to remove`); continue; }
      delete next[at[0]].belay; n++; continue;
    }
    const s = String(belay[l]).trim();
    const why = at.length !== 1 ? `label ${JSON.stringify(l)} matches ${at.length} stored entries`
      : (!FIX && pd[at[0]].belay && String(pd[at[0]].belay).trim()) ? `P${l} already has a belay`
      : s.length > MAX_LEN ? `P${l} is ${s.length} chars`
      : (SOURCE_RE.test(s) || PER_SOURCE_RE.test(s)) ? `P${l} names a source: ${JSON.stringify(s)}`
      : shoutedStrings(s).length ? `P${l} shouts`
      : copied.has(l) ? `P${l} repeats 8+ words of a source`
      : null;
    if (why) { refused.push(`${id}: ${why}`); continue; }
    next[at[0]].belay = s; n++;
  }
  if (n) plan.push({ id, name: row.name, before: pd, after: next, n });
}

console.log(`${plan.length} route(s), ${plan.reduce((a, p) => a + p.n, 0)} pitch(es) to fill; ${refused.length} refused`);
for (const r of refused) console.log("  REFUSED " + r);
for (const p of plan) console.log(`  ${p.id}: ${p.n} pitch(es)`);
if (!APPLY || !plan.length) { if (!APPLY) console.log("dry run — add --apply to write"); process.exit(0); }

const rollback = path.join(path.dirname(file), `rollback-${path.basename(file, ".json")}-${Date.now()}.json`);
fs.writeFileSync(rollback, JSON.stringify(Object.fromEntries(plan.map(p => [p.id, p.before])), null, 1));
console.log(`rollback: ${rollback}`);
let written = 0;
for (const p of plan) {
  let ok = false;
  for (let attempt = 0; attempt < 2 && !ok; attempt++) {
    try { await patchRow("routes", p.id, { pitch_detail: p.after }); ok = true; }
    catch (e) {
      if (attempt === 0 && /-> (0|5\d\d)|timeout|fetch failed/i.test(String(e.message))) { console.error(`  ${p.id}: ${e.message.slice(0, 120)}; backing off 60 s`); await sleep(60000); }
      else { console.error(`STOPPING at ${p.id}: ${e.message.slice(0, 200)}`); process.exit(1); }
    }
  }
  if (!ok) { console.error(`STOPPING at ${p.id}: two failures`); process.exit(1); }
  const back = await readRow(p.id);
  const got = (back && back.pitch_detail || []).filter(x => x && x.belay).length;
  const want = p.after.filter(x => x && x.belay).length;
  if (got !== want) { console.error(`STOPPING: ${p.id} re-read shows ${got} belays, expected ${want}`); process.exit(1); }
  written++; console.log(`  wrote ${p.id} (${p.n}) — re-read ok`);
  await sleep(PACE_MS);
}
console.log(`done: ${written}/${plan.length} route(s) written and re-read`);
