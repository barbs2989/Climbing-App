#!/usr/bin/env node
// One-off: mark the way in MOST parties take on every route with two or more approach_variants.
//
//   node scripts/oneoff/set-approach-primary.mjs <decisions.json> [--apply]
//
// Dry by default. <decisions.json> is a REVIEWED research output keyed by route id:
//   { "<id>": { "area_id": "...", "names": ["<variant 0 name>", ...], "primaryIndex": 0,
//               "longFormIndex": 1,   // optional: the way in the `approach` paragraph describes,
//                                      // when it is NOT the most used one
//               "seasonEdits": { "<index>": "<new season text>" } } }
// `area_id` and `names` are what the research was done AGAINST. A route whose area or ways in
// have changed since is refused rather than marked: an index into a list somebody has since
// reordered would badge the wrong way in, and nothing on screen would show it.
//
// Sets `primary:true` on exactly one variant (and `longForm:true` on at most one other), removing
// both from the rest. Touches no other key except a reviewed `season`. Writes a rollback file of every row's previous approach_variants
// before the first PATCH, then re-reads every row and reconciles — a 200 is not evidence.
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: set-approach-primary.mjs <decisions.json> [--apply]"); process.exit(2); }
const APPLY = flag === "--apply";
const decisions = JSON.parse(fs.readFileSync(file, "utf8"));
const key = requireServiceKey();

// Season text renders verbatim on the route page: the no-sources rule reaches it.
const SOURCE_RE = /\b(mountain ?project|summit ?post|cascade ?climbers|nwhikers|peakbagger|wta|beckey|nelson|guide ?book|trip report|according to|reported by|the mountaineers|forest service website)\b/i;
const WINDOW_RE = /^(early |mid-?|late )?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|year|winter|spring|summer|fall|autumn)/i;

// jsonb does not keep key order: Postgres stores objects sorted by key length then bytes, so a
// byte comparison with what was sent reported 0/118 on a write that had landed 118/118.
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const read = async (id) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,approach_variants&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  if (!res.ok) throw new Error(`read ${id} -> ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
};

const plan = [];
let refused = 0;
for (const [id, d] of Object.entries(decisions)) {
  const row = await read(id);
  const vars = row && Array.isArray(row.approach_variants) ? row.approach_variants : null;
  const why = !row ? "no such route"
    : row.area_id !== d.area_id ? `area_id is ${row.area_id}, research was against ${d.area_id}`
    : !vars || vars.length < 2 ? "fewer than two ways in now"
    : JSON.stringify(vars.map((v) => v && v.name)) !== JSON.stringify(d.names) ? "ways in changed since the research"
    : !(Number.isInteger(d.primaryIndex) && d.primaryIndex >= 0 && d.primaryIndex < vars.length) ? `primaryIndex ${d.primaryIndex} out of range`
    : d.longFormIndex != null && !(Number.isInteger(d.longFormIndex) && d.longFormIndex >= 0 && d.longFormIndex < vars.length && d.longFormIndex !== d.primaryIndex) ? `longFormIndex ${d.longFormIndex} invalid`
    : null;
  if (why) { console.log(`REFUSE ${id} — ${why}`); refused++; continue; }
  const edits = d.seasonEdits || {};
  let bad = null;
  for (const [i, s] of Object.entries(edits)) {
    if (!vars[+i]) bad = `season edit on missing index ${i}`;
    else if (SOURCE_RE.test(s)) bad = `season edit ${i} names a source: ${s}`;
    else if (!WINDOW_RE.test(String(s).trim())) bad = `season edit ${i} does not open with a window: ${s}`;
    else if (String(s).length > 160) bad = `season edit ${i} is ${String(s).length} chars`;
  }
  if (bad) { console.log(`REFUSE ${id} — ${bad}`); refused++; continue; }
  const next = vars.map((v, i) => {
    const o = Object.assign({}, v);
    delete o.primary; delete o.longForm;
    if (i === d.primaryIndex) o.primary = true;
    if (d.longFormIndex != null && i === d.longFormIndex) o.longForm = true;
    if (edits[i] != null) o.season = String(edits[i]).trim();
    return o;
  });
  if (JSON.stringify(canon(next)) === JSON.stringify(canon(vars))) { console.log(`same   ${id}`); continue; }
  plan.push({ id, area_id: row.area_id, before: vars, after: next });
  console.log(`${APPLY ? "write " : "would "} ${id} — primary=${d.primaryIndex}${d.longFormIndex != null ? `, longForm=${d.longFormIndex}` : ""}${Object.keys(edits).length ? `, ${Object.keys(edits).length} season edit(s)` : ""}`);
}
console.log(`\n${plan.length} to write, ${refused} refused.`);
if (!APPLY) { console.log("dry run — pass --apply to write."); process.exit(refused ? 1 : 0); }
if (!plan.length) process.exit(refused ? 1 : 0);

const rb = path.join(path.dirname(new URL(import.meta.url).pathname), "..", `rollback-approach-primary-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify(plan.map((p) => ({ id: p.id, area_id: p.area_id, approach_variants: p.before })), null, 1));
console.log(`rollback written: ${rb}`);
for (const p of plan) await patchRow("routes", p.id, { approach_variants: p.after }, { filter: `area_id=eq.${encodeURIComponent(p.area_id)}` });

let mismatched = 0;
for (const p of plan) {
  const row = await read(p.id);
  const got = row && row.approach_variants;
  const marks = Array.isArray(got) ? got.filter((v) => v && v.primary === true).length : 0;
  const lfs = Array.isArray(got) ? got.filter((v) => v && v.longForm === true).length : 0;
  if (JSON.stringify(canon(got)) !== JSON.stringify(canon(p.after)) || marks !== 1 || lfs > 1) { console.log(`MISMATCH ${p.id} (marks=${marks})`); mismatched++; }
}
console.log(`reconciled: ${plan.length - mismatched}/${plan.length} match what was written.`);
process.exit(mismatched || refused ? 1 : 0);
