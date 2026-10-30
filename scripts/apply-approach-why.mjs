// Write WHY GO THIS WAY (`whyThisWay`) onto a route's alternative ways in, and the MOST USED mark
// (`primary:true`) where a route has several ways in and none is marked. Owner note, 2026-10-28:
// "Declare which approach is most common per route and explain why others would use the other
// approach."
//
//   node scripts/apply-approach-why.mjs batch.json [more.json ...] [--dry]
// Several files run IN ORDER, entry by entry, so a later file (the settle pass) acts on what an
// earlier one (a research batch) wrote: each entry re-reads the live row first.
//
// A batch is { "<route id>": { primary?: "<way-in name>", why: { "<way-in name>": "<sentence>" },
// review: { sources: [url...], notes } } }. Ways in are matched by their EXACT stored name, never by
// position: an index is what a concurrent edit reorders.
//
// What it refuses, per route (the route is skipped, the rest of the batch goes on):
//   - a name that matches no way in, or a `why` on the way in that is (or becomes) the most used one
//   - `primary` on a route that already marks a different way in, unless the entry also sets
//     `movePrimary: true` AND lists at least two sources: moving the mark overturns an earlier
//     research decision, so it takes its own evidence (the settle pass, audits/approach-why/settle/)
//   - `clearPrimary: true` (remove the mark, leave the route unmarked) without two sources: used
//     where the only marked way in is one the app must not recommend, e.g. it enters the US on foot
//     away from a port of entry and no lawful way in is stored
//   - a sentence over 240 characters (it is one line on a card, the detail lives in `notes`), one
//     that names a source (no sources anywhere in the app), one in ALL CAPS, or one that repeats 8+
//     words of a page in review.sources (our own words only — scripts/lib/source-overlap.mjs)
// Every write goes through patchRow (exactly one row, service key), paced by supabase-env.mjs, and is
// re-read and compared; the stored array before the write is kept in a rollback file.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "./lib/supabase-env.mjs";
import { checkEntry } from "./lib/source-overlap.mjs";
import { shoutedStrings } from "./lib/shouted-prose.mjs";
// A key-order-free JSON form: jsonb returns object keys in its own order, not the order they were written in.
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(n => [n, x[n]])) : x));

const DRY = process.argv.includes("--dry");
const files = process.argv.slice(2).filter(a => !a.startsWith("--"));
if (!files.length) { console.error("usage: node scripts/apply-approach-why.mjs batch.json [more.json ...] [--dry]"); process.exit(2); }
const ENTRIES = files.flatMap(f => Object.entries(JSON.parse(readFileSync(f, "utf8"))));
const key = requireServiceKey();
const SOURCE_RE = /\b(mountain ?project|summit ?post|cascade ?climbers|nwhikers|peakbagger|beckey(?! route|-tate)|nelson|guide ?book|trip report|according to|reported by|the mountaineers|wta|washington trails)\b/i;
const PER_SOURCE_RE = /\b[Pp]er (?:the )?[A-Z]/;
const MAX_LEN = 240;

// One back-off, then stop: the owner's throttle rule forbids retrying fast into a struggling database.
const read = async (id, retried) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,approach_variants&id=eq.${encodeURIComponent(id)}`, { headers: headers(key), signal: AbortSignal.timeout(20000) }).catch(e => ({ ok: false, status: e.name, text: async () => e.message }));
  if (!res.ok && !retried && (res.status === "TimeoutError" || res.status >= 500)) { console.error(`read ${id} -> ${res.status}; backing off 60 s before one retry`); await new Promise(r => setTimeout(r, 60000)); return read(id, true); }
  if (!res.ok) throw new Error(`read ${id} -> ${res.status} ${(await res.text()).slice(0, 200)} — stopping`);
  return (await res.json())[0] || null;
};

const rollback = {}, applied = {};
let wrote = 0, skipped = 0;
for (const [id, spec] of ENTRIES) {
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
    else if (marked >= 0 && marked !== p && !(spec.movePrimary === true && (spec.review?.sources || []).length >= 2)) errs.push(`already marks ${JSON.stringify(vars[marked].name)} as most used; moving it needs movePrimary:true and two sources`);
    else prim = p;
  }
  const clear = spec.clearPrimary === true;
  if (clear) { if ((spec.review?.sources || []).length < 2) errs.push("clearPrimary needs two sources"); prim = -1; }
  if (prim < 0 && !clear) errs.push("no way in is marked most used and the batch names none — a reason needs a most used way in to be an alternative TO");
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
    if (spec.primary != null || clear) { if (i === prim) o.primary = true; else delete o.primary; }
    const n = Object.keys(why).find(k => String(k).trim() === String(v.name || "").trim());
    if (n) o.whyThisWay = String(why[n]).trim();
    if (i === prim) delete o.whyThisWay; // the most used way in is not an alternative to itself
    return o;
  });
  if (canon(next) === canon(vars)) { console.log(`same ${id} — already says this`); continue; }
  console.log(`${id}  (${before.name})${clear ? `  most used CLEARED (was ${marked >= 0 ? vars[marked].name : "none"})` : ""}${spec.primary != null && marked !== prim ? `  most used := ${vars[prim].name}${marked >= 0 ? ` (was ${vars[marked].name})` : ""}` : ""}`);
  for (const [n, s] of Object.entries(why)) console.log(`   ${n}: ${String(s).trim()}`);
  if (DRY) continue;
  if (!(id in rollback)) rollback[id] = vars; // the state before THIS run, not before its second file
  await patchRow("routes", id, { approach_variants: next });
  const after = await read(id);
  // jsonb stores object keys in its own order, so compare with keys sorted: a byte compare reported the
  // first write of the 2026-10-29 run as a MISMATCH although every value had landed.
  if (!after || canon(after.approach_variants) !== canon(next)) { console.error(`MISMATCH ${id} — the re-read does not hold what was written; stopping`); process.exitCode = 1; break; }
  applied[id + (id in applied ? "#" + Object.keys(applied).length : "")] = { primary: prim >= 0 ? next[prim].name : null, why };
  wrote++;
}
if (!DRY && wrote) {
  mkdirSync("audits/approach-why", { recursive: true });
  const stamp = Date.now();
  writeFileSync(`audits/approach-why/rollback-${stamp}.json`, JSON.stringify(rollback, null, 1));
  writeFileSync(`audits/approach-why/applied-${stamp}.json`, JSON.stringify(applied, null, 1));
}
console.log(`\n${DRY ? "dry run: " : ""}${wrote} written, ${skipped} skipped`);
