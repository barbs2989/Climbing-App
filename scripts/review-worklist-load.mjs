#!/usr/bin/env node
// Feed the Review desk's Worklist (review_worklist, 0530) from the data audits. Owner, 2026-11-24: "do all"
// of the admin-page list — item 7, the audits' findings as rows the owner works through on the desk.
//
//   node scripts/review-worklist-load.mjs [--state WA] [--only impossible-numbers,audit:prose-length] [--dry]
//
// Each SOURCE below either runs an audit with --json (and adapts its findings) or queries the catalog itself.
// A finding becomes one row keyed (audit, item_key), so a re-run UPDATES it (last_seen) instead of adding a copy.
// After a source runs cleanly: an OPEN row it no longer finds is closed as done ("No longer found by the audit"),
// and a row the owner marked DONE that the audit finds again is reopened. IGNORED rows stay ignored.
// A source that fails (exit code, unparsable output) changes nothing for that source.
//
// Service key (writes). All production DB work goes through the slot gate first:
//   node ~/dev/db-throttle/dbslot.mjs acquire worklist  …  release worklist
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, requireServiceKey, headers } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const DRY = args.includes("--dry");
const STATE = arg("--state");
const ONLY = arg("--only") ? new Set(arg("--only").split(",")) : null;
const svc = requireServiceKey();
const H = headers(svc, { "Content-Type": "application/json" });

async function rest(method, p, body, extra) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { method, headers: { ...H, ...(extra || {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${p.split("?")[0]} -> ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

// Run an audit script with --json; return its parsed output (the first JSON value it prints).
function runAudit(script) {
  const argv = [script, "--json"]; if (STATE) argv.push("--state", STATE);
  const out = execFileSync(process.execPath, argv, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"] });
  const i = out.search(/^[[{]/m);
  if (i < 0) throw new Error(script + " printed no JSON");
  return JSON.parse(out.slice(i));
}
const clip = (s, n) => (s == null ? null : String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));

const SOURCES = {
  // Built in: a stored number no climb can have (the same ranges the edit guard enforces, 0530).
  "impossible-numbers": async () => {
    const checks = [
      ["length_m", "gt.4572", (r) => `Height / length is ${Math.round(r.length_m * 3.28084).toLocaleString()} ft`],
      ["high_point_ft", "gt.20400", (r) => `High point is ${Math.round(r.high_point_ft).toLocaleString()} ft`],
      ["gain_ft", "gt.21325", (r) => `Elevation gain is ${Math.round(r.gain_ft).toLocaleString()} ft`],
      ["dist_km", "gt.300", (r) => `Distance is ${r.dist_km} km`],
      ["pitches", "gt.200", (r) => `${r.pitches} pitches`],
    ];
    const items = [];
    for (const [col, op, say] of checks) {
      const rows = await rest("GET", `routes?select=id,name,area_id,${col}&${col}=${op}&limit=500`);
      for (const r of rows) items.push({ item_key: r.id + ":" + col, route_id: r.id, title: `${r.name}: ${say(r)}`, detail: `routes.${col} = ${r[col]}. No climb has this; find the right value or clear it.` });
    }
    return items;
  },
  "audit:expiring-closures": async () => (runAudit("scripts/audit-expiring-closures.mjs").findings || []).map((f) => ({
    item_key: `${f.id}:${f.field}`, route_id: f.id, title: `${f.name}: a closure that may have expired (${f.tier})`,
    detail: clip(`${f.field}${f.roadName ? " · " + f.roadName : ""}: ${f.text}`, 4000) })),
  "audit:prose-length": async () => (runAudit("scripts/audit-prose-length.mjs") || []).map((f) => ({
    item_key: `${f.id}:${f.kind}`, route_id: f.id, title: `${f.name}: description's ${f.kind} disagrees with its stats (${f.verdict})`,
    detail: clip(`Stored ${f.kind}: ${f.stored ?? "none"}. The text says: ${(f.claims || []).map((c) => c.text).join(" | ")}`, 4000) })),
  "audit:partner-grade": async () => (runAudit("scripts/audit-partner-grade.mjs") || []).map((f) => ({
    item_key: `${f.id}`, route_id: f.id, title: `${f.name || f.id}: partner requirements ask for a grade the route contradicts`,
    detail: clip(JSON.stringify(f), 4000) })),
};

const started = new Date().toISOString();
let total = 0;
for (const [source, find] of Object.entries(SOURCES)) {
  if (ONLY && !ONLY.has(source)) continue;
  let items;
  try { items = await find(); } catch (e) { console.error(`  ${source}: FAILED, nothing changed — ${e.message}`); continue; }
  // one row per key (an audit may report a route twice)
  const byKey = new Map(); for (const it of items) if (it.route_id || it.area_id) byKey.set(it.item_key, it);
  const rows = [...byKey.values()].map((it) => ({ audit: source, item_key: it.item_key, route_id: it.route_id || null, area_id: it.area_id || null,
    title: clip(it.title, 300), detail: clip(it.detail, 4000), last_seen: started }));
  total += rows.length;
  console.log(`  ${source}: ${rows.length} finding(s)`);
  if (DRY) continue;
  for (let i = 0; i < rows.length; i += 200)
    await rest("POST", "review_worklist?on_conflict=audit,item_key", rows.slice(i, i + 200), { Prefer: "resolution=merge-duplicates,return=minimal" });
  const src = encodeURIComponent(source);
  const closed = await rest("PATCH", `review_worklist?audit=eq.${src}&status=eq.open&last_seen=lt.${encodeURIComponent(started)}`,
    { status: "done", resolved_at: new Date().toISOString(), note: "No longer found by the audit." }, { Prefer: "return=representation" });
  const reopened = await rest("PATCH", `review_worklist?audit=eq.${src}&status=eq.done&last_seen=gte.${encodeURIComponent(started)}`,
    { status: "open", resolved_at: null, resolved_by: null, note: "Found again by the audit." }, { Prefer: "return=representation" });
  console.log(`    closed ${closed.length} no longer found · reopened ${reopened.length} found again`);
}
console.log(DRY ? `dry run: ${total} finding(s), nothing written` : `review-worklist-load: ${total} finding(s) on the desk`);
