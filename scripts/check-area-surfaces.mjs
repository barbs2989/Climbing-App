// check:area-surfaces — the two things a climber can do with an AREA must stay wired.
//
// WHY THIS EXISTS, and it is the same argument check:correction-readers records. Both surfaces
// shipped guarded only by a `scripts/oneoff/` probe, and NOTHING RUNS THOSE — that is precisely how
// `descentText` and `rack` each shipped a SECOND regression after the rule was written down. A
// comment cannot fail a build.
//
// Neither invariant is visible to any existing gate. `check:refs` sees bound identifiers and every
// identifier here is bound; `check:dead-props` sees props, and both are prop-less JSX; nothing else
// asks whether a value reaches a query or a gate reaches a render.
//
// Static — no browser, no DB — so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:area-surfaces";
appSources(ROOT, GUARD);

const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const browser = fs.readFileSync(path.join(ROOT, "lib/DbAreaBrowser.jsx"), "utf8");
const problems = [];
const ok = (m) => console.log(`  ok    ${m}`);

// Fail closed before any rule: a file that stopped parsing to something recognisable would make
// every check below vacuous, and "no findings" is what this prints when it is working.
if (app.length < 200000 || browser.length < 20000) {
  console.error(`\n${GUARD} FAILED — sources look truncated (ClimbMatch ${app.length}, DbAreaBrowser ${browser.length}).`);
  console.error("Nothing below was actually checked.\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------------------
// 1. AREA COMMENTS — the FETCH half, which is the half that hides.
//
// `commentTargets` returns [] when no route is selected, and browsing areas selects no route. So
// declaring `areaCommentTargets` is not enough: unless it is concatenated into the ids
// `useComments` actually fetches, the section renders an empty box for ever. With `comments` at 0
// rows that is indistinguishable from a feature nobody has used yet.
// ---------------------------------------------------------------------------------------
const DECL = /areaCommentTargets\s*=/;
if (!DECL.test(app)) {
  problems.push("`areaCommentTargets` is gone from ClimbMatch.jsx — area comments cannot be fetched, and the section below would render an empty box for ever.");
} else {
  ok("area comment targets are declared");
  // BALANCE the parens; `[^)]*` stops at the first `)`, which here is inside
  // `.concat(gpCommentTargets)` — so the first version of this rule read a truncated argument list
  // and reported a working fetch as broken. A regex cannot read nested structure
  // ([[check-token-boxes]] records the same lesson for nested HTML).
  const at = app.indexOf("useComments(");
  if (at < 0) {
    problems.push("no `useComments(` call found — ANCHOR LOST, so nothing here was verified.");
  } else {
    let d = 0, end = -1;
    for (let i = at + "useComments".length; i < app.length; i++) {
      if (app[i] === "(") d++;
      else if (app[i] === ")") { d--; if (d === 0) { end = i; break; } }
    }
    const args = end > 0 ? app.slice(at + "useComments(".length, end) : "";
    if (end < 0) {
      problems.push("could not balance the `useComments(...)` argument list — refusing to judge it.");
    } else if (!/areaCommentTargets/.test(args)) {
      problems.push(`useComments(${args.slice(0, 80)}) no longer includes areaCommentTargets — the area id is never requested, so the comments section can only ever be empty.`);
    } else {
      ok(`the area id reaches the useComments fetch (${args.slice(0, 60)}…)`);
    }
  }
}

// The RENDER half, gated on the same value so the two cannot disagree about when it applies.
if (!/areaCommentTargets\.length\s*\?/.test(app)) {
  problems.push("the area comments section is no longer gated on `areaCommentTargets.length` — it would render for areas whose id was never fetched, or not at all.");
} else {
  ok("the comments section is gated on the same value that is fetched");
}

// The exclusion, copied from the seed instance rather than invented: a country or a state is too
// broad to discuss. Asserted so a later edit cannot quietly widen it to the whole world.
if (!/areaCommentTargets[\s\S]{0,200}\["world","country","state"\]/.test(app)) {
  problems.push("area comments no longer exclude world/country/state — a continent is not a conversation.");
} else {
  ok("world/country/state are excluded from area comments");
}

// ---------------------------------------------------------------------------------------
// 2. DIRECTIONS TO AN AREA — present, and gated to somewhere you can actually park.
//
// Every area carries a coordinate, so an ungated link offers directions to a STATE CENTROID. That
// is not hypothetical: the first passing run of the probe printed "Directions to Colorado".
// ---------------------------------------------------------------------------------------
if (!/maps\/dir/.test(browser)) {
  problems.push("the area Directions link is gone from lib/DbAreaBrowser.jsx — a climber cannot navigate to a crag again (RouteDetail's links are trailhead-level, a different question).");
} else {
  ok("the area page offers directions");
  const gated = /\[\s*"crag",\s*"peak",\s*"wall"\s*\][\s\S]{0,120}maps\/dir|maps\/dir[\s\S]{0,400}/.test(browser)
    && /\[\s*"crag",\s*"peak",\s*"wall"\s*\]\.includes\(area\.area_type\)/.test(browser);
  if (!gated) {
    problems.push('the Directions link is no longer gated on area_type in ["crag","peak","wall"] — every area has a coordinate, so this offers to route a climber to a state or country centroid.');
  } else {
    ok("directions are limited to crag/peak/wall");
  }
  if (!/coords_approx[\s\S]{0,200}Directions link are rough/.test(browser)) {
    problems.push("the coords_approx caveat no longer mentions the Directions link — an approximate coordinate would be offered as a navigable destination with no warning.");
  } else {
    ok("the approximate-coordinate caveat covers the directions link");
  }
}

if (problems.length) {
  console.error(`\n${GUARD} FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error("  - " + p);
  console.error("\nBoth surfaces were dead in production until 2026-08-27 — gated on the seed-only");
  console.error("`selArea`, which deploy.yml's VITE_USE_DB=true never sets. They are easy to lose");
  console.error("again precisely because losing them breaks nothing that any other guard can see.\n");
  process.exit(1);
}
console.log(`\n${GUARD}: ok — a climber can discuss an area and navigate to a crag.`);
