#!/usr/bin/env node
// Export the owner's review queue — every HELD field edit (contributions kind 'field', status
// 'pending') and every OPEN route flag — that the nightly AI checker has not judged yet, or whose
// content changed since it did. Read-only. Writes one JSON file the checker works from.
//
//   node scripts/review-queue-export.mjs --out <file.json> [--limit 40] [--all]
//
//   --all     include items that already have an up-to-date verdict (re-check everything)
//   --limit   cap the batch (default 40 — one nightly session's search budget, see the workflow)
//
// Needs SUPABASE_SERVICE_KEY: route_flags is readable only by its reporter and admins (0307), and
// review_ai_verdicts only by admins (0436). Reads are small and indexed (status filters, then
// rows by id=in.(…)), per the owner's throttle rule — run `node ~/dev/db-throttle/dbslot.mjs
// acquire review-export` first when running locally.
//
// Each item: {item_kind, item_id, item_hash, route_id, area_id, field, field_label, column,
//   route:{name, grade, discipline, area, state}, current_value, suggested_value (edit only),
//   climber_note (flag note, or the edit's removal reason), removes_something, also_ids,
//   created_at, previous_verdict}
// Identical edits (same route + field + value) collapse to one item with also_ids, as the queue
// shows them.

import fs from "fs";
import crypto from "crypto";
import { SUPABASE_URL, requireServiceKey, headers } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = opt("--out");
const LIMIT = Number(opt("--limit", 40));
const ALL = args.includes("--all");
if (!OUT) { console.error("usage: node scripts/review-queue-export.mjs --out <file.json> [--limit 40] [--all]"); process.exit(2); }

const KEY = requireServiceKey();
async function get(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(KEY), signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path.split("?")[0]} -> ${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}
async function byIds(table, select, ids) {
  const out = [];
  const list = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100).map((s) => `"${String(s).replace(/"/g, "")}"`).join(",");
    out.push(...await get(`${table}?select=${select}&id=in.(${encodeURIComponent(chunk)})`));
  }
  return out;
}

// Stable JSON so the same value always hashes the same.
const stable = (v) => v == null || typeof v !== "object" ? JSON.stringify(v ?? null)
  : Array.isArray(v) ? "[" + v.map(stable).join(",") + "]"
  : "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
export const itemHash = (parts) => crypto.createHash("sha256").update(stable(parts)).digest("hex").slice(0, 24);

const [edits, flags, fields, verdicts] = await Promise.all([
  get("contributions?select=id,route_id,area_id,field,value,reason,review_note,contributor,created_at&kind=eq.field&status=eq.pending&order=created_at.asc&limit=1000"),
  get("route_flags?select=id,route_id,field,note,created_at&status=eq.open&order=created_at.asc&limit=1000"),
  get("contribution_fields?select=form_key,column_name,label,is_prose"),
  get("review_ai_verdicts?select=item_kind,item_id,item_hash,verdict,confidence,checked_at&limit=5000"),
]);
const fieldBy = Object.fromEntries(fields.map((f) => [f.form_key, f]));
const verdictBy = Object.fromEntries(verdicts.map((v) => [v.item_kind + ":" + v.item_id, v]));

// Cluster identical edits (same target + field + value) the way the queue does.
const clusters = new Map();
for (const e of edits) {
  const k = [e.route_id || "", e.area_id || "", e.field, stable(e.value)].join("\u0000");
  if (!clusters.has(k)) clusters.set(k, []);
  clusters.get(k).push(e);
}

const routeIds = [...edits.map((e) => e.route_id), ...flags.map((f) => f.route_id)];
const routes = await byIds("routes", "*", routeIds);
const routeBy = Object.fromEntries(routes.map((r) => [r.id, r]));
const areaIds = [...routes.map((r) => r.area_id), ...edits.filter((e) => e.area_id && !e.route_id).map((e) => e.area_id)];
const areas = await byIds("areas", "id,name,state,area_type", areaIds);
const areaBy = Object.fromEntries(areas.map((a) => [a.id, a]));

const routeCtx = (r) => r ? { name: r.name, grade: r.grade, discipline: r.discipline, area: (areaBy[r.area_id] || {}).name || r.area_id, state: (areaBy[r.area_id] || {}).state || String(r.id).split("_")[0] } : null;

const items = [];
for (const rows of clusters.values()) {
  const e = rows[0];
  const f = fieldBy[e.field];
  const r = routeBy[e.route_id];
  const isArea = !!(e.area_id && !e.route_id);
  const hash = itemHash({ v: e.value, also: rows.map((x) => x.id).sort() });
  items.push({
    item_kind: "contribution", item_id: e.id, item_hash: hash,
    route_id: e.route_id || null, area_id: isArea ? e.area_id : null, field: e.field,
    field_label: f ? f.label : e.field, column: f ? f.column_name : null,
    route: isArea ? null : routeCtx(r),
    area: isArea ? (areaBy[e.area_id] || { id: e.area_id }) : null,
    current_value: !isArea && f && r ? (r[f.column_name] ?? null) : null,
    suggested_value: e.value,
    climber_note: rows.map((x) => x.reason).filter(Boolean).join(" | ") || null,
    removes_something: rows.some((x) => /^Removes something from the page/.test(String(x.review_note || ""))), // lib/db.js REMOVAL_NOTE (0351)
    also_ids: rows.slice(1).map((x) => x.id),
    climbers: new Set(rows.map((x) => x.contributor)).size,
    created_at: e.created_at,
    previous_verdict: verdictBy["contribution:" + e.id] || null,
  });
}
for (const fl of flags) {
  const f = fieldBy[fl.field];
  const r = routeBy[fl.route_id];
  items.push({
    item_kind: "flag", item_id: fl.id, item_hash: itemHash({ n: fl.note, f: fl.field }),
    route_id: fl.route_id, area_id: null, field: fl.field,
    field_label: fl.field ? (f ? f.label : fl.field) : "Whole route", column: f ? f.column_name : null,
    route: routeCtx(r),
    current_value: f && r ? (r[f.column_name] ?? null) : null,
    suggested_value: null, climber_note: fl.note, removes_something: false, also_ids: [], climbers: 1,
    created_at: fl.created_at,
    previous_verdict: verdictBy["flag:" + fl.id] || null,
  });
}

const due = items
  .filter((it) => ALL || !it.previous_verdict || it.previous_verdict.item_hash !== it.item_hash)
  .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
const batch = due.slice(0, LIMIT);
fs.writeFileSync(OUT, JSON.stringify({ exported_at: new Date().toISOString(), total_open: items.length, due: due.length, items: batch }, null, 1));
console.log(`review-queue-export: ${edits.length} held edits (${clusters.size} distinct), ${flags.length} open flags; ${due.length} need an AI check; wrote ${batch.length} to ${OUT}`);
