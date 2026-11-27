// Applies a researched placement plan for discipline-named LEAF areas ("Cascade Mountain Ice",
// "Banks Lake Ice Climbing"): the owner's rule that ice, mixed and dry tooling are not areas of their
// own, but sit under the PLACE where the route is (owner note, 2026-10; see
// docs/features/area-placement.md). PRODUCTION WRITES, throttled through scripts/lib/supabase-env.mjs
// (1000 ms between writes, one minute's back-off and one retry on a timeout or 5xx, then a hard stop).
//
// A plan entry (one per leaf, written by research, checked by hand):
//   { leaf_id, outcome: "rename"|"dissolve"|"split"|"keep", new_name, moves:[{route_id,to}], new:[{name,lat,lng}] }
// Order per leaf: create any NEW areas (beside the leaf, same parent) -> move routes (precondition:
// the route is still on the leaf) -> rename the leaf -> delete the leaf ONLY if it ended empty AND a
// service-key count shows ZERO rows pointing at it in every table with a foreign key to areas.
// Everything refused (a duplicate trigger, a moved row) is recorded and the run goes on; nothing is
// forced (no catalog.allow_duplicate bypass).
//
//   node scripts/oneoff/apply-ice-leaf-placements.mjs <plan.json> --rollback <file.json> [--dry]
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const planFile = args[0];
const flag = n => { const i = args.indexOf(n); return i > 0 ? args[i + 1] : null; };
const rollbackFile = flag("--rollback");
const dry = args.includes("--dry");
if (!planFile || !rollbackFile) throw new Error("usage: <plan.json> --rollback <file.json> [--dry]");
const key = requireServiceKey();
const enc = encodeURIComponent;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));

async function get(path) {
  const t = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  const ms = Date.now() - t;
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  if (ms > 10000) throw new Error(`GET ${path} took ${ms} ms — database slow, STOPPED (throttle rule)`);
  return r.json();
}
let lastWrite = 0;
async function write(method, path, body) {
  const wait = lastWrite + 1000 - Date.now(); if (wait > 0) await sleep(wait); lastWrite = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: headers(key, { "Content-Type": "application/json", Prefer: "return=representation" }), body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  const text = await r.text();
  if (r.status >= 500) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 200)} — STOPPED (throttle rule)`);
  return { ok: r.ok, status: r.status, rows: r.ok ? JSON.parse(text || "[]") : null, text };
}
// Every table with a foreign key to areas(id) (SUPABASE_SCHEMA.sql header). The two rollups are
// trigger-maintained caches of the area's own counts; they are counted and reported, but a row there
// is the cache of an EMPTY area, not a reference anyone made.
const FK_TABLES = ["contributions", "topos", "saved_areas", "partner_areas", "review_ai_verdicts", "review_worklist", "crews", "gps_submissions", "groups", "routes"];
async function refs(id) {
  const out = {};
  for (const t of FK_TABLES) { const rows = await get(`${t}?select=area_id&area_id=eq.${enc(id)}&limit=1`); if (rows.length) out[t] = rows.length; }
  const kids = await get(`areas?select=id&parent_id=eq.${enc(id)}&limit=1`); if (kids.length) out.areas_children = 1;
  return out;
}
const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// Rollback first: every leaf row (full), every route's area_id, written before any write.
const log = { planFile, startedAt: new Date().toISOString(), leaves: [], routes: [], created: [], deleted: [], refused: [] };
if (!fs.existsSync(rollbackFile)) {
  for (const p of plan) {
    const [leaf] = await get(`areas?select=*&id=eq.${enc(p.leaf_id)}`);
    if (!leaf) { log.refused.push({ leaf: p.leaf_id, why: "leaf not found" }); continue; }
    log.leaves.push(leaf);
    const rs = await get(`routes?select=id,area_id,name&area_id=eq.${enc(p.leaf_id)}`);
    log.routes.push(...rs);
  }
  if (!dry) fs.writeFileSync(rollbackFile, JSON.stringify(log, null, 1));
} else Object.assign(log, JSON.parse(fs.readFileSync(rollbackFile, "utf8")), { refused: [] });

const summary = { renamed: 0, moved: 0, created: 0, deleted: 0, refused: 0, kept: 0 };
for (const p of plan) {
  if (p.outcome === "keep") { summary.kept++; continue; }
  // A bucket op (a discipline PARENT): "reparent" moves the area (its subtree follows by trigger),
  // "rename" renames it, "delete" removes it only when it holds nothing and nothing points at it.
  if (p.op) {
    if (dry) { console.log("  would", p.op, p.leaf_id, p.to || p.new_name || ""); continue; }
    try {
      if (p.op === "reparent") { await patchRow("areas", p.leaf_id, { parent_id: p.to }, { filter: `parent_id=eq.${enc(p.from)}` }); summary.moved++; }
      else if (p.op === "rename") { await patchRow("areas", p.leaf_id, { name: p.new_name }); summary.renamed++; }
    } catch (e) { if (/STOPPED/.test(e.message)) throw e; log.refused.push({ area: p.leaf_id, op: p.op, why: e.message.slice(0, 300) }); summary.refused++; }
    if (p.op !== "delete") { fs.writeFileSync(rollbackFile, JSON.stringify(log, null, 1)); continue; }
  }
  // "dissolve_partial": the listed moves only; the leaf keeps its name and the rest of its routes.
  const [leaf] = await get(`areas?select=id,name,parent_id,lat,lng,region,area_type&id=eq.${enc(p.leaf_id)}`);
  if (!leaf) { log.refused.push({ leaf: p.leaf_id, why: "leaf gone" }); summary.refused++; continue; }
  const newIds = {};
  for (const n of p.new || []) {
    const id = `${leaf.id.split("_")[0]}_${slug(n.name)}`.slice(0, 80);
    const body = { id, name: n.name, parent_id: leaf.parent_id, region: leaf.region, area_type: leaf.area_type || "crag", lat: n.lat ?? null, lng: n.lng ?? null, coords_approx: n.lat == null ? false : true };
    if (dry) { console.log("  would create", id, n.name); newIds[n.name] = id; continue; }
    const r = await write("POST", "areas", body);
    if (!r.ok) { log.refused.push({ leaf: leaf.id, create: n.name, why: r.text.slice(0, 300) }); summary.refused++; continue; }
    newIds[n.name] = id; log.created.push(id); summary.created++;
  }
  for (const m of p.moves || []) {
    const to = m.to.startsWith("NEW:") ? newIds[m.to.slice(4)] : m.to;
    if (!to) { log.refused.push({ route: m.route_id, why: `target ${m.to} not created` }); summary.refused++; continue; }
    if (dry) { console.log("  would move", m.route_id, "->", to); continue; }
    try { await patchRow("routes", m.route_id, { area_id: to }, { filter: `area_id=eq.${enc(leaf.id)}` }); summary.moved++; }
    catch (e) { if (/STOPPED/.test(e.message)) throw e; log.refused.push({ route: m.route_id, to, why: e.message.slice(0, 300) }); summary.refused++; }
  }
  if (p.new_name && p.new_name !== leaf.name && p.outcome !== "dissolve") {
    if (dry) console.log("  would rename", leaf.id, JSON.stringify(leaf.name), "->", JSON.stringify(p.new_name));
    else {
      try { await patchRow("areas", leaf.id, { name: p.new_name }, { filter: `name=eq.${enc(leaf.name)}` }); summary.renamed++; }
      catch (e) { if (/STOPPED/.test(e.message)) throw e; log.refused.push({ leaf: leaf.id, rename: p.new_name, why: e.message.slice(0, 300) }); summary.refused++; }
    }
  }
  if (!dry) {
    const left = await get(`routes?select=id&area_id=eq.${enc(leaf.id)}&limit=1`);
    if (!left.length) {
      const r = await refs(leaf.id);
      if (Object.keys(r).length) log.refused.push({ leaf: leaf.id, delete: "held", refs: r });
      else {
        const d = await write("DELETE", `areas?id=eq.${enc(leaf.id)}&parent_id=eq.${enc(leaf.parent_id)}`);
        if (d.ok && d.rows.length === 1) { log.deleted.push(leaf.id); summary.deleted++; } else log.refused.push({ leaf: leaf.id, delete: d.text.slice(0, 300) });
      }
    }
    fs.writeFileSync(rollbackFile, JSON.stringify(log, null, 1));
  }
}
console.log(JSON.stringify(summary), dry ? "(dry)" : "");
for (const r of log.refused) console.log("  REFUSED", JSON.stringify(r).slice(0, 400));
