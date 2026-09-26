#!/usr/bin/env node
// One-off: apply REVIEWED replacements of whole `routes` column values, each against a DECLARED current value.
//
//   node scripts/oneoff/apply-declared-fields.mjs <fixes.json> <audit-subdir> [--apply]
//
// Dry by default. <fixes.json> is keyed by route id:
//   { "<id>": { "area_id": "...", "fields": { "<column>": { "expect": <value reviewed>, "value": <new value> } } } }
// A route is REFUSED whole if its area moved, or any column's live value differs from `expect` (somebody
// edited it after the review — re-review, never force). New values are refused if they name a source
// (the app's no-sources rule). Writes a rollback file to audits/<audit-subdir>/ first; re-reads and
// reconciles after, comparing order-insensitively because jsonb does not keep key order.
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const [file, sub] = args.filter((a) => a !== "--apply");
if (!file || !sub || !/^[\w-]+$/.test(sub)) { console.error("usage: apply-declared-fields.mjs <fixes.json> <audit-subdir> [--apply]"); process.exit(2); }
const COLS = new Set(["bivy", "road", "access", "approach", "approach_logistics", "approach_variants", "waypoints", "watch_out"]);
const fixes = JSON.parse(fs.readFileSync(file, "utf8"));
const key = requireServiceKey();
const SOURCE_RE = /\b(mountain ?project|summit ?post|cascade ?climbers|nwhikers|peakbagger|wta\b|washington trails association|beckey|guide ?book|trip reports? (say|note|describe)|according to|reported by|the mountaineers)\b|\b[Pp]er (?:the )?[A-Z]/;
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));

const read = async (id, cols) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,${cols.join(",")}&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  if (!res.ok) throw new Error(`read ${id} -> ${res.status}`);
  return (await res.json())[0] || null;
};

const plan = []; let refused = 0;
for (const [id, f] of Object.entries(fixes)) {
  const cols = Object.keys(f.fields || {});
  const bad = cols.find((c) => !COLS.has(c));
  if (!cols.length || bad) { console.log(`REFUSE ${id} — ${bad ? `column ${bad} not allowed` : "no fields"}`); refused++; continue; }
  const row = await read(id, cols);
  const why = !row ? "no such route"
    : row.area_id !== f.area_id ? `area_id is ${row.area_id}, fix was written against ${f.area_id}`
    : cols.find((c) => !same(row[c], f.fields[c].expect)) ? `${cols.find((c) => !same(row[c], f.fields[c].expect))} changed since the review`
    : cols.find((c) => SOURCE_RE.test(JSON.stringify(f.fields[c].value ?? ""))) ? `${cols.find((c) => SOURCE_RE.test(JSON.stringify(f.fields[c].value ?? "")))} names a source`
    : null;
  if (why) { console.log(`REFUSE ${id} — ${why}`); refused++; continue; }
  const body = Object.fromEntries(cols.filter((c) => !same(row[c], f.fields[c].value)).map((c) => [c, f.fields[c].value]));
  if (!Object.keys(body).length) { console.log(`same   ${id}`); continue; }
  plan.push({ id, area_id: row.area_id, before: Object.fromEntries(Object.keys(body).map((k) => [k, row[k]])), body });
  console.log(`${APPLY ? "write " : "would "} ${id} — ${Object.keys(body).join(", ")}`);
}
console.log(`\n${plan.length} to write, ${refused} refused.`);
if (!APPLY) { console.log("dry run — pass --apply to write."); process.exit(refused ? 1 : 0); }
if (!plan.length) process.exit(refused ? 1 : 0);

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
fs.mkdirSync(path.join(ROOT, "audits", sub), { recursive: true });
const rb = path.join(ROOT, "audits", sub, `rollback-declared-fields-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify(plan.map((p) => ({ id: p.id, area_id: p.area_id, ...p.before })), null, 1));
console.log(`rollback written: ${rb}`);
for (const p of plan) await patchRow("routes", p.id, p.body, { filter: `area_id=eq.${encodeURIComponent(p.area_id)}` });
let bad = 0;
for (const p of plan) {
  const row = await read(p.id, Object.keys(p.body));
  if (!Object.keys(p.body).every((k) => same(row[k], p.body[k]))) { console.log(`MISMATCH ${p.id}`); bad++; }
}
console.log(`reconciled: ${plan.length - bad}/${plan.length} match what was written.`);
process.exit(bad || refused ? 1 : 0);
