// Does every RENDERED count of a flagged list sit inside a gate that consults its flag?
//
// The Profile defect (#1467) is the reason to ask: `logsUnavailable` already existed and was read
// in 13 places, and three sites on ONE screen still counted `logs` ungated. So "the flag exists"
// is not "the screen is covered", and neither check:outage-flag-reach (does anything read it?)
// nor check:outage (does a WALKED screen acknowledge?) asks this question.
//
// NOT EVERY UNGATED COUNT IS A DEFECT, and the first version of this reported 14 of which ~3 were
// real. Three shapes hide behind one pattern, and only two of them lie:
//
//   TEXT    the count's VALUE reaches the screen ("0 logged", routesLogged:0)   -> a false number
//   CLAIM   the count is a test whose EMPTY branch renders copy ("no climbs")   -> a false claim
//   HIDES   the count is a test whose empty branch is null (a badge, a button)  -> UNDER-claims,
//           which is correct behaviour: an outage that hides a badge tells nobody anything untrue.
//
// A detector that reports HIDES would tell authors to gate correct code -- the failure this repo
// records under half a dozen names. Gating is resolved through Babel ANCESTORS, never proximity.
import fs from "fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

// (list identifier -> the flag that says its read failed). Hand-specified: deriving this needs
// name resolution across two 400kB files, and a wrong pair reports correct code as broken.
const PAIRS = {
  logs: "logsUnavailable",
  wishlist: "objectivesUnavailable",
  connections: "connectionsUnavailable",
  crews: "crewsUnavailable",
  userLists: "listsUnavailable",
};

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
let examined = 0;
const rows = [];

const isNullish = (n) =>
  !n || n.type === "NullLiteral" ||
  (n.type === "Identifier" && n.name === "undefined") ||
  (n.type === "JSXFragment" && (!n.children || !n.children.length));

for (const f of FILES) {
  const src = fs.readFileSync(f, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  traverse(ast, {
    MemberExpression(p) {
      const o = p.node.object, pr = p.node.property;
      if (o.type !== "Identifier" || pr.type !== "Identifier" || pr.name !== "length") return;
      const flag = PAIRS[o.name];
      if (!flag) return;

      let rendered = false;
      for (let a = p.parentPath; a; a = a.parentPath)
        if (a.node.type === "JSXExpressionContainer") { rendered = true; break; }
      if (!rendered) return;
      examined++;

      // Gated? Any ancestor test naming the flag.
      let gated = false;
      // And: is this count a TEST, and if so what renders when the list is empty?
      let kind = "TEXT", emptyBranch = undefined;
      for (let a = p.parentPath; a; a = a.parentPath) {
        const n = a.node;
        for (const t of (n.type === "ConditionalExpression" ? [n.test]
                       : n.type === "LogicalExpression" ? [n.left]
                       : n.type === "IfStatement" ? [n.test] : []))
          if (t && src.slice(t.start, t.end).includes(flag)) gated = true;

        if (kind === "TEXT" && n.type === "ConditionalExpression"
            && p.node.start >= n.test.start && p.node.end <= n.test.end) {
          const neg = /[!]|===\s*0|<\s*1/.test(src.slice(n.test.start, n.test.end));
          emptyBranch = neg ? n.consequent : n.alternate;   // what shows when the list is empty
          kind = isNullish(emptyBranch) ? "HIDES" : "CLAIM";
          // A GATE CAN LIVE INSIDE THE EMPTY BRANCH, not only in the test -- the "✓ My Ascents"
          // empty state swaps its own copy with `logsUnavailable?"Couldn’t load your climbs":…`.
          // Checking only the test reported that correctly-gated block as a false claim.
          if (kind === "CLAIM" && src.slice(emptyBranch.start, emptyBranch.end).includes(flag))
            gated = true;
        }
      }
      if (gated) return;

      // A VALUE HIDDEN BY AN ANCESTOR IS NOT A FALSE NUMBER, and the first version of this said it
      // was. `{wishlist.length}` sits inside `wishlist.length ? <badge> : null`, so an outage
      // removes the badge rather than printing 0 -- reporting it would tell an author to gate a
      // control that already degrades correctly.
      if (kind === "TEXT") {
        for (let a = p.parentPath; a; a = a.parentPath) {
          const n = a.node;
          if (n.type !== "ConditionalExpression") continue;
          if (!src.slice(n.test.start, n.test.end).includes(o.name + ".length")) continue;
          const neg = /[!]|===\s*0|<\s*1/.test(src.slice(n.test.start, n.test.end));
          if (isNullish(neg ? n.alternate : n.consequent) === false
              && isNullish(neg ? n.consequent : n.alternate)) { kind = "HIDES"; break; }
        }
      }
      // An `if (!x.length)` that PUSHES copy is a claim, not a value -- the setup checklist does
      // exactly this ("Save an objective"), and an IfStatement is not a ConditionalExpression so
      // the branch classification above never saw it.
      if (kind === "TEXT") {
        for (let a = p.parentPath; a; a = a.parentPath) {
          const n = a.node;
          if (n.type === "IfStatement" && p.node.start >= n.test.start && p.node.end <= n.test.end) {
            kind = "CLAIM"; break;
          }
        }
      }

      rows.push({ f, line: src.slice(0, p.node.start).split("\n").length, list: o.name, flag, kind,
        snip: src.slice(Math.max(0, p.node.start - 80), p.node.start + 45).replace(/\s+/g, " ") });
    },
  });
}

console.log(`rendered counts of a flagged list examined: ${examined}`);
if (examined < 5) { console.error("FAIL-CLOSED: too few examined — the scan is broken, not the app clean."); process.exit(1); }
for (const k of ["TEXT", "CLAIM", "HIDES"]) {
  const g = rows.filter((r) => r.kind === k);
  console.log(`\n== ${k}  (${g.length}) ${k === "HIDES" ? "-- correct behaviour, reported for contrast only" : "-- worth reading"}`);
  for (const x of g) console.log(`  ${x.f}:${x.line}  ${x.list} wants ${x.flag}\n      ...${x.snip}...`);
}
