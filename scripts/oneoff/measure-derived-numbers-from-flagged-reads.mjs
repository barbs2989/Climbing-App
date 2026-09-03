// Is the trust score the only DERIVED number an outage silently lowers?
//
// measure-ungated-flagged-counts.mjs walks `<list>.length` in JSX, so it sees a count and nothing
// else. vScore(meLive) is invisible to it: `logs` is aliased into meLive, meLive is handed to a
// function, and a number comes out. That number has NO TELL -- a count of 0 is visibly a count, a
// trust score of 32 looks like a trust score -- so the class is worth sizing rather than assuming
// the one instance found by hand is the only one.
//
// METHOD: taint the flagged lists, propagate through `const X = <expr using a tainted binding>` to
// a fixpoint, then report JSX-rendered CALLS taking a tainted argument. Calls, not every use:
// `logs` appears everywhere and a detector reporting all of it is one nobody reads.
//
// TAINT IS KEYED ON THE BINDING, NEVER THE NAME, and the first version was keyed on the name --
// which reported 901 findings across 321 callees and was pure noise. A single `const c =
// crews.find(...)` in one scope poisoned every `c` in the file, and this codebase names loop
// parameters r/c/on/st/txt/id hundreds of times over. Same class as every proximity-vs-ancestry
// failure recorded in CLAUDE.md, one level up: a NAME is not an identity.
//
// IT STILL OVER-REPORTS and is a reading list, not a defect count -- a call on a tainted value is
// only a defect when what it renders is a NUMBER presented as a fact. A list, a label, a control
// or a handler is not.
//
// THE HIGHER-STAKES HALF WAS MEASURED SEPARATELY AND IS A CLASS OF TWO, BOTH FIXED. This scan
// reports calls that RENDER, and groupTrustShortfall was caught only because its call sits inside
// an onClick -- i.e. inside a JSXExpressionContainer. "An action REFUSED on a value derived from a
// failed read" is worse than a wrong number, and a handler declared outside JSX would be invisible
// here. Asked directly (a call on a tainted value, assigned to a name, whose result gates an early
// return): 2 such calls exist in the whole app and both are groupTrustShortfall, both repaired. A
// detector for a class of two that is already closed is the thing this repo keeps refusing to
// build, so the measurement is recorded and the scan is not.
//
// AND IT UNDER-REPORTS IN ONE KNOWN WAY, stated so the denominator is not over-trusted: taint
// propagates through `const X = <expr>` and NOT through MUTATION of a module global. `ME.objectiveIds
// = wishlist` is exactly that, so `compat(ME, c)` -- which scores shared objectives -- is invisible
// here. Measured separately and it is a class of ZERO for real data: every DB-derived climber is
// built with `objectiveIds: []` hardcoded, so the term is 0 whether or not the read failed. `ME` is
// the one value in this app written that way, and CLAUDE.md already flags that assignment as a
// legacy sync hack not to extend, so the blind spot is bounded -- but it is real.
import fs from "fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const SEEDS = {
  logs: "logsUnavailable", wishlist: "objectivesUnavailable", connections: "connectionsUnavailable",
  crews: "crewsUnavailable", userLists: "listsUnavailable", blocked: "blockedUnavailable",
  catches: "catchesUnavailable", vouchesIn: "vouchesInUnavailable", comments: "commentsUnavailable",
  dbReports: "reportsUnavailable", joinedGroups: "groupsUnavailable",
  crewReqIn: "crewInvitesUnavailable", savedSearches: "searchesUnavailable",
};
const FLAGS = new Set(Object.values(SEEDS));
// Handlers and setters take a tainted value to DO something with it, not to render a number.
const NOT_A_NUMBER = /^(set[A-Z]|on[A-Z]|open|notify|add|edit|reply|remove|delete|save|submit|toggle|show|handle)/;

let calls = 0, seeded = 0;
const rows = [];
for (const file of ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]) {
  const src = fs.readFileSync(file, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });

  // ---- taint, keyed on the BINDING identifier node, to a fixpoint ------------------------------
  const taint = new Map();                       // binding.identifier node -> flag
  const declPaths = [];
  traverse(ast, {
    VariableDeclarator(p) {
      if (p.node.id.type !== "Identifier") return;
      const b = p.scope.getBinding(p.node.id.name);
      if (!b) return;
      const flag = SEEDS[p.node.id.name];
      if (flag) { taint.set(b.identifier, flag); seeded++; }
      declPaths.push(p);
    },
  });
  for (let pass = 0; pass < 8; pass++) {
    let grew = false;
    for (const p of declPaths) {
      const b = p.scope.getBinding(p.node.id.name);
      if (!b || taint.has(b.identifier) || !p.node.init) continue;
      let flag = null;
      p.get("init").traverse({
        Identifier(q) {
          if (flag || !q.isReferencedIdentifier()) return;
          const rb = q.scope.getBinding(q.node.name);
          if (rb && taint.has(rb.identifier)) flag = taint.get(rb.identifier);
        },
      });
      if (flag) { taint.set(b.identifier, flag); grew = true; }
    }
    if (!grew) break;
  }

  // ---- JSX-rendered calls taking a tainted argument --------------------------------------------
  traverse(ast, {
    CallExpression(p) {
      if (p.node.callee.type !== "Identifier") return;
      if (NOT_A_NUMBER.test(p.node.callee.name)) return;
      const via = [];
      for (const a of p.node.arguments) {
        if (a.type !== "Identifier") continue;
        const b = p.scope.getBinding(a.name);
        if (b && taint.has(b.identifier)) via.push(`${a.name} (${taint.get(b.identifier)})`);
      }
      if (!via.length) return;
      // A FLAG HANDED IN AS AN ARGUMENT IS A GATE TOO, and the ancestor-test rule below cannot see
      // one. stateCatalogLine(cnt, nm, statesUnavailable, ...) consults the flag INSIDE the
      // function -- that is how check:outage-copy's Manage-areas fix is built -- so reporting it
      // would tell an author to gate something already gated.
      // Any *Unavailable, not only the ones this scan seeds from: stateCatalogLine is gated on
      // `statesUnavailable`, which feeds no list here, so a FLAGS-only test misses it.
      if (p.node.arguments.some((a) => a.type === "Identifier" && /Unavailable$/.test(a.name))) return;
      let rendered = false;
      for (let a = p.parentPath; a; a = a.parentPath)
        if (a.node.type === "JSXExpressionContainer") { rendered = true; break; }
      if (!rendered) return;
      calls++;

      let gated = false;
      for (let a = p.parentPath; a; a = a.parentPath) {
        const n = a.node;
        const tests = n.type === "ConditionalExpression" ? [n.test]
          : n.type === "LogicalExpression" ? [n.left]
          : n.type === "IfStatement" ? [n.test] : [];
        for (const t of tests) {
          const txt = src.slice(t.start, t.end);
          for (const f of FLAGS) if (txt.includes(f)) gated = true;
        }
      }
      if (gated) return;
      rows.push({ file, line: src.slice(0, p.node.start).split("\n").length,
        callee: p.node.callee.name, via: via.join(", "),
        snip: src.slice(p.node.start, p.node.start + 58).replace(/\s+/g, " ") });
    },
  });
}

console.log(`seed bindings resolved: ${seeded}`);
console.log(`JSX-rendered calls taking a tainted argument: ${calls}`);
if (seeded < 5 || calls < 2) {
  console.error("FAIL-CLOSED: the taint walk resolved almost nothing — broken scan, not a clean app.");
  process.exit(1);
}
const by = {};
for (const r of rows) (by[r.callee] ||= []).push(r);
console.log(`ungated: ${rows.length}, across ${Object.keys(by).length} distinct callee(s)\n`);
for (const [callee, list] of Object.entries(by).sort((a, b) => b[1].length - a[1].length))
  console.log(`  ${callee}  x${list.length}   via ${list[0].via}\n      ${list[0].file}:${list[0].line}  ${list[0].snip}...`);
// KNOWN records REASONS, not passes, and a stale entry fails -- the standard check:field-renders'
// map is held to. Each of these is still reported above because its gate is not an ANCESTOR TEST,
// which is the only shape the scan can see; leaving them unexplained would read as open work.
const KNOWN = {
  vScore: "the Profile trust card: deliberately ungated so the parts that ARE known still show, with a sibling caveat saying the score is understated. A caveat is not an ancestor test, so it cannot be seen from here.",
  groupTrustShortfall: "both group-join handlers: the block stands and the MESSAGE branches on _trustPartial inside the handler, so the honesty is one statement below the call rather than above it.",
  clickable: "a keyboard-triad handler, not a number. Nothing is claimed by it.",
};
console.log("\nWHY EACH IS STILL LISTED (reasons, not passes — a stale entry fails):");
let stale = 0;
for (const k of Object.keys(KNOWN)) {
  if (!by[k]) { console.log(`  STALE  ${k} — declared here and no longer reported. Drop the entry.`); stale++; }
  else console.log(`  ${k}: ${KNOWN[k]}`);
}
for (const k of Object.keys(by)) if (!KNOWN[k]) { console.log(`  UNDECLARED  ${k} — a derived number nobody has judged.`); stale++; }
console.log("\nREAD THIS, DO NOT SWEEP IT: a call on a tainted value is only a defect when what it");
console.log("renders is a NUMBER presented as a fact. A list, a label or a control is not.");
process.exit(stale ? 1 : 0);
