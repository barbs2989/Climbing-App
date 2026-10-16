// Apply researched patches: compare-and-set against the LIVE row, one PATCH per route, re-read to verify.
// usage: node apply.mjs <patches.json> [--dry]
// patches.json: {"patches":[{"id","column","path":[...],"op":"set"|"replace_text","expect","value","find","replace","fact","sources":[...]}]}
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
import { gradeNumFor } from "../../../lib/grade.js";
const key = requireServiceKey();
const T = new URL("../../../audits/wa-contradictions-rest", import.meta.url).pathname;
const file = process.argv[2], DRY = process.argv.includes("--dry");
const { patches } = JSON.parse(fs.readFileSync(file));
const FORBID_COLS = new Set(["id", "area_id", "name", "name_search", "discipline", "auto_generated", "classic", "lat", "lng", "gpx", "sort_order",
  // owned by the camping clean-up (show only camps on or near the route), never edited here
  "bivy"]);
// The app shows no sources anywhere: new text may not cite, link or name a beta site.
const CITE = /https?:|www\.|\.com\b|\.org\b|mountain ?project|summitpost|peakbagger|cascadeclimbers|nwhikers|alltrails|caltopo|wta\b|washington trails association|according to|per the |guidebook|beckey'?s? (?:guide|cascade alpine)|\bCAG\b|sources? (?:say|state|list|give|describe)|trip reports? (?:say|state|describe|put|give)|wikipedia/i;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const getAt = (o, p) => p.reduce((x, k) => (x == null ? undefined : x[k]), o);
function setAt(o, p, v) { if (!p.length) return v; const c = Array.isArray(o) ? [...o] : { ...o }; c[p[0]] = setAt(o == null ? undefined : o[p[0]], p.slice(1), v); return c; }
async function live(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  const j = await r.json(); if (!Array.isArray(j) || j.length !== 1) throw new Error(`read ${id}: ${JSON.stringify(j).slice(0, 200)}`); return j[0];
}
const byRoute = {};
for (const p of patches) (byRoute[p.id] ||= []).push(p);
const report = { applied: [], rejected: [], rollback: [] };
for (const [id, ps] of Object.entries(byRoute)) {
  const row = await live(id);
  const next = {};
  const cur = c => (c in next ? next[c] : row[c]);
  const okPs = [];
  for (const p of ps) {
    const why = (() => {
      if (FORBID_COLS.has(p.column) || !(p.column in row)) return `column ${p.column} not writable`;
      const path = p.path || [];
      const at = getAt(cur(p.column), path);
      const newText = p.op === "replace_text" ? p.replace : p.value;
      if (typeof newText === "string" && CITE.test(newText)) return `new text cites a source: ${newText.match(CITE)[0]}`;
      if (newText && typeof newText === "object" && CITE.test(JSON.stringify(newText))) return `new value cites a source`;
      if (p.column === "season" && typeof newText === "string" && newText.length > 40) return "season must stay a short window";
      if (p.op === "set") {
        if (!eq(at, p.expect)) return `expect mismatch at ${p.column}${JSON.stringify(path)}: live ${JSON.stringify(at)?.slice(0, 120)}`;
        next[p.column] = setAt(cur(p.column), path, p.value);
      } else if (p.op === "replace_text") {
        if (typeof at !== "string") return `not a string at ${p.column}${JSON.stringify(path)}`;
        const n = at.split(p.find).length - 1;
        if (n !== 1) return `find occurs ${n}x at ${p.column}${JSON.stringify(path)}`;
        next[p.column] = setAt(cur(p.column), path, at.replace(p.find, p.replace));
      } else return `unknown op ${p.op}`;
      return null;
    })();
    if (why) report.rejected.push({ ...p, why }); else okPs.push(p);
  }
  if (!Object.keys(next).length) continue;
  // grade_num follows grade, but only where the row was on the parser's scale to begin with
  if ("grade" in next && row.grade_num != null && gradeNumFor(row.grade, row.discipline) === row.grade_num) {
    const g = gradeNumFor(next.grade, row.discipline); if (g != null && g !== row.grade_num) next.grade_num = g;
  }
  report.rollback.push({ id, before: Object.fromEntries(Object.keys(next).map(c => [c, row[c]])) });
  if (!DRY) {
    await patchRow("routes", id, next);
    const after = await live(id);
    for (const c of Object.keys(next)) if (!eq(after[c], next[c])) throw new Error(`verify failed ${id}.${c}`);
  }
  report.applied.push(...okPs.map(p => ({ id, column: p.column, path: p.path, fact: p.fact })));
}
const stamp = Date.now();
fs.writeFileSync(`${T}/applied-${stamp}${DRY ? "-dry" : ""}.json`, JSON.stringify(report, null, 1));
console.log(`${DRY ? "DRY " : ""}applied ${report.applied.length} patches on ${report.rollback.length} routes; rejected ${report.rejected.length}`);
for (const r of report.rejected) console.log("  REJECT", r.id, r.column, r.why);
