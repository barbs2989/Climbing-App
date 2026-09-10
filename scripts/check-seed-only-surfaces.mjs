#!/usr/bin/env node
// check:seed-only-surfaces — a component reachable ONLY through the `!USE_DB` branch renders
// for nobody, and must say so.
//
// The Climbs tab is `USE_DB ? <DbAreaBrowser/> : <AreaView/>`, and deploy.yml sets
// VITE_USE_DB: "true". So everything under the seed half is dead in production — correct
// code, fully wired, rendering in every local demo, and reaching no climber. That is the
// worst shape a defect can take here, because from every vantage point anyone actually
// checks it looks finished: the component exists, its props are passed, check:dead-props is
// green, check:refs is green, and it renders on a developer's machine.
//
// It has cost this repo real time, more than once and in both directions:
//   - #714 shipped a fire map gated on the seed-only `selArea`; it reached nobody until #731
//     read `dbAreaCtx || selArea`.
//   - An offline-honesty item sat on a recorded backlog for 19 days as "AreaView gates
//     children/routes behind !error" — real in the code, worthless to fix, because AreaView
//     is one of these.
//   - `QuickMatch` carries a hand-written comment saying it is unreachable. A comment is not
//     a guard, and the four components beside it carry no such note.
//   - Four browser attempts were spent trying to reach `AreaLatest` with a guard, on the
//     assumption that a walk could not find it. The walk was reporting reality.
//
// So the rule this enforces is the one that would have ended each of those early: BEFORE
// building on a Climbs-tab component, check which branch it lives on. A memory note saying
// that rots; this does not.
//
// WHAT IT ASSERTS
//   1. Every component reachable only through the seed branch is declared in SEED_ONLY with
//      a reason — so a NEW component built into the dead branch fails loudly rather than
//      shipping to nobody.
//   2. A declared name that is no longer seed-only FAILS as stale. That is what fires when
//      somebody DOES wire one to the DB path, and the repair is to delete the entry.
//
// REACHABILITY IS TRANSITIVE, AND A NON-TRANSITIVE VERSION GETS IT WRONG IN BOTH DIRECTIONS.
// Measured while writing this: a direct "is it rendered outside the region?" test called
// `SearchSplit` and `ViewToggle` dead — both are live, rendered from ClimbMatchCore and
// lib/DbAreaBrowser — the [[a-dead-seed-component-is-not-a-dead-feature]] trap, which has
// already caused one component to be rebuilt that already existed. The mirror is just as
// real: a component rendered only INSIDE a seed-only host is itself seed-only, and a scan
// that stops at one hop reports it as live. Both directions need the closure.
//
// The live closure is computed with the seed region's edges PRUNED, which is the whole
// mechanism — an edge from App into the seed branch is exactly the edge that does not exist
// in production.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Every name here is a claim that this component is unreachable in production AND that the
// claim has been checked. A reason naming what replaced it is the useful half: without it
// the next reader cannot tell "deliberately superseded" from "we forgot to wire this".
const SEED_ONLY = {
  AreaView:        "the seed Climbs-tab shell itself. Superseded by lib/DbAreaBrowser.jsx's AreaPage.",
  AreaBrowse:      "seed area picker. Superseded by DbAreaTreeRoots / StatePicker in DbAreaBrowser.",
  AreaCrags:       "seed child-area list. Superseded by DbAreaTree / DbAreaTreeNode.",
  RouteFinder:     "seed route finder. Superseded by RouteFinderPanel in DbAreaBrowser.",
  OverviewMap:     "seed 'Near me' map. Superseded by NearMePanel in DbAreaBrowser.",
  SuggestedClimbs: "seed suggestions. Superseded by DbSuggestedClimbs.",
  QuickMatch:      "unreachable by design; ClimbMatchCore.jsx carries the note. Not ported as-is.",
  // The three with NO live counterpart. Each was costed rather than assumed — reviving any of
  // them would ship a section that renders for nobody, which is the defect, not the fix.
  AreaLatest:      "no DB counterpart. Needs a climb_logs-by-subtree query that does not exist, " +
                   "and climb_logs holds 1 row catalog-wide (service key, 2026-08-27; re-measure "
                   + "with probe-latent-claims-anon-vs-service.mjs) — so the " +
                   "section would be empty for every area.",
  ClassicClimbs:   "no DB counterpart. `classic` is true on 56 of 205,543 routes (0.03%) and " +
                   "routes_in_subtree takes no `classic` parameter, so it needs a migration to " +
                   "render 0.03% of a catalog.",
  GettingThere:    "no DB counterpart, and does not need one: its only unique capability — a " +
                   "directions link to the crag — was ported into DbAreaBrowser. The rest showed " +
                   "an arbitrary representative route's `access` as the AREA's fact.",
  // ── found only once the TERNARY spelling of the seed branch was pruned. All three are the
  //    seed half of `USE_DB ? <Db…/> : <…/>` in ClimbMatch.jsx, so they were counted live for
  //    this guard's whole life while rendering for nobody.
  Guides:          "seed guide directory, the seed half of `USE_DB ? <DbGuides/> : <Guides/>`. " +
                   "Superseded by DbGuides in lib/DbGuides.jsx.",
  GuideDashboard:  "seed guide dashboard, the seed half of a USE_DB ternary. Superseded by " +
                   "DbGuideDashboard in lib/DbGuideDashboard.jsx.",
  GuideApply:      "seed guide application, the seed half of a USE_DB ternary. Superseded by " +
                   "DbGuideApply in lib/DbGuideApply.jsx.",
  // TRANSITIVELY dead: its only render site is inside Guides. Worth its own entry because the
  // reason differs — there is nothing to supersede it WITH.
  AvailCal:        "no DB counterpart, and could not have one. The live inquiry flow in " +
                   "lib/DbGuides.jsx takes dates as a FREE-TEXT field (placeholder \"Dates you're " +
                   "thinking of\") rather than from a guide's published availability, and no " +
                   "availability/calendar/slot/booking column exists anywhere in " +
                   "scripts/schema-snapshot.json — so a revived calendar would have nothing to " +
                   "draw and would render empty for every guide. Reached only from Guides.",
};

// Files that can render a component. lib/*.jsx matters: DbAreaBrowser is where the live
// half of the Climbs tab lives, so omitting it would report every DB counterpart as absent
// and every seed component as irreplaceable.
const FILES = ["main.jsx", "ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
  .concat(fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.jsx$/.test(f)).map((f) => "lib/" + f))
  .filter((f) => fs.existsSync(path.join(ROOT, f)));

const dead = (what) => {
  console.error(`\ncheck:seed-only-surfaces FAILED — ${what}.`);
  console.error("Nothing below was checked. This guard reports a class of UNREACHABLE code,");
  console.error("so a broken scan finds nothing and would otherwise read as a clean app.\n");
  process.exit(1);
};

const defs = new Map();      // component name -> file it is defined in
const edges = new Map();     // host -> Set(component names it renders)
const seedDirect = new Set();// rendered directly inside a seed-only region
// Spans, per file, that only execute when USE_DB is false. There are FOUR spellings and the
// guard used to prune one of them; see the header. A region is keyed by file because an offset
// means nothing without one.
const regionsByFile = new Map();
const addRegion = (f, node) => {
  if (!node) return;
  if (!regionsByFile.has(f)) regionsByFile.set(f, []);
  regionsByFile.get(f).push([node.start, node.end]);
};
let andCount = 0, ternaryCount = 0, ifCount = 0;
let edgeCount = 0;

const isComp = (n) => /^[A-Z]/.test(n);

// The host is the nearest enclosing function whose NAME is capitalised. Anything rendered
// outside such a function (module top level) is treated as its own root, so a render site
// that is not inside a component cannot be silently dropped.
function hostOf(p) {
  for (let q = p; q; q = q.parentPath) {
    const n = q.node;
    if (n.type === "FunctionDeclaration" && n.id && isComp(n.id.name)) return n.id.name;
    if ((n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression") &&
        q.parent && q.parent.type === "VariableDeclarator" &&
        q.parent.id.type === "Identifier" && isComp(q.parent.id.name)) return q.parent.id.name;
  }
  return null;
}

// ONE parse and ONE traverse per file. check:waypoint-placement records the cost of getting
// this wrong — it parsed 1.5 MB of JSX twice and paid 22s for it. The seed region is not known
// until the traversal of ClimbMatch.jsx has finished, so its render sites are held aside and
// classified afterwards rather than paying for a second walk.
const pending = [];

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { dead(`${f} did not parse (${String(e.message).slice(0, 120)})`); }

  traverse(ast, {
    // ── the four spellings of "this half only runs on the seed path" ──────────────────────
    LogicalExpression(p) {
      const n = p.node, l = n.left;
      if (n.operator === "&&" && l.type === "UnaryExpression" && l.operator === "!" &&
          l.argument.type === "Identifier" && l.argument.name === "USE_DB") {
        addRegion(f, n);
        if (f === "ClimbMatch.jsx") andCount++;
      }
    },
    ConditionalExpression(p) {
      const n = p.node, t = n.test;
      // USE_DB ? live : SEED   — the ALTERNATE is the dead half
      if (t.type === "Identifier" && t.name === "USE_DB") { addRegion(f, n.alternate); ternaryCount++; return; }
      // !USE_DB ? SEED : live  — the CONSEQUENT is
      if (t.type === "UnaryExpression" && t.operator === "!" &&
          t.argument.type === "Identifier" && t.argument.name === "USE_DB") {
        addRegion(f, n.consequent); ternaryCount++;
      }
    },
    IfStatement(p) {
      const n = p.node, t = n.test;
      if (t.type === "Identifier" && t.name === "USE_DB") { if (n.alternate) { addRegion(f, n.alternate); ifCount++; } return; }
      if (t.type === "UnaryExpression" && t.operator === "!" &&
          t.argument.type === "Identifier" && t.argument.name === "USE_DB") {
        addRegion(f, n.consequent); ifCount++;
      }
    },
    FunctionDeclaration(p) {
      const id = p.node.id;
      if (id && isComp(id.name) && !defs.has(id.name)) defs.set(id.name, f);
    },
    VariableDeclarator(p) {
      const id = p.node.id, init = p.node.init;
      if (id.type === "Identifier" && isComp(id.name) && init &&
          /Function|ArrowFunction|CallExpression/.test(init.type) && !defs.has(id.name)) defs.set(id.name, f);
    },
    JSXOpeningElement(p) {
      const nm = p.node.name;
      if (nm.type !== "JSXIdentifier" || !isComp(nm.name)) return;
      edgeCount++;
      const host = hostOf(p) || "(toplevel:" + f + ")";
      // EVERY file is held aside now, not just ClimbMatch.jsx: a seed branch is spelled the same
      // way wherever it lives, and a render site inside one is dead wherever it lives.
      pending.push([f, p.node.start, p.node.end, nm.name, host]);
    },
  });
}

// ── fail closed ─────────────────────────────────────────────────────────────────────────
// Each of these prints identically to a clean app, which is why every one is fatal.
if (!andCount) dead("could not find the `!USE_DB && …` branch in ClimbMatch.jsx — ANCHOR LOST");
if (andCount !== 1) dead(`expected exactly one \`!USE_DB && …\` branch in ClimbMatch.jsx, found ${andCount}. ` +
  "With more than one, the region this guard prunes is only part of the seed half");
// The ternary spelling is the one this guard was blind to for its whole life, and its floor
// matters for the same reason the `&&` anchor's does: with the recogniser broken, three dead
// components read as live and the run prints a clean sweep.
if (!ternaryCount) dead("found no `USE_DB ? … : …` conditional at all — the second spelling of the " +
  "seed branch stopped being recognised, and everything behind it would read as live");
if (defs.size < 100) dead(`only ${defs.size} components parsed across ${FILES.length} files — the scan broke`);
if (edgeCount < 100) dead(`only ${edgeCount} render sites found — the scan broke`);
// Classified now that the region is known. Pruning these edges IS the mechanism: an edge
// from App into the seed branch is exactly the edge production does not have.
for (const [f, start, end, name, host] of pending) {
  const regions = regionsByFile.get(f) || [];
  if (regions.some(([a, b]) => start >= a && end <= b)) { seedDirect.add(name); continue; }
  if (!edges.has(host)) edges.set(host, new Set());
  edges.get(host).add(name);
}

if (!seedDirect.size) dead("the seed branch renders no components at all — the region was located but is empty");

// ── closures ────────────────────────────────────────────────────────────────────────────
function close(seed) {
  const seen = new Set(), q = [...seed];
  while (q.length) {
    const c = q.pop();
    if (seen.has(c)) continue;
    seen.add(c);
    for (const t of edges.get(c) || []) if (!seen.has(t)) q.push(t);
  }
  return seen;
}
const roots = ["App", ...[...edges.keys()].filter((k) => k.startsWith("(toplevel:"))];
const live = close(roots);
const seed = close([...seedDirect]);
const seedOnly = [...seed].filter((n) => !live.has(n) && defs.has(n)).sort();

// ── verdict ─────────────────────────────────────────────────────────────────────────────
let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };

console.log(`walked ${FILES.length} files · ${defs.size} components · ${edgeCount} render sites`);
{
  let n = 0, chars = 0;
  for (const rs of regionsByFile.values()) for (const [a, b] of rs) { n++; chars += b - a; }
  console.log(`seed branches: ${n} region(s) across ${regionsByFile.size} file(s), ${chars} chars ` +
    `(${andCount} \`!USE_DB &&\`, ${ternaryCount} ternary, ${ifCount} if), ` +
    `rendering ${seedDirect.size} components directly\n`);
}

for (const name of seedOnly) {
  if (SEED_ONLY[name]) { console.log(`  ok    ${name.padEnd(16)} ${defs.get(name)}`); continue; }
  fail(`${name} (${defs.get(name)}) is reachable ONLY through a seed branch (\`!USE_DB && …\`, ` +
       `\`USE_DB ? … : HERE\`, or an if/else on USE_DB).\n` +
       `        It renders in a local demo and for no real climber — deploy.yml sets VITE_USE_DB=true.\n` +
       `        Either render it on the DB path too, or declare it in SEED_ONLY with the reason\n` +
       `        and what supersedes it.`);
}

for (const name of Object.keys(SEED_ONLY)) {
  if (seedOnly.includes(name)) continue;
  if (!defs.has(name)) {
    fail(`${name} is declared seed-only and no longer exists. Remove the SEED_ONLY entry.`);
  } else {
    fail(`${name} is declared seed-only but is now reachable on the live path.\n` +
         `        That is good news — remove the SEED_ONLY entry so the declaration stops\n` +
         `        claiming something untrue.`);
  }
}

if (failures) {
  console.log(`\ncheck:seed-only-surfaces FAILED — ${failures} problem(s).`);
  process.exit(1);
}
console.log(`\nok — ${seedOnly.length} seed-only component(s), each declared with a reason.`);
