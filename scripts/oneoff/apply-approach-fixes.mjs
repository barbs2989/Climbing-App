#!/usr/bin/env node
// One-off: apply REVIEWED corrections to a handful of routes' `approach` and `approach_variants`.
//
//   node scripts/oneoff/apply-approach-fixes.mjs <fixes.json> [--apply]
//
// Dry by default. <fixes.json> is keyed by route id:
//   { "<id>": { "area_id": "...", "names": ["<variant names the fix was written against>"],
//               "approach": "<new paragraph>",            // optional
//               "approach_variants": [ ...whole array ],     // optional
//               "approach_logistics": {...}, "waypoints": [...], "gpx": [...] } } // optional, whole values
// A route whose area or variant names changed since the fix was written is REFUSED: the fix was
// written against a list somebody has since edited. Rendered text is refused if it names a source
// (the app's no-sources rule), and approach_variants is refused unless it carries at most one
// primary and one longForm. Writes a rollback file first; re-reads and reconciles after, comparing
// order-insensitively because jsonb does not keep key order.
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: apply-approach-fixes.mjs <fixes.json> [--apply]"); process.exit(2); }
const APPLY = flag === "--apply";
const fixes = JSON.parse(fs.readFileSync(file, "utf8"));
const key = requireServiceKey();
const SOURCE_RE = /\b(mountain ?project|summit ?post|cascade ?climbers|nwhikers|peakbagger|wta\b|washington trails association|beckey|guide ?book|trip reports? (say|note|describe)|according to|reported by|the mountaineers)\b|\b[Pp]er (?:the )?[A-Z]/;
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const texts = (v) => [v.name, v.season, v.notes, v.baseFinding, ...(Array.isArray(v.hazards) ? v.hazards : [v.hazards])].filter(Boolean).map(String);

const read = async (id) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,approach,approach_variants,approach_logistics,waypoints,gpx&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  if (!res.ok) throw new Error(`read ${id} -> ${res.status}`);
  return (await res.json())[0] || null;
};

const plan = []; let refused = 0;
for (const [id, f] of Object.entries(fixes)) {
  const row = await read(id);
  const vars = row && Array.isArray(row.approach_variants) ? row.approach_variants : [];
  const nv = f.approach_variants;
  const why = !row ? "no such route"
    : row.area_id !== f.area_id ? `area_id is ${row.area_id}, fix was written against ${f.area_id}`
    : JSON.stringify(vars.map((v) => v && v.name)) !== JSON.stringify(f.names) ? "ways in changed since the fix was written"
    : f.approach != null && SOURCE_RE.test(f.approach) ? "new approach paragraph names a source"
    : nv && !Array.isArray(nv) ? "approach_variants is not an array"
    : nv && nv.some((v) => texts(v).some((t) => SOURCE_RE.test(t))) ? "a new way in names a source"
    : nv && (nv.filter((v) => v.primary === true).length > 1 || nv.filter((v) => v.longForm === true).length > 1) ? "more than one primary or longForm"
    : null;
  if (why) { console.log(`REFUSE ${id} — ${why}`); refused++; continue; }
  const body = {};
  if (f.approach != null && f.approach !== row.approach) body.approach = f.approach;
  if (nv && !same(nv, vars)) body.approach_variants = nv;
  // A trailhead pin and the drawn line's first vertex move TOGETHER, or the sketch keeps starting
  // at the old trailhead (audit:stranded-track-vertices is the detector for exactly that).
  for (const k of ["approach_logistics", "waypoints", "gpx"]) if (f[k] != null && !same(f[k], row[k])) body[k] = f[k];
  if (body.approach_logistics && SOURCE_RE.test(JSON.stringify(body.approach_logistics))) { console.log(`REFUSE ${id} — approach_logistics names a source`); refused++; continue; }
  if (!Object.keys(body).length) { console.log(`same   ${id}`); continue; }
  plan.push({ id, area_id: row.area_id, before: Object.fromEntries(Object.keys(body).map((k) => [k, row[k]])), body });
  console.log(`${APPLY ? "write " : "would "} ${id} — ${Object.keys(body).join(", ")}`);
}
console.log(`\n${plan.length} to write, ${refused} refused.`);
if (!APPLY) { console.log("dry run — pass --apply to write."); process.exit(refused ? 1 : 0); }
if (!plan.length) process.exit(refused ? 1 : 0);

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const rb = path.join(ROOT, "audits", "approach-primary", `rollback-approach-fixes-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify(plan.map((p) => ({ id: p.id, area_id: p.area_id, ...p.before })), null, 1));
console.log(`rollback written: ${rb}`);
for (const p of plan) await patchRow("routes", p.id, p.body, { filter: `area_id=eq.${encodeURIComponent(p.area_id)}` });
let bad = 0;
for (const p of plan) {
  const row = await read(p.id);
  const ok = Object.keys(p.body).every((k) => same(row[k], p.body[k]));
  if (!ok) { console.log(`MISMATCH ${p.id}`); bad++; }
}
console.log(`reconciled: ${plan.length - bad}/${plan.length} match what was written.`);
process.exit(bad || refused ? 1 : 0);
