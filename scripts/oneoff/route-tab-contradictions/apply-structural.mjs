// Apply confirmed decision ops: field patches (compare-and-set), rename, refile (+create_area), merge (backup then
// delete), split (insert new row). Full-row backups of every row touched are written BEFORE any write.
// usage: node apply-structural.mjs confirm/out/cN.json [--dry]
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
import { gradeNumFor } from "../../../lib/grade.js";
const key = requireServiceKey();
const T = new URL("../../../audits/route-tab-contradictions/decisions", import.meta.url).pathname;
const file = process.argv[2], DRY = process.argv.includes("--dry");
const { results } = JSON.parse(fs.readFileSync(`${T}/${file}`));
const CITE = /https?:|www\.|\.com\b|\.org\b|mountain ?project|summitpost|peakbagger|cascadeclimbers|nwhikers|alltrails|caltopo|wta\b|washington trails association|according to|per the |guidebook|beckey'?s? (?:guide|cascade alpine)|\bCAG\b|sources? (?:say|state|list|give|describe)|trip reports? (?:say|state|describe|put|give)|wikipedia/i;
const canon = v => Array.isArray(v) ? v.map(canon) : (v && typeof v === "object") ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const eq = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const getAt = (o, p) => (p || []).reduce((x, k) => (x == null ? undefined : x[k]), o);
function setAt(o, p, v) { if (!p.length) return v; const c = Array.isArray(o) ? [...o] : { ...o }; c[p[0]] = setAt(o == null ? undefined : o[p[0]], p.slice(1), v); return c; }
const H = extra => headers(key, extra);
const one = async (table, id) => { const j = await (await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&id=eq.${encodeURIComponent(id)}`, { headers: H() })).json(); return Array.isArray(j) && j.length === 1 ? j[0] : null; };
const report = { applied: [], rejected: [], backups: [], created: [], deleted: [] };
const backedUp = new Set();
async function backup(id) { if (backedUp.has(id)) return; const r = await one("routes", id); if (r) { report.backups.push(r); backedUp.add(id); } }
// route_count is maintained by the database itself (a manual bump here double-counted every move, measured
// 2026-09-25 by check:counts), so this is deliberately a no-op.
const bump = async () => {}; const _unusedBump = async (areaId, d) => { if (DRY) return; const a = await one("areas", areaId); if (a) await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${areaId}`, { method: "PATCH", headers: H({ "Content-Type": "application/json" }), body: JSON.stringify({ route_count: (a.route_count || 0) + d }) }); };
const hasCite = v => CITE.test(typeof v === "string" ? v : JSON.stringify(v ?? ""));

for (const res of results) {
  if (res.verdict !== "confirmed" && !(res.verdict === "rejected" && res.ops?.length)) continue;
  const ops = res.ops || [];
  // 1) backups of every existing row this result touches
  for (const o of ops) for (const id of [o.id, o.from, o.into].filter(Boolean)) await backup(id);
  // 2) structural: create areas, inserts (split), refiles, renames
  for (const o of ops) {
    try {
      if (o.op === "refile") {
        const r = await one("routes", o.id);
        if (r.area_id !== o.expect_area) throw new Error(`area is ${r.area_id}, expected ${o.expect_area}`);
        if (o.create_area && !(await one("areas", o.create_area.id))) {
          const parent = await one("areas", o.create_area.parent_id);
          if (!parent) throw new Error(`parent area ${o.create_area.parent_id} missing`);
          const area = { ...o.create_area, path: `${parent.path}.${o.create_area.id}`, region: parent.region, route_count: 0 };
          if (!DRY) { const rr = await fetch(`${SUPABASE_URL}/rest/v1/areas`, { method: "POST", headers: H({ "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify(area) }); if (!rr.ok) throw new Error(`create area ${rr.status} ${(await rr.text()).slice(0, 200)}`); }
          report.created.push({ area: area.id });
        }
        if (!DRY) await patchRow("routes", o.id, { area_id: o.area_id });
        await bump(o.expect_area, -1); await bump(o.area_id, +1);
        report.applied.push({ id: o.id, op: "refile", to: o.area_id });
      } else if (o.op === "rename") {
        const r = await one("routes", o.id);
        if (r.name !== o.expect_name) throw new Error(`name is "${r.name}", expected "${o.expect_name}"`);
        if (hasCite(o.name)) throw new Error("name cites a source");
        if (!DRY) await patchRow("routes", o.id, { name: o.name });
        report.applied.push({ id: o.id, op: "rename", name: o.name });
      } else if (o.op === "split") {
        const nr = { ...o.new_row };
        if (!nr.id || !nr.name || !nr.area_id) throw new Error("new_row needs id, name, area_id");
        if (await one("routes", nr.id)) throw new Error(`new id ${nr.id} already exists`);
        if (hasCite(nr)) throw new Error("new row text cites a source");
        if (nr.grade && nr.grade_num == null) { const g = gradeNumFor(nr.grade, nr.discipline); if (g != null) nr.grade_num = g; }
        if (!DRY) { const rr = await fetch(`${SUPABASE_URL}/rest/v1/routes`, { method: "POST", headers: H({ "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify(nr) }); if (!rr.ok) throw new Error(`insert ${rr.status} ${(await rr.text()).slice(0, 200)}`); }
        await bump(nr.area_id, +1);
        report.created.push({ route: nr.id }); report.applied.push({ id: o.id, op: "split", new: nr.id });
      }
    } catch (e) { report.rejected.push({ result: res.id, op: o.op, why: e.message }); }
  }
  // 3) field patches, grouped per row, compare-and-set against the live row
  const byRow = {};
  for (const o of ops) if (o.op === "set" || o.op === "replace_text") (byRow[o.id] ||= []).push(o);
  for (const [id, ps] of Object.entries(byRow)) {
    const row = await one("routes", id); if (!row) { report.rejected.push({ result: res.id, id, why: "row missing" }); continue; }
    const next = {}; const cur = c => (c in next ? next[c] : row[c]);
    for (const p of ps) {
      const path = p.path || [], at = getAt(cur(p.column), path), nv = p.op === "set" ? p.value : p.replace;
      let why = null;
      if (["id", "area_id", "gpx", "name_search"].includes(p.column) || !(p.column in row)) why = `column ${p.column} not writable`;
      else if (hasCite(nv)) why = "new text cites a source";
      else if (p.column === "waypoints" && /lat|lng/.test(JSON.stringify(path))) why = "coordinates are out of scope";
      else if (p.op === "set" && !eq(at, p.expect)) why = `expect mismatch at ${p.column}${JSON.stringify(path)}`;
      else if (p.op === "replace_text" && (typeof at !== "string" || at.split(p.find).length !== 2)) why = `find not unique at ${p.column}${JSON.stringify(path)}`;
      if (why) { report.rejected.push({ result: res.id, id, column: p.column, why }); continue; }
      next[p.column] = setAt(cur(p.column), path, p.op === "set" ? p.value : at.replace(p.find, p.replace));
    }
    if (!Object.keys(next).length) continue;
    if ("grade" in next && row.grade_num != null && gradeNumFor(row.grade, row.discipline) === row.grade_num) { const g = gradeNumFor(next.grade, row.discipline); if (g != null && g !== row.grade_num) next.grade_num = g; }
    if (!DRY) { await patchRow("routes", id, next); const after = await one("routes", id); for (const c of Object.keys(next)) if (!eq(after[c], next[c])) throw new Error(`verify failed ${id}.${c}`); }
    report.applied.push({ id, op: "patch", columns: Object.keys(next) });
  }
  // 4) merges last: only after the kept row has its carried-over content
  for (const o of ops.filter(o => o.op === "merge")) {
    try {
      const from = await one("routes", o.from), into = await one("routes", o.into);
      if (!from || !into) throw new Error("merge row missing");
      if (!report.backups.find(b => b.id === o.from)) throw new Error("no backup of retired row");
      if (!DRY) { const rr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(o.from)}`, { method: "DELETE", headers: H({ Prefer: "return=representation" }) }); const del = await rr.json(); if (!rr.ok || !Array.isArray(del) || del.length !== 1) throw new Error(`delete returned ${rr.status} ${JSON.stringify(del).slice(0, 150)}`); }
      await bump(from.area_id, -1);
      report.deleted.push(o.from); report.applied.push({ id: o.from, op: "merge", into: o.into });
    } catch (e) { report.rejected.push({ result: res.id, op: "merge", why: e.message }); }
  }
}
const out = `${T}/structural-${file.replace(/\W+/g, "_")}-${Date.now()}${DRY ? "-dry" : ""}.json`;
fs.writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`${DRY ? "DRY " : ""}${file}: applied ${report.applied.length}, rejected ${report.rejected.length}, created ${report.created.length}, deleted ${report.deleted.length}, backups ${report.backups.length} -> ${out}`);
for (const r of report.rejected) console.log("  REJECT", JSON.stringify(r));
