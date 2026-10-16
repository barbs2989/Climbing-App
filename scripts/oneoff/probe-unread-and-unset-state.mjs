// useState declarations whose SETTER is never called, or whose VALUE is never read.
//
// A feature that never activates never crashes, so every existing guard stays green:
// check:refs sees a bound identifier, check:hooks sees a legal hook, and all of check:ui's
// screens render fine. The 2026-08-01 run of this scan found 13, including a presence privacy
// toggle whose plumbing was complete and whose control did not exist (#540), and `objDates`,
// whose partner-sorting logic could never run (#549).
//
// That run's script was not kept, so the method has lived in a memory note ever since and has
// not been re-run across ~18 days of merges. A verification nobody runs is not a verification.
//
// Scope-correct by construction: it asks Babel's SCOPE for each binding's references rather
// than counting occurrences of the name in the file. That is what settles the trap the note
// records -- `gpx` occurs 8 times file-wide and exactly once inside the component that
// declares it, so a textual count answers the wrong question for any short or generic name.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const TARGETS = FILES.length ? FILES : ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// Enclosing component/function name, for a report that says WHERE rather than only what.
const ownerOf = (p) => {
  let fn = p.getFunctionParent();
  while (fn) {
    if (fn.node.id && fn.node.id.name) return fn.node.id.name;
    const parent = fn.parentPath;
    if (parent && parent.isVariableDeclarator() && parent.node.id.name) return parent.node.id.name;
    fn = fn.getFunctionParent();
  }
  return "(top level)";
};

// Records REASONS, not passes. A name here that stops matching the shape it was excused for
// fails as stale bookkeeping -- the standard check:field-renders' KNOWN map sets, and the
// reason an exemption list cannot quietly become a description of code that is gone.
const KNOWN = {
  // Write-only ON PURPOSE. `ROUTES` is a module-level array, not React state, so a new route
  // pushed onto it is invisible until something re-renders App. `onAddRoute` does
  // `ROUTES.push(r); setRouteRev(x=>x+1)` -- the counter's VALUE is meaningless and reading it
  // would prove nothing; the setState call is the whole effect. Do not "clean this up".
  routeRev: { kind: "neverRead", why: "force-re-render counter for the module-level ROUTES array" },
};

const rows = [];
let scanned = 0;
for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.error(`MISSING SOURCE: ${rel} -- refusing to report on a tree it could not read`); process.exit(1); }
  const code = fs.readFileSync(file, "utf8");
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  traverse(ast, {
    VariableDeclarator(p) {
      const init = p.node.init;
      if (!init || init.type !== "CallExpression") return;
      const callee = init.callee;
      const name = callee.type === "Identifier" ? callee.name
        : callee.type === "MemberExpression" && callee.property.type === "Identifier" ? callee.property.name : null;
      if (name !== "useState") return;
      const id = p.node.id;
      if (id.type !== "ArrayPattern") return;
      scanned++;
      const [valNode, setNode] = id.elements;
      const line = p.node.loc ? p.node.loc.start.line : 0;
      const owner = ownerOf(p);
      const refsOf = (n) => {
        if (!n || n.type !== "Identifier") return null;
        const b = p.scope.getBinding(n.name);
        return b ? b.references : null;
      };
      const valRefs = refsOf(valNode);
      const setRefs = refsOf(setNode);
      const valName = valNode && valNode.type === "Identifier" ? valNode.name : "(destructured)";
      const setName = setNode && setNode.type === "Identifier" ? setNode.name : "(none)";
      if (setRefs === 0 || valRefs === 0) {
        rows.push({ rel, line, owner, valName, setName, valRefs, setRefs });
      }
    },
  });
}

// Fail closed. A parse that yields no useState at all is a broken scan, never a clean app --
// the shape guard-sources.mjs exists to stop.
if (scanned < 50) {
  console.error(`only ${scanned} useState declarations found across ${TARGETS.length} files -- the scan broke, this is not a clean result`);
  process.exit(1);
}

const kindOf = (r) => r.setRefs === 0 && r.valRefs === 0 ? "neither"
  : r.setRefs === 0 ? "neverSet" : "neverRead";

// Stale-exemption test, run BEFORE any verdict is printed. An entry that no longer describes
// live code is reported as broken bookkeeping rather than silently excusing nothing.
const stale = Object.entries(KNOWN).filter(([name, k]) =>
  !rows.some((r) => r.valName === name && kindOf(r) === k.kind));
if (stale.length) {
  console.error(`STALE exemptions (these no longer match the shape they were excused for):`);
  for (const [name, k] of stale) console.error(`  ${name} — excused as ${k.kind}: ${k.why}`);
  process.exit(1);
}
const excused = (r) => KNOWN[r.valName] && KNOWN[r.valName].kind === kindOf(r);
const live = rows.filter((r) => !excused(r));

const neverSet = live.filter((r) => r.setRefs === 0 && r.valRefs !== 0);
const neverRead = live.filter((r) => r.valRefs === 0 && r.setRefs !== 0);
const neither = live.filter((r) => r.valRefs === 0 && r.setRefs === 0);

const show = (title, list, note) => {
  console.log(`\n=== ${title} (${list.length}) ===`);
  if (note) console.log(`    ${note}`);
  for (const r of list.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line)) {
    console.log(`  ${r.rel}:${r.line}  ${r.owner}  [${r.valName}, ${r.setName}]  reads=${r.valRefs} writes=${r.setRefs}`);
  }
};
console.log(`scanned ${scanned} useState declarations in ${TARGETS.join(", ")}`);
show("SETTER NEVER CALLED — the feature cannot activate", neverSet,
  "False-positive classes: a setter passed to a child by a shorthand this scan resolves, and state genuinely fixed at its initial value by design.");
show("VALUE NEVER READ — the state is written and nothing renders it", neverRead);
show("NEITHER READ NOR WRITTEN — dead declaration", neither);
console.log(`\n${live.length} candidates (${rows.length - live.length} excused by KNOWN). REPORT ONLY — confirm each against its component before acting.`);
