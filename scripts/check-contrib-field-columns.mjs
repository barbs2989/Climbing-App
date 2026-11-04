#!/usr/bin/env node
// check:contrib-field-columns — the database's list of editable route fields is the FORM's list.
//
// Migration 0307 created `contribution_fields`: one static row per contribute-form key, naming
// the `routes` column that key edits. The confidence rule (route_field_level, 0308) reads it to
// test whether a field is EMPTY on a route, and the insert guard refuses an edit to a field it
// finds at 'high' — so a FIELDS key with no row is a field whose level can never be computed
// from the data (it reads as 'medium' forever), and a row naming a column `routes` does not have
// tests nothing and reads every route as empty, i.e. 'low', i.e. always editable. Both are
// silent: no error, a wrong level.
//
// The form keys live in RouteDetail.jsx (`const FIELDS=[{k:…`) and in ClimbMatch.jsx's `SS`
// allow-list (the keys other flows submit: discipline, gpxPts, …). The columns live in
// scripts/schema-snapshot.json. This asserts, statically:
//   1. every FIELDS key and every SS key has a `contribution_fields` row (any migration may add
//      rows; every `insert into contribution_fields` block is read, latest value wins);
//   2. every non-null column_name is a column of `routes` in the snapshot;
//   3. every row's key is offered by FIELDS or SS, or is declared in EXTRA with a reason — a
//      row for a field nobody can edit is bookkeeping that rots;
//   4. a row with column_name null is declared in NO_COLUMN with a reason.
// Fails closed: a short FIELDS list, a missing SS, a missing snapshot or zero rows is a broken
// scan, not a clean one.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources, readAppFile } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = appSources(ROOT, "check:contrib-field-columns");
for (const f of ["RouteDetail.jsx", "ClimbMatch.jsx"]) {
  if (!SOURCES.includes(f)) { console.error(`ANCHOR LOST: ${f} is not in the app source list — nothing below was checked.`); process.exit(1); }
}
// readAppFile: RouteDetail.jsx with SuggestFix (src/components since PR59) and the other moved components stitched back in.
const read = (f) => readAppFile(path.join(ROOT, f));
const dead = (m) => { console.error(`check:contrib-field-columns FAILED — ${m}. Nothing was checked.`); process.exit(1); };

// Rows for keys no form offers yet, each with the reason it is allowed to exist.
const EXTRA = {};
// Rows whose key has no routes column, each with the reason (the level is computed as 'low' when
// nothing is stored, which for these means: until the owner approves something).
const NO_COLUMN = {
  draws: "no routes column; the count is read out of gear prose",
  screws: "no routes column; the count is read out of gear prose",
  condWindow: "no routes column; a chip field read only from the contributions overlay",
  permitUrl: "no routes column; the link renders beside the permit prose from the overlay",
  topo: "topo lines live in the topos table, not a routes column",
};

// 1. The form's keys.
const rd = read("RouteDetail.jsx");
const fieldsStart = rd.indexOf("const FIELDS=[{k:");
if (fieldsStart < 0) dead("`const FIELDS=[{k:` not found in RouteDetail.jsx");
const fieldsLine = rd.slice(fieldsStart, rd.indexOf("\n", fieldsStart));
const FIELD_KEYS = [...new Set([...fieldsLine.matchAll(/\{k:"([A-Za-z0-9_]+)"/g)].map((m) => m[1]))];
if (FIELD_KEYS.length < 40) dead(`found only ${FIELD_KEYS.length} FIELDS keys`);
const cm = read("ClimbMatch.jsx");
const ssM = cm.match(/var SS=\{([\s\S]*?)\};/);
if (!ssM) dead("`var SS={` not found in ClimbMatch.jsx");
const SS_KEYS = [...new Set([...ssM[1].replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?:^|[,{\s])([A-Za-z0-9_]+)\s*:\s*1/g)].map((m) => m[1]))];
if (SS_KEYS.length < 40) dead(`found only ${SS_KEYS.length} SS keys`);
const OFFERED = new Set([...FIELD_KEYS, ...SS_KEYS]);

// 2. The rows, from every migration that inserts into contribution_fields (file order; a later
//    row for the same key replaces the earlier one, as `on conflict … do update` does).
const MIG = path.join(ROOT, "supabase", "migrations");
const files = fs.readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();
const ROWS = new Map();
for (const f of files) {
  const sql = fs.readFileSync(path.join(MIG, f), "utf8").replace(/^\s*--.*$/gm, "");
  const re = /insert\s+into\s+contribution_fields\s*\([^)]*\)\s*values\s*([\s\S]*?)(?:on\s+conflict|;)/gi;
  let m;
  while ((m = re.exec(sql))) {
    for (const row of m[1].matchAll(/\(\s*'([A-Za-z0-9_]+)'\s*,\s*(null|'([a-z0-9_]+)')\s*,/gi)) {
      ROWS.set(row[1], row[3] ? row[3] : null);
    }
  }
}
if (!ROWS.size) dead("no `insert into contribution_fields` rows found in supabase/migrations");

// 3. The columns.
const snapPath = path.join(ROOT, "scripts", "schema-snapshot.json");
if (!fs.existsSync(snapPath)) dead("scripts/schema-snapshot.json is missing");
const snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
const routeCols = new Set((snap.tables && snap.tables.routes) || []);
if (routeCols.size < 50) dead(`the snapshot lists only ${routeCols.size} routes columns`);

let bad = 0;
const fail = (m) => { console.error("  FAIL  " + m); bad++; };
for (const k of OFFERED) if (!ROWS.has(k)) fail(`form key "${k}" has no contribution_fields row — its confidence level can never be computed`);
for (const [k, col] of ROWS) {
  if (!OFFERED.has(k) && !EXTRA[k]) fail(`contribution_fields row "${k}" is offered by neither FIELDS nor SS and is not declared in EXTRA`);
  if (EXTRA[k] && OFFERED.has(k)) fail(`"${k}" is declared in EXTRA but the form offers it now — drop the declaration`);
  if (col == null) {
    if (!NO_COLUMN[k]) fail(`contribution_fields row "${k}" has no column and is not declared in NO_COLUMN`);
  } else {
    if (NO_COLUMN[k]) fail(`"${k}" is declared in NO_COLUMN but its row names "${col}" — drop the declaration`);
    if (!routeCols.has(col)) fail(`contribution_fields row "${k}" names routes.${col}, which the schema snapshot does not have`);
  }
}
for (const k of Object.keys(NO_COLUMN)) if (!ROWS.has(k)) fail(`NO_COLUMN declares "${k}" but no row exists — stale declaration`);
for (const k of Object.keys(EXTRA)) if (!ROWS.has(k)) fail(`EXTRA declares "${k}" but no row exists — stale declaration`);

if (bad) {
  console.error(`\ncheck:contrib-field-columns: ${bad} problem(s). ${FIELD_KEYS.length} FIELDS keys, ${SS_KEYS.length} SS keys, ${ROWS.size} rows.`);
  process.exit(1);
}
console.log(`check:contrib-field-columns: ok — ${ROWS.size} contribution_fields rows cover ${OFFERED.size} offered keys; every named column exists on routes.`);
