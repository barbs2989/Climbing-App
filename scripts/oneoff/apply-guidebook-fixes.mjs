// Applies researched corrections to a route's HEADLINE facts (name, grades, commitment, pitches,
// length, first ascent, aspect) from the 2026-10-01 guidebook audit.
//
//   node scripts/oneoff/apply-guidebook-fixes.mjs fixes.json          # dry run
//   node scripts/oneoff/apply-guidebook-fixes.mjs fixes.json --apply  # write, with a rollback file
//
// fixes.json: [{ id, field, from, to, why }]. Compare-and-set: a field whose live value is no longer
// `from` is REFUSED, never overwritten. `to: null` clears a value shown to be some other quantity
// (a peak's prominence copied into length_m) — clearing is allowed, inventing is not.
// A changed `grade` re-derives grade_num through lib/grade.js (the ONE parser, check:grade-parser),
// and fills mixed_grade_num / ice_grade_num only where they are empty, as the MP importer does.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFor, gradeNumFrom } from "../../lib/grade.js";

const FIELDS = new Set(["name", "grade", "rock_grade", "ice_grade", "alpine_grade", "commitment", "pitches", "length_m", "fa", "aspect"]);
const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(file, "utf8"));
const byId = new Map();
for (const f of fixes) {
  if (!FIELDS.has(f.field)) throw new Error(`${f.id}: field ${f.field} is not a headline fact this script may write`);
  (byId.get(f.id) || byId.set(f.id, []).get(f.id)).push(f);
}
const same = (a, b) => (a ?? null) === (b ?? null) || String(a ?? "") === String(b ?? "");
const rbFile = `scripts/rollback-guidebook-fixes-${Date.now()}.json`;
const rollback = [];
let ok = 0, refused = 0;
for (const [id, fs_] of byId) {
  const sel = "id,discipline,grade_num,ice_grade_num,mixed_grade_num," + [...FIELDS].join(",");
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=${sel}`, { headers: headers(key) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`REFUSED ${id}: not exactly one row`); refused++; continue; }
  const row = rows[0];
  const stale = fs_.filter((f) => !same(row[f.field], f.from));
  if (stale.length) { for (const f of stale) console.log(`REFUSED ${id}.${f.field}: live ${JSON.stringify(row[f.field])} is not ${JSON.stringify(f.from)}`); refused++; continue; }
  const body = {};
  for (const f of fs_) body[f.field] = f.to;
  if ("grade" in body) {
    body.grade_num = gradeNumFor(body.grade, row.discipline);
    const m = String(body.grade || "").match(/\bM\d+[+-]?/), wi = String(body.grade || "").match(/\b[WA]I\s?\d[+-]?/);
    if (m && row.mixed_grade_num == null) body.mixed_grade_num = gradeNumFrom(m[0], "m");
    if (wi && row.ice_grade_num == null) body.ice_grade_num = gradeNumFrom(wi[0], "wi");
  }
  console.log(`\n${id}`); for (const [k, v] of Object.entries(body)) console.log(`  ${k}: ${JSON.stringify(row[k])} -> ${JSON.stringify(v)}`);
  if (APPLY) {
    rollback.push({ id, before: Object.fromEntries(Object.keys(body).map((k) => [k, row[k]])) });
    fs.writeFileSync(rbFile, JSON.stringify(rollback, null, 1));
    await patchRow("routes", id, body, { filter: "select=id" });
    const back = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=${Object.keys(body).join(",")}`, { headers: headers(key) })).json())[0];
    for (const [k, v] of Object.entries(body)) if (!same(back[k], v)) throw new Error(`${id}.${k}: re-read ${JSON.stringify(back[k])} is not ${JSON.stringify(v)}`);
  }
  ok++;
}
if (APPLY && rollback.length) console.log(`\nrollback: ${rbFile}`);
console.log(`\n${APPLY ? "WRITTEN and re-read" : "DRY RUN"}: ${ok} routes ok, ${refused} refused`);
if (refused) process.exitCode = 1;
