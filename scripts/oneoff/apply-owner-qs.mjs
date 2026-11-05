// Apply the owner-question research (WA, 2026-11-04): PATCH fields, MERGE one row into another, DELETE a shell.
// Owner: "do what you recommend based on research" + "keep going and don't stop" (2026-11-04).
//
// Usage: node apply-owner-qs.mjs ops.json [--write]     (dry run by default: checks everything, writes nothing)
// ops.json: [
//   { op: "patch",  id, area_id, name, set: {col: value}, expect?: {col: value} },
//   { op: "merge",  id (dropped), into (kept), area_id, name, move: [cols], set?: {col: value} },
//   { op: "delete", id, area_id, name }
// ]
// Safety, as merge-sloan-r1-into-corkscrew.mjs: every row a step touches is backed up whole FIRST; name/area must
// match what the research read; a delete refuses when anything references the row (FK tables cascade, so a
// reference would be destroyed); a merge moves only onto columns that are EMPTY on the kept row (unless named in
// set), re-reads the kept row, and only then deletes. Paced and backing off a minute on a failure, never fast.
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { gradeNumFrom, gradeSystemForDiscipline } = await import(pathToFileURL(path.join(REPO, "lib/grade.js")).href);
const { requireServiceKey, selectAll, patchRow, SUPABASE_URL, headers } = await import(pathToFileURL(path.join(REPO, "scripts/lib/supabase-env.mjs")).href);

const ops = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const WRITE = process.argv.includes("--write");
const REFS = ["climb_logs", "content_reports", "contributions", "crews", "gps_submissions", "hazard_votes", "objectives", "route_base_checkins", "topo_lines", "user_itineraries"];
const key = requireServiceKey();
const pause = ms => new Promise(r => setTimeout(r, ms));
const empty = v => v == null || (Array.isArray(v) && !v.length) || (typeof v === "string" && !v.trim());

async function retry(label, fn) {
  for (let a = 1; ; a++) {
    try { return await fn(); } catch (e) {
      console.log(`  ${label} failed (attempt ${a}): ${String(e.message).slice(0, 140)}`);
      if (a >= 3) throw e;
      await pause(60000);
    }
  }
}
const get = id => retry(`read ${id}`, async () => (await selectAll("routes", "*", `id=eq.${id}`, { key, pageSize: 5 }))[0] || null);
async function count(q) {
  return retry(`count ${q.slice(0, 40)}`, async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key, { Prefer: "count=exact" }) });
    if (!r.ok) throw new Error(`GET ${q} -> ${r.status}`);
    return +(r.headers.get("content-range") || "*/0").split("/")[1];
  });
}
async function refs(id) {
  let n = 0;
  for (const t of REFS) { const c = await count(`${t}?select=route_id&route_id=eq.${id}`); if (c) console.log(`    ${t}: ${c}`); n += c; }
  n += await count(`user_lists?select=id&route_ids=cs.%7B${id}%7D`);
  n += await count(`comments?select=id&or=(target_id.eq.${id},target_id.like.${id}__*)`);
  return n;
}
async function del(id) {
  return retry(`delete ${id}`, async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}`, { method: "DELETE", headers: headers(key, { Prefer: "return=representation" }) });
    const gone = await r.json();
    if (!r.ok || !Array.isArray(gone) || gone.length !== 1) throw new Error(`DELETE ${id} -> ${r.status}, ${Array.isArray(gone) ? gone.length : "?"} rows`);
  });
}
// key order is not content: a trigger may rebuild a waypoint object with its keys in another order
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));

const STAMP = Date.now();
const backups = [];
let bad = 0, done = 0;
for (const o of ops) {
  const row = await get(o.id);
  console.log(`\n${o.op.toUpperCase()} ${o.id}${o.into ? " -> " + o.into : ""}`);
  if (!row) { console.log(o.op === "patch" ? "  FAIL: row missing" : "  already gone"); if (o.op === "patch") bad++; continue; }
  if (row.area_id !== o.area_id || row.name !== o.name) { console.log(`  FAIL: row is ${row.name} on ${row.area_id}, research read ${o.name} on ${o.area_id}`); bad++; continue; }
  if (o.expect) { const off = Object.entries(o.expect).filter(([c, v]) => !same(row[c], v)); if (off.length) { console.log(`  FAIL: changed since research: ${off.map(([c]) => c).join(", ")}`); bad++; continue; } }

  let keep = null, set = { ...(o.set || {}) };
  // fill: write only where the row's column is empty today; add: append to an array column, skipping items it holds
  for (const [c, v] of Object.entries(o.fill || {})) if (empty(row[c])) set[c] = v; else console.log(`  not filled (has its own): ${c}`);
  for (const [c, items] of Object.entries(o.add || {})) {
    const cur = Array.isArray(row[c]) ? row[c] : [];
    const lc = new Set(cur.map(x => String(x).toLowerCase()));
    const extra = items.filter(x => !lc.has(String(x).toLowerCase()));
    if (extra.length) set[c] = [...cur, ...extra];
  }
  // replaceText: [[from, to]] string swaps inside text columns (the column must contain `from`)
  for (const [c, pairs] of Object.entries(o.replaceText || {})) {
    let t = typeof row[c] === "string" ? row[c] : JSON.stringify(row[c]);
    for (const [a, b] of pairs) { if (!t.includes(a)) console.log(`  WARN ${c}: "${a}" not found`); t = t.split(a).join(b); }
    set[c] = typeof row[c] === "string" ? t : JSON.parse(t);
  }
  if (o.op === "merge") {
    keep = await get(o.into);
    if (!keep || keep.area_id !== (o.into_area || o.area_id)) { console.log(`  FAIL: ${o.into} missing or not on ${o.into_area || o.area_id}`); bad++; continue; }
    // move "*": every content column of the dropped row (identity, timestamps and derived columns excluded)
    const SKIP = new Set(["id", "area_id", "name", "created_at", "updated_at", "sort_order", "path", "search_name", "name_norm", "fts", "grade_num", "name_search", "auto_generated", "classic", "verif", "snow_grade_num"]);
    const cols = o.move === "*" ? Object.keys(row).filter(c => !SKIP.has(c)) : (o.move || []);
    for (const c of cols) {
      if (empty(row[c])) continue;
      if (!empty(keep[c]) && !(c in (o.set || {}))) { console.log(`  not moved (kept row has its own): ${c}`); continue; }
      if (!(c in set)) set[c] = row[c];
    }
  }
  // a new primary discipline leads `disciplines`, and the old (wrong) primary leaves it
  { const t = o.op === "merge" ? keep : row;
    if (o.op !== "delete" && set.discipline && set.discipline !== t.discipline && !(o.set && "disciplines" in o.set))
      set.disciplines = [set.discipline, ...((set.disciplines || t.disciplines) || []).filter(d => d !== set.discipline && d !== t.discipline)]; }
  // a changed grade or discipline re-derives the sortable grade_num and grade_system through the ONE parser
  { const t = o.op === "merge" ? keep : row;
    // only when the GRADE changes; the system follows the grade's own shape (an alpine row graded AI3 is "wi",
    // one graded Class 3 is "class"), the discipline's system only for a shape it does not name
    if (o.op !== "delete" && "grade" in set) {
      const g = set.grade, d = set.discipline || t.discipline;
      const sys = !g ? null : /^class\b|^\d(st|nd|rd|th)\b/i.test(g) ? "class" : /^(W|A)I\d/.test(g) ? "wi" : /^5\./.test(g) ? "yds" : gradeSystemForDiscipline(d);
      const n = g ? gradeNumFrom(g, sys) : null;
      set.grade_num = Number.isFinite(n) ? n : null; set.grade_system = sys;
    } }
  if (o.op !== "patch") { const n = await refs(o.id); if (n) { console.log(`  FAIL: ${n} reference(s) to ${o.id} — not deleting`); bad++; continue; } }
  const target = o.op === "merge" ? keep : row;
  const change = Object.fromEntries(Object.entries(o.op === "delete" ? {} : set).filter(([c, v]) => !same(target[c], v)));
  for (const [c, v] of Object.entries(change)) console.log(`  ${o.op === "merge" ? o.into : o.id}.${c}: ${JSON.stringify(target[c])?.slice(0, 70)} -> ${JSON.stringify(v)?.slice(0, 70)}`);
  if (o.op !== "patch") console.log(`  then delete ${o.id} (0 references)`);
  if (!WRITE) continue;

  backups.push({ op: o, before: row, keptBefore: keep });
  fs.writeFileSync(rbPath(), JSON.stringify({ note: "full rows before apply-owner-qs.mjs; restore a patch with patchRow, a delete by re-inserting `before`", at: new Date().toISOString(), steps: backups }, null, 1));
  const tid = o.op === "merge" ? o.into : o.id;
  if (Object.keys(change).length) {
    await retry(`patch ${tid}`, () => patchRow("routes", tid, change));
    const got = await get(tid);
    const off = Object.keys(change).filter(c => !same(got[c], change[c]));
    if (off.length) { console.log(`  FAIL: ${tid} did not take ${off.join(", ")} — nothing deleted`); bad++; continue; }
    console.log(`  re-read ${tid}: took ${Object.keys(change).length} field(s)`);
  }
  if (o.op !== "patch") {
    await del(o.id);
    const still = await get(o.id);
    if (still) { console.log(`  FAIL: ${o.id} still present`); bad++; continue; }
    console.log(`  deleted and re-read: gone`);
  }
  done++;
  await pause(1500);
}
console.log(`\n${WRITE ? "applied" : "dry run"}: ${WRITE ? done : ops.length - bad} ok, ${bad} refused`);
if (WRITE && backups.length) console.log(`rollback: ${rbPath()}`);
function rbPath() { return path.join(REPO, "scripts", `rollback-owner-qs-${STAMP}.json`); }
