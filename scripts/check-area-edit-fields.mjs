#!/usr/bin/env node
// check:area-edit-fields — the fields a climber can edit on an AREA are ONE list, read five ways.
//
// lib/areaFields.js names seven area columns a climber may suggest an edit to. The same seven
// appear as a check constraint on `contributions` (0304, contributions_area_field_ck), as the
// allow-list and the UPDATE targets of apply_approved_area_field() and as the area branch of
// approve_field_contribution() (0319), as the rows the editor (lib/AreaSuggestFix.jsx) offers, and
// as the values the area page renders. If any of those drifts, the failure is silent in exactly the
// way the route page's `SS` allow-list failed before check:contrib-fields existed: a field the form
// offers that the database refuses (an insert error the climber reads as "broken"), one the owner
// can approve that no applier writes (approved in the ledger, absent from the page), or one the page
// shows that nobody can correct.
//
// The route editor's guards (check:contrib-fields / contrib-shapes / contrib-summary) are anchored
// on RouteDetail's `const FIELDS=[{k:` and ClimbMatch's `SS`, so they cannot see this table at all.
// This guard carries their SUMMARY rule for it: every field's `cur(area)` is a string, never
// "[object Object]" — `cur` is what the sheet shows as "Now:" and what the owner's queue shows as
// ON THE PAGE NOW. (Its first run caught the `text()` helper printing an object.)
//
// Static — a regex read of six files plus one import of lib/areaFields.js (pure data and pure
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

// ── 2. the SQL: constraint (0304), applier allow-list + UPDATE targets, approve branch (0319) ──
const migDir = path.join(ROOT, "supabase/migrations");
const one = (re, label) => { const m = fs.readdirSync(migDir).filter((f) => re.test(f)); if (m.length !== 1) { fail(`expected one ${label} migration, found ${m.length} — ANCHOR LOST`); return ""; } return read("supabase/migrations/" + m[0]); };
const sql04 = one(/area_pages_season_edits_and_stats\.sql$/, "area_pages_season_edits_and_stats");
const sql18 = one(/area_edits_are_held_for_review\.sql$/, "area_edits_are_held_for_review");
// A later migration may re-create any of the three (0378 added the parking pin to all of them), and the
// LAST one in filename order is what a replay leaves standing, so each anchor is read from the newest
// migration that defines it — not pinned to 0304/0319, which would keep passing on a list production
// no longer runs.
const allMigs = fs.readdirSync(migDir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
const newest = (re, fallback) => { for (let i = allMigs.length - 1; i >= 0; i--) { const src = read("supabase/migrations/" + allMigs[i]); if (re.test(src)) return src; } return fallback; };
const sqlCk = newest(/add constraint contributions_area_field_ck/, sql04);
const sqlApply = newest(/create or replace function public\.apply_approved_area_field/, sql18);
const sqlApprove = newest(/create or replace function approve_field_contribution/, sql18);
const listOf = (src, re, label) => {
  const m = src.match(re);
  if (!m) { fail(`${label} not found — ANCHOR LOST`); return []; }
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
};
const ckKeys = listOf(sqlCk, /contributions_area_field_ck check \(\s*not \([^)]*\)\s*or field in \(([^)]*)\)/, "contributions_area_field_ck's field list (0304)");
const allowKeys = listOf(sqlApply, /if p_field not in \(([^)]*)\) then return; end if;/, "apply_approved_area_field's allow-list (0319)");
const approveKeys = listOf(sqlApprove, /if c\.field not in \(([^)]*)\) then raise exception 'unknown area field/, "approve_field_contribution's area-field list (0319)");
const applierBody = (sqlApply.match(/create or replace function public\.apply_approved_area_field[\s\S]*?\n\$\$;/) || [""])[0];
const written = [...new Set([...applierBody.matchAll(/update areas set ([a-z_]+) =/g)].map((m) => m[1]))].sort();
// One field may write more than one column: the parking pin (0378) is parking_lat + parking_lng + parking_name in one UPDATE.
const MULTI = { parking_pin: ["parking_lat", "parking_lng", "parking_name"] };
for (const [k, cols] of Object.entries(MULTI)) {
  const upd = (applierBody.match(new RegExp("update areas set " + cols[0] + " = [^;]*;")) || [""])[0];
  if (!jsKeys.includes(k)) continue;
  for (const c of cols) if (!new RegExp("\\b" + c + " = ").test(upd)) fail(`apply_approved_area_field's ${k} UPDATE does not set ${c}`);
}
if (!written.length) fail("apply_approved_area_field writes no `update areas set <col> =` — ANCHOR LOST");
if (!/after update of status on public\.contributions[\s\S]{0,80}when \(new\.status = 'approved'\)/.test(sql18)) fail("0319: the applier's trigger is not `after update of status … when (new.status = 'approved')` — an approval would not reach the area column");
if (/after insert on public\.contributions[\s\S]{0,120}trg_apply_agreed_area_field/.test(sql18)) fail("0319 re-creates the insert-time applier trigger — area edits would land without the owner");

const cmp = (keys, label) => { if (!jsKeys.length || !keys.length) return; if (same(jsKeys, keys)) ok(label + " lists the same fields in the same order"); else fail(`${label} lists [${keys.join(", ")}] but lib/areaFields.js lists [${jsKeys.join(", ")}]`); };
cmp(ckKeys, "contributions_area_field_ck");
cmp(allowKeys, "apply_approved_area_field's allow-list");
cmp(approveKeys, "approve_field_contribution's area branch");
if (jsKeys.length && written.length) {
  const want = [...new Set(jsKeys.flatMap((k) => (MULTI[k] ? [MULTI[k][0]] : [k])))].sort();
  if (same(want, written)) ok("the applier writes exactly those columns");
  else fail(`apply_approved_area_field writes [${written.join(", ")}]; the table is [${want.join(", ")}]`);
}

// ── 3. the editor offers the table, the page renders every field, the queue labels from it ──
const editor = read("lib/AreaSuggestFix.jsx");
if (/import \{[^}]*\bAREA_EDIT_FIELDS\b[^}]*\} from "\.\/areaFields"/.test(editor) && /AREA_EDIT_FIELDS\.map\(/.test(editor)) ok("lib/AreaSuggestFix.jsx renders its rows from AREA_EDIT_FIELDS");
else fail("lib/AreaSuggestFix.jsx does not render its rows from AREA_EDIT_FIELDS — a field could be editable in one place and not the other");
const page = read("lib/DbAreaBrowser.jsx") + "\n" + read("lib/AreaPageSections.jsx");
for (const k of jsKeys) {
  const col = MULTI[k] ? MULTI[k][0] : k;
  if (!new RegExp("area\\." + col + "\\b").test(page)) fail(`no screen reads area.${k} — the field would be editable and shown nowhere (lib/DbAreaBrowser.jsx, lib/AreaPageSections.jsx)`);
}
const queue = read("lib/RouteQualityQueues.jsx");
if (!/import \{[^}]*\bAREA_EDIT_FIELDS\b[^}]*\} from "\.\/areaFields"/.test(queue)) fail("lib/RouteQualityQueues.jsx does not label area rows from AREA_EDIT_FIELDS — the owner would see raw column names");
if (!fails) ok("every editable field reaches the area page, and the owner's queue labels it from the same table");

// ── 4. summary rule, by running the module ──
const mod = await import(pathToFileURL(path.join(ROOT, "lib/areaFields.js")).href);
const fields = mod.AREA_EDIT_FIELDS || [];
const fixture = { blurb: { oops: 1 }, approach: ["a", "b"], approach_min: "45", parking_note: null, parking_lat: { la: 1 }, parking_lng: "-121.5", parking_name: ["x"], rock: { r: 1 }, aspect: { x: 1 }, season_months: [12, 1, 2, 2] };
for (const f of fields) {
  let s;
  try { s = f.cur(fixture); } catch (e) { fail(`AREA_EDIT_FIELDS.${f.k}.cur threw on an odd value: ${e.message}`); continue; }
  if (typeof s !== "string") fail(`AREA_EDIT_FIELDS.${f.k}.cur returned a ${typeof s}, not a string`);
  else if (s.includes("[object")) fail(`AREA_EDIT_FIELDS.${f.k}.cur prints "${s}" — the climber reads [object Object]`);
  // A structured value (the parking pin) is shown through `fmt` in the sheet's "Awaiting review" and the owner's PROPOSED.
  if (f.type === "pin") {
    if (typeof f.fmt !== "function") fail(`AREA_EDIT_FIELDS.${f.k} is a pin with no fmt() — its held value would print as [object Object]`);
    else { const t = f.fmt({ lat: 47.1, lng: -121.2, name: "Main lot" }); if (typeof t !== "string" || !/47\.1/.test(t) || t.includes("[object")) fail(`AREA_EDIT_FIELDS.${f.k}.fmt prints "${t}" for a real pin`); if (f.fmt({ oops: 1 }) !== "") fail(`AREA_EDIT_FIELDS.${f.k}.fmt prints something for a value with no coordinate`); }
  }
}
if (typeof mod.myPendingAreaEdits !== "function") fail("lib/areaFields.js no longer exports myPendingAreaEdits — the page cannot show a climber their own held edit");
else {
  const mine = mod.myPendingAreaEdits([{ kind: "field", field: "rock", status: "pending", contributor: "a" }, { kind: "field", field: "rock", status: "pending", contributor: "b" }, { kind: "field", field: "rock", status: "approved", contributor: "a" }], "a");
  if (mine.length !== 1) fail(`myPendingAreaEdits returned ${mine.length} rows for one climber's single pending edit — another climber's suggestion or an approved row would show as "awaiting review"`);
}
if (!fails) ok("summary strings are strings, and a climber sees only their own held edits");

if (fails) { console.log(`\ncheck:area-edit-fields FAILED — ${fails} finding(s).`); process.exit(1); }
console.log("\ncheck:area-edit-fields: ok — one list of editable area fields, read the same way by the constraint, the applier, the owner's approve, the editor, the page and the queue.");
