// Write WHY GO THIS WAY (`whyThisWay`) onto a route's alternative ways in, and the MOST USED mark
// (`primary:true`) where a route has several ways in and none is marked. Owner note, 2026-10-28:
// "Declare which approach is most common per route and explain why others would use the other
// approach."
//
//   node scripts/apply-approach-why.mjs batch.json [--dry]
//
// A batch is { "<route id>": { primary?: "<way-in name>", why: { "<way-in name>": "<sentence>" },
// review: { sources: [url...], notes } } }. Ways in are matched by their EXACT stored name, never by
// position: an index is what a concurrent edit reorders.
//
// What it refuses, per route (the route is skipped, the rest of the batch goes on):
//   - a name that matches no way in, or a `why` on the way in that is (or becomes) the most used one
//   - `primary` on a route that already marks a different way in: moving the mark is a research
//     decision the earlier pass already took, so it is not overwritten by a batch about reasons
//   - a sentence over 240 characters (it is one line on a card, the detail lives in `notes`), one
//     that names a source (no sources anywhere in the app), one in ALL CAPS, or one that repeats 8+
//     words of a page in review.sources (our own words only — scripts/lib/source-overlap.mjs)
// Every write goes through patchRow (exactly one row, service key), paced by supabase-env.mjs, and is
// re-read and compared; the stored array before the write is kept in a rollback file.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "./lib/supabase-env.mjs";
import { checkEntry } from "./lib/source-overlap.mjs";
import { shoutedStrings } from "./lib/shouted-prose.mjs";

const DRY = process.argv.includes("--dry");
const file = process.argv.slice(2).find(a => !a.startsWith("--"));
if (!file) { console.error("usage: node scripts/apply-approach-why.mjs batch.json [--dry]"); process.exit(2); }
const BATCH = JSON.parse(readFileSync(file, "utf8"));
const key = requireServiceKey();
const SOURCE_RE = /\b(mountain ?project|summit ?post|cascade ?climbers|nwhikers|peakbagger|beckey(?! route|-tate)|nelson|guide ?book|trip report|according to|reported by|the mountaineers|wta|washington trails)\b/i;
const PER_SOURCE_RE = /\b[Pp]er (?:the )?[A-Z]/;
const MAX_LEN = 240;

const read = async id => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,approach_variants&id=eq.${encodeURIComponent(id)}`, { headers: headers(key), signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`read ${id} -> ${res.status} ${(await res.text()).slice(0, 200)} — stopping`);
  return (await res.json())[0] || null;
};

const rollback = {}, applied = {};
let wrote = 0, skipped = 0;
for (const [id, spec] of Object.entries(BATCH)) {
  const errs = [];
  const before = await read(id);
  if (!before) { console.error(`skip ${id} — no such route`); skipped++; continue; }
  const vars = Array.isArray(before.approach_variants) ? before.approach_variants : [];
  if (vars.filter(Boolean).length < 2) { console.error(`skip ${id} — ${vars.length} way(s) in; nothing to rank`); skipped++; continue; }
  const idxOf = n => vars.findIndex(v => v && String(v.name || "").trim() === String(n).trim());
  const marked = vars.findIndex(v => v && v.primary === true);
  let prim = marked;
  if (spec.primary != null) {
    const p = idxOf(spec.primary);
    if (p < 0) errs.push(`primary ${JSON.stringify(spec.primary)} matches no way in (${vars.map(v => v && v.name).join(" | ")})`);
    else if (marked >= 0 && marked !== p) errs.push(`already marks ${JSON.stringify(vars[marked].name)} as most used; this batch does not move the mark`);
    else prim = p;
  }
  if (prim < 0) errs.push("no way in is marked most used and the batch names none — a reason needs a most used way in to be an alternative TO");
  const why = spec.why || {};
  for (const [n, s] of Object.entries(why)) {
    const i = idxOf(n);
    const t = String(s || "").trim();
    if (i < 0) { errs.push(`why: ${JSON.stringify(n)} matches no way in`); continue; }
    if (i === prim) errs.push(`why on ${JSON.stringify(n)}, which is the most used way in`);
    if (!t) errs.push(`why on ${JSON.stringify(n)} is empty`);
    if (t.length > MAX_LEN) errs.push(`why on ${JSON.stringify(n)} is ${t.length} chars (max ${MAX_LEN})`);
    const m = t.match(SOURCE_RE) || t.match(PER_SOURCE_RE);
    if (m) errs.push(`why on ${JSON.stringify(n)} names a source: ${JSON.stringify(m[0])}`);
  }
  for (const s of shoutedStrings(why)) errs.push(`why ${s.path} shouts: ${JSON.stringify(s.fragments || s)}`);
  if (!errs.length) {
    const ov = await checkEntry({ review: spec.review, why });
    for (const u of ov.unread) console.warn(`warn ${id} — could not read source ${u}; nothing in it was checked`);
    for (const h of ov.hits) errs.push(`${h.path} repeats its source word for word: "${h.runs[0]}"`);
  }
  if (errs.length) { for (const e of errs) console.error(`REFUSING ${id} — ${e}`); skipped++; process.exitCode = 1; continue; }

  const next = vars.map((v, i) => {
    if (!v) return v;
    const o = { ...v };
    if (i === prim && spec.primary != null) o.primary = true;
    const n = Object.keys(why).find(k => String(k).trim() === String(v.name || "").trim());
    if (n) o.whyThisWay = String(why[n]).trim();
    return o;
  });
  if (JSON.stringify(next) === JSON.stringify(vars)) { console.log(`same ${id} — already says this`); continue; }
  console.log(`${id}  (${before.name})${spec.primary != null && marked < 0 ? `  most used := ${vars[prim].name}` : ""}`);
  for (const [n, s] of Object.entries(why)) console.log(`   ${n}: ${String(s).trim()}`);
  if (DRY) continue;
  rollback[id] = vars;
  await patchRow("routes", id, { approach_variants: next });
  const after = await read(id);
  if (!after || JSON.stringify(after.approach_variants) !== JSON.stringify(next)) { console.error(`MISMATCH ${id} — the re-read does not hold what was written; stopping`); process.exitCode = 1; break; }
  applied[id] = { primary: next[prim].name, why };
  wrote++;
}
if (!DRY && wrote) {
  mkdirSync("audits/approach-why", { recursive: true });
  const stamp = Date.now();
  writeFileSync(`audits/approach-why/rollback-${stamp}.json`, JSON.stringify(rollback, null, 1));
  writeFileSync(`audits/approach-why/applied-${stamp}.json`, JSON.stringify(applied, null, 1));
}
console.log(`\n${DRY ? "dry run: " : ""}${wrote} written, ${skipped} skipped`);
