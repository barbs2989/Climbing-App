// Does every `route.X` the app reads actually exist?
//
// dbRouteToCamel opens `return { ...r, ... }` -- it SPREADS the raw row and then adds camelCase
// aliases -- so the app can read `route.anything`. A misspelled property is valid JS, is bound
// (it is a member expression, not an identifier), renders as nothing, and:
//   - check:refs cannot see it: nothing is unbound.
//   - check:schema asks only whether lib/db.js names a column the DB lacks.
//   - check:field-renders asks the OPPOSITE direction: does a column reach a screen.
//   - check:ui would catch a literal "undefined" on screen, but only on a walked screen and only
//     if the value is interpolated rather than used in a test.
//
// So a typo'd read is invisible to the whole suite. This asks how many there are.
//
// Report-only, and deliberately WIDE: the union it checks against is every routes column, every
// alias dbRouteToCamel adds, and every key any seed ROUTE carries. Anything outside that union is
// a candidate to READ, not a defect -- a property can be attached at runtime by enrichment or by
// a contribution merge, and this cannot see that.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP_FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// 1. Real columns, from the committed schema snapshot.
const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/schema-snapshot.json"), "utf8"));
const routesTable = snap.routes || (snap.tables && snap.tables.routes) || null;
const columns = new Set(
  Array.isArray(routesTable) ? routesTable
  : routesTable && routesTable.columns ? routesTable.columns
  : routesTable ? Object.keys(routesTable) : []
);
if (columns.size < 40) {
  console.error(`only ${columns.size} routes column(s) read from the snapshot — refusing to report`);
  console.error("Snapshot shape may have changed; fix the reader before believing any count.");
  process.exit(1);
}

// 2. Aliases dbRouteToCamel adds on top of the spread.
const db = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const mapStart = db.indexOf("export function dbRouteToCamel");
if (mapStart < 0) { console.error("ANCHOR LOST — dbRouteToCamel"); process.exit(1); }
let d = 0, end = mapStart;
for (let i = db.indexOf("{", mapStart); i < db.length; i++) {
  if (db[i] === "{") d++;
  else if (db[i] === "}") { d--; if (!d) { end = i; break; } }
}
const mapper = db.slice(mapStart, end + 1);
const aliases = new Set([...mapper.matchAll(/(?:^|[{,\s])([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]));

// 3. Every key any seed ROUTE carries (seed routes are read by the same components).
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const seedKeys = new Set();
{
  const i = core.indexOf("const ROUTES=[");
  if (i >= 0) {
    let dd = 0, e = i;
    for (let j = core.indexOf("[", i); j < core.length; j++) {
      if (core[j] === "[") dd++;
      else if (core[j] === "]") { dd--; if (!dd) { e = j; break; } }
    }
    for (const m of core.slice(i, e).matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) seedKeys.add(m[1]);
  }
}

/* 3b. CONTRIBUTABLE FIELDS, which need NO column — the input the first version was missing, and
   without it the run reported five correct reads as candidates. `SS` is the merge allow-list, and
   both merge paths apply a contributed value onto the route object CLIENT-SIDE, so
   draws/screws/ropeLen/anchorType/condWindow are real properties of a route a climber has
   corrected even though `routes` has no such column. CLAUDE.md says this outright — "absent from
   routes does NOT mean unreachable; check SS and the overlay" — and the reads themselves carry a
   comment saying so. A union that omits a whole legitimate source does not under-report; it
   manufactures findings. */
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const ssAt = app.indexOf("var SS={");
if (ssAt < 0) { console.error("ANCHOR LOST — `var SS={` in ClimbMatch.jsx"); process.exit(1); }
let sd = 0, ssEnd = ssAt;
for (let i = app.indexOf("{", ssAt); i < app.length; i++) {
  if (app[i] === "{") sd++;
  else if (app[i] === "}") { sd--; if (!sd) { ssEnd = i; break; } }
}
const ssKeys = new Set([...app.slice(ssAt, ssEnd).matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[1]));
if (ssKeys.size < 10) { console.error(`only ${ssKeys.size} SS key(s) parsed — refusing`); process.exit(1); }

const known = new Set([...columns, ...aliases, ...seedKeys, ...ssKeys]);
console.log(`union: ${columns.size} columns + ${aliases.size} aliases + ${seedKeys.size} seed keys `
  + `+ ${ssKeys.size} contributable = ${known.size} known names\n`);

// 4. Every `route.X` / `r.X` read where the receiver is plainly a route.
const RECEIVERS = new Set(["route", "rt", "_route"]);
const hits = new Map();
for (const rel of APP_FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    MemberExpression(p) {
      const o = p.node.object, pr = p.node.property;
      if (!o || o.type !== "Identifier" || !RECEIVERS.has(o.name)) return;
      if (p.node.computed || !pr || pr.type !== "Identifier") return;
      if (known.has(pr.name)) return;
      const k = `${o.name}.${pr.name}`;
      if (!hits.has(k)) hits.set(k, []);
      hits.get(k).push(`${rel}:${p.node.loc.start.line}`);
    },
  });
}

if (!hits.size) { console.log("Every route.* read resolves to a known column, alias or seed key."); process.exit(0); }
console.log(`${hits.size} property name(s) read but not in the union — READ each, do not count them:\n`);
for (const [k, where] of [...hits.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${k.padEnd(34)} ${where.length}x   ${where.slice(0, 3).join(", ")}`);
}
