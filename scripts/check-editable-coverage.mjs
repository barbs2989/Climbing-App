#!/usr/bin/env node
// check:editable-coverage — every `routes` column a climber can SEE, a climber can CORRECT, or the
// reason they cannot is written down.
//
// The owner's rule (2026-10-15): everything on a route page is editable, through the edit sheet,
// subject to the confidence lock. The page renders ~90 columns; the sheet offered ~65 keys, and the
// gap was silent — a column could render for years with no pencil reaching it (ROUTE FACTS' first
// free ascent, the sun note, pro tips…). check:field-renders asks the opposite question (does a
// column reach a screen?); this one asks whether the climber can answer back.
//
// Inputs, all static:
//   * the `routes` columns from scripts/schema-snapshot.json;
//   * the editable columns: every `column_name` in `contribution_fields`, read from the migrations'
//     insert blocks (check:contrib-field-columns keeps that table equal to the form's FIELDS + SS);
//   * NEVER: columns deliberately without an editor, each with a reason a reviewer can check.
// A column in neither set FAILS — a new column must get an editor or a reason. A NEVER entry for a
// column that no longer exists, or that has since gained an editor, FAILS as stale bookkeeping.
// Fails closed on a short snapshot or no rows.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dead = (m) => { console.error(`check:editable-coverage FAILED — ${m}. Nothing was checked.`); process.exit(1); };

const NEVER = {
  id: "identity — minted by approve_new_route / the import",
  area_id: "identity — refiling a route under another area is the owner's job (catalog_find_area, 0216)",
  lat: "a coordinate: pins are contributed as waypoints / start location, never typed as a route field",
  lng: "a coordinate: pins are contributed as waypoints / start location, never typed as a route field",
  name_search: "derived from name by trigger",
  sort_order: "list order within a wall, set by the import",
  grade_num: "derived from grade by picker_grade_num on approval (0309)",
  grade_system: "derived from grade by picker_grade_num on approval (0309)",
  ice_grade_num: "derived from the grade columns",
  mixed_grade_num: "derived from the grade columns",
  aid_grade_num: "derived from the grade columns",
  snow_grade_num: "derived from the grade columns",
  disciplines: "derived from discipline (0280 trigger)",
  verif: "never climber-writable (docs/guards/contributions-and-logbook.md)",
  corrections: "never climber-writable (docs/guards/contributions-and-logbook.md)",
  data_quality: "never climber-writable (docs/guards/contributions-and-logbook.md)",
  gear_confidence: "never climber-writable (docs/guards/contributions-and-logbook.md)",
  auto_generated: "bookkeeping; read by nothing on screen",
  gps_contributor_name: "bookkeeping",
  access_checked_at: "stamped by the road/access audits, not typed",
  stars: "computed by triggers from route_ratings and climb_logs (0294)",
  classic: "Fifty Classics membership — owner-curated list",
  lists: "tick-list membership — owner-curated (audit:list-coverage)",
  difficulty: "the DIFFICULTY BREAKDOWN is climbers' own 1–5 ratings now; the owner said not to rewire the column",
  description: "overview is the editable description; description is the import's copy of it",
  descent: "descent_text is the editable descent; descent is the enrichment stub descentBeta() falls back to",
  detailed_rack: "rack prose from enrichment; the RACK editor writes rack",
  pro_needs: "rack prose from enrichment; the RACK editor writes rack",
  sling_rack: "its own {cams,nuts,…} shape; the RACK editor covers the rack",
  assumed_gear: "pipeline bookkeeping, read by nothing on screen",
  gear_bucket: "pipeline bookkeeping, read by nothing on screen",
  elev_pts: "derived from the gpx track",
  guide_stars: "the guidebook's own rating; a climber's rating is route_ratings",
  classic_score: "a sort key for the classics lists (0393), written by flag-classics.mjs; never printed, a climber's rating is route_ratings",
  bail: "removed from the page 2026-10-07",
  turnaround: "removed from the page 2026-10-07",
};

const snapPath = path.join(ROOT, "scripts", "schema-snapshot.json");
if (!fs.existsSync(snapPath)) dead("scripts/schema-snapshot.json is missing");
const cols = (JSON.parse(fs.readFileSync(snapPath, "utf8")).tables || {}).routes || [];
if (cols.length < 50) dead(`the snapshot lists only ${cols.length} routes columns`);

const MIG = path.join(ROOT, "supabase", "migrations");
const editable = new Map();
for (const f of fs.readdirSync(MIG).filter((x) => x.endsWith(".sql")).sort()) {
  const sql = fs.readFileSync(path.join(MIG, f), "utf8").replace(/^\s*--.*$/gm, "");
  const re = /insert\s+into\s+contribution_fields\s*\([^)]*\)\s*values\s*([\s\S]*?)(?:on\s+conflict|;)/gi;
  let m;
  while ((m = re.exec(sql))) for (const row of m[1].matchAll(/\(\s*'([A-Za-z0-9_]+)'\s*,\s*(null|'([a-z0-9_]+)')\s*,/gi)) if (row[3]) editable.set(row[3], row[1]);
}
if (!editable.size) dead("no `insert into contribution_fields` rows found in supabase/migrations");

let bad = 0;
const fail = (m) => { console.error("  FAIL  " + m); bad++; };
for (const c of cols) {
  if (editable.has(c)) { if (NEVER[c]) fail(`routes.${c} is in NEVER but has an editor (${editable.get(c)}) — drop the declaration`); continue; }
  if (!NEVER[c]) fail(`routes.${c} renders with no editor and no NEVER reason — give it a FIELDS key + contribution_fields row, or a reason here`);
}
for (const c of Object.keys(NEVER)) if (!cols.includes(c)) fail(`NEVER declares routes.${c}, which the snapshot does not have — stale declaration`);
if (bad) { console.error(`\ncheck:editable-coverage: ${bad} problem(s) over ${cols.length} columns (${editable.size} editable, ${Object.keys(NEVER).length} declared).`); process.exit(1); }
console.log(`check:editable-coverage: ok — ${cols.length} routes columns: ${editable.size} editable, ${Object.keys(NEVER).length} declared with a reason, none unaccounted for.`);
