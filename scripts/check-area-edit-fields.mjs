#!/usr/bin/env node
// check:area-edit-fields — the fields a climber can edit on an AREA are ONE list, read four ways.
//
// lib/areaFields.js names seven area columns a climber may suggest an edit to. The same seven
// appear as a check constraint on `contributions` (0304, contributions_area_field_ck), as the
// allow-list and the UPDATE targets inside apply_agreed_area_field(), as the rows the editor
// (lib/AreaSuggestFix.jsx) offers, and as the values the area page renders. If any of those
// drifts, the failure is silent in exactly the way the route page's `SS` allow-list failed before
// check:contrib-fields existed: a field the form offers that the database refuses (an insert
// error the climber reads as "broken"), or one the applier writes that no screen shows (written
// and read by nobody), or one the page shows that nobody can correct.
//
// The route editor's four guards (check:contrib-fields / contrib-shapes / consensus-clustering /
// contrib-summary) are anchored on RouteDetail's `const FIELDS=[{k:` and ClimbMatch's `SS`, so
// they cannot see this table at all. This guard carries their three rules for it:
//   - SHAPE: a months value clusters as a sorted, de-duplicated int array, so [6,5] and [5,6]
//     are one agreement (the SQL normaliser does the same);
//   - SUMMARY: every field's `cur(area)` is a string, never "[object Object]" — `cur` also decides
//     "was this field empty", which is what makes a fill go live at once;
//   - THRESHOLD: the JS threshold the banner prints ("N of 3") is the number the SQL applier tests.
//
// Static — a regex read of five files plus one import of lib/areaFields.js (pure data and pure
// functions, no side effects) — so it sits in `npm run build`. Injection suite:
// scripts/oneoff/inject-area-edit-fields-cases.mjs.
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
let fails = 0;
const fail = (m) => { console.log("  FAIL  " + m); fails++; };
const ok = (m) => console.log("  ok    " + m);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// ── 1. the JS table ──
const jsSrc = read("lib/areaFields.js");
const tableSrc = (jsSrc.match(/export const AREA_EDIT_FIELDS = \[([\s\S]*?)\n\];/) || [])[1];
if (!tableSrc) { fail("lib/areaFields.js: `export const AREA_EDIT_FIELDS = [` not found — ANCHOR LOST"); }
const jsKeys = tableSrc ? [...tableSrc.matchAll(/\{ k: "([a-z_]+)"/g)].map((m) => m[1]) : [];
if (jsKeys.length < 5) fail(`lib/areaFields.js lists ${jsKeys.length} editable fields — too few to be the real table`);
else ok(`${jsKeys.length} editable area fields in lib/areaFields.js: ${jsKeys.join(", ")}`);

// ── 2. the SQL constraint, the applier's allow-list, and the columns it writes ──
const migDir = path.join(ROOT, "supabase/migrations");
const migs = fs.readdirSync(migDir).filter((f) => /area_pages_season_edits_and_stats\.sql$/.test(f));
if (migs.length !== 1) fail(`expected one *area_pages_season_edits_and_stats.sql migration, found ${migs.length} — ANCHOR LOST`);
const sql = migs.length === 1 ? read("supabase/migrations/" + migs[0]) : "";
const listOf = (re, label) => {
  const m = sql.match(re);
  if (!m) { fail(`${migs[0] || "(migration)"}: ${label} not found — ANCHOR LOST`); return []; }
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
};
const ckKeys = listOf(/contributions_area_field_ck check \(\s*not \([^)]*\)\s*or field in \(([^)]*)\)/, "contributions_area_field_ck's field list");
const allowKeys = listOf(/if p_field not in \(([^)]*)\) then return; end if;/, "apply_agreed_area_field's allow-list");
const applierBody = (sql.match(/create or replace function public\.apply_agreed_area_field[\s\S]*?\n\$\$;/) || [""])[0];
const written = [...new Set([...applierBody.matchAll(/update areas set ([a-z_]+) =/g)].map((m) => m[1]))].sort();
if (!written.length) fail("apply_agreed_area_field writes no `update areas set <col> =` — ANCHOR LOST");

if (jsKeys.length && ckKeys.length) {
  if (same(jsKeys, ckKeys)) ok("the check constraint lists the same fields in the same order");
  else fail(`contributions_area_field_ck lists [${ckKeys.join(", ")}] but lib/areaFields.js lists [${jsKeys.join(", ")}]`);
}
if (jsKeys.length && allowKeys.length) {
  if (same(jsKeys, allowKeys)) ok("the applier's allow-list matches");
  else fail(`apply_agreed_area_field allows [${allowKeys.join(", ")}] but lib/areaFields.js lists [${jsKeys.join(", ")}]`);
}
if (jsKeys.length && written.length) {
  const want = [...jsKeys].sort();
  if (same(want, written)) ok("the applier writes exactly those columns");
  else fail(`apply_agreed_area_field writes [${written.join(", ")}]; the table is [${want.join(", ")}]`);
}
const sqlNeed = sql.match(/if not \(win\.n >= (\d+) or cur_empty\)/);
if (!sqlNeed) fail("apply_agreed_area_field's threshold test `win.n >= N or cur_empty` not found — ANCHOR LOST");

// ── 3. the editor offers the table, the page renders every field ──
const editor = read("lib/AreaSuggestFix.jsx");
if (/import \{[^}]*\bAREA_EDIT_FIELDS\b[^}]*\} from "\.\/areaFields"/.test(editor) && /AREA_EDIT_FIELDS\.map\(/.test(editor)) ok("lib/AreaSuggestFix.jsx renders its rows from AREA_EDIT_FIELDS");
else fail("lib/AreaSuggestFix.jsx does not render its rows from AREA_EDIT_FIELDS — a field could be editable in one place and not the other");
const page = read("lib/DbAreaBrowser.jsx") + "\n" + read("lib/AreaPageSections.jsx");
for (const k of jsKeys) {
  if (!new RegExp("area\\." + k + "\\b").test(page)) fail(`no screen reads area.${k} — the field would be editable and shown nowhere (lib/DbAreaBrowser.jsx, lib/AreaPageSections.jsx)`);
}
if (jsKeys.length && !fails) ok("every editable field reaches the area page");

// ── 4. shape, summary and threshold, by running the module ──
const mod = await import(pathToFileURL(path.join(ROOT, "lib/areaFields.js")).href);
const fields = mod.AREA_EDIT_FIELDS || [];
const fixture = { blurb: { oops: 1 }, approach: ["a", "b"], approach_min: "45", parking_note: null, rock: { r: 1 }, aspect: { x: 1 }, season_months: [12, 1, 2, 2] };
for (const f of fields) {
  let s;
  try { s = f.cur(fixture); } catch (e) { fail(`AREA_EDIT_FIELDS.${f.k}.cur threw on an odd value: ${e.message}`); continue; }
  if (typeof s !== "string") fail(`AREA_EDIT_FIELDS.${f.k}.cur returned a ${typeof s}, not a string`);
  else if (s.includes("[object")) fail(`AREA_EDIT_FIELDS.${f.k}.cur prints "${s}" — the climber reads [object Object]`);
}
if (mod.areaEditNorm([6, 5, 5]) !== "5,6") fail(`areaEditNorm([6,5,5]) = ${JSON.stringify(mod.areaEditNorm([6, 5, 5]))}, expected "5,6" — month sets would not cluster order-free`);
const three = mod.areaEditClusters([
  { kind: "field", field: "rock", value: "Limestone", contributor: "a", status: "pending", created_at: "1" },
  { kind: "field", field: "rock", value: " limestone ", contributor: "b", status: "pending", created_at: "2" },
  { kind: "field", field: "rock", value: "limestone.", contributor: "c", status: "pending", created_at: "3" },
  { kind: "field", field: "rock", value: "limestone", contributor: "c", status: "pending", created_at: "4" },
], "rock");
if (!(three.length === 1 && three[0].n === 3)) fail(`three agreeing climbers clustered as ${JSON.stringify(three.map((c) => c.n))}, expected one cluster of 3 (distinct contributors)`);
const months = mod.areaEditClusters([
  { kind: "field", field: "season_months", value: [5, 6], contributor: "a", status: "pending", created_at: "1" },
  { kind: "field", field: "season_months", value: [6, 5], contributor: "b", status: "pending", created_at: "2" },
], "season_months");
if (!(months.length === 1 && months[0].n === 2)) fail("[5,6] and [6,5] did not cluster as one season");
if (sqlNeed && Number(sqlNeed[1]) !== mod.AREA_EDIT_NEED) fail(`the banner prints "N of ${mod.AREA_EDIT_NEED}" but the applier tests win.n >= ${sqlNeed[1]}`);
if (!fails) ok("summary strings, order-free month clustering and the threshold agree with the SQL");

if (fails) { console.log(`\ncheck:area-edit-fields FAILED — ${fails} finding(s).`); process.exit(1); }
console.log("\ncheck:area-edit-fields: ok — one list of editable area fields, read the same way by the constraint, the applier, the editor and the page.");
