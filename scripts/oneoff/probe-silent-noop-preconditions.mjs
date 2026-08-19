// Which lib/ helpers answer "I cannot tell" with a value that looks like "nothing is wrong"?
//
// Three vacuous zeros were found on 2026-08-19, and two shared one mechanism: a helper with a
// precondition that silently no-ops. `orderWaypoints` returns the list UNTOUCHED unless every
// pin has a finite distMi, so an audit comparing before-and-after sees no difference and
// reports "0 out of order" for 530 of 1,012 routes. `corpus()` in lib/terrain.js simply did not
// name two columns, so evidence in them could not change a verdict.
//
// The shape is: an early return whose value is indistinguishable from a clean result. A caller
// cannot tell "I checked and it was fine" from "I could not check". Grep cannot find this —
// every identifier is bound and the code is correct in isolation — so this walks the AST and
// reports each early return in an exported function, with what it returns and what gated it.
//
// REPORT-ONLY, and it must stay so: many of these are correct and deliberate. A `return ""` for
// a null route is a guard clause, not a hazard. The output is a list to READ.
//
//   node scripts/oneoff/probe-silent-noop-preconditions.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIB = path.join(ROOT, "lib");

const files = fs.readdirSync(LIB).filter(f => f.endsWith(".js")).sort();
if (!files.length) throw new Error("no lib/*.js found — a clean answer here would be a false pass");

// What an "I cannot tell" return looks like. The interesting ones return the INPUT unchanged
// (so a diff-based caller sees nothing) or an empty collection (so a counting caller sees zero).
function describeReturn(node, paramNames) {
  if (!node) return { kind: "bare return", risky: true };
  if (node.type === "Identifier" && paramNames.includes(node.name)) return { kind: `the input \`${node.name}\` unchanged`, risky: true };
  if (node.type === "ArrayExpression" && !node.elements.length) return { kind: "an empty array", risky: true };
  if (node.type === "ObjectExpression" && !node.properties.length) return { kind: "an empty object", risky: true };
  if (node.type === "StringLiteral" && node.value === "") return { kind: 'the empty string ""', risky: true };
  if (node.type === "NumericLiteral" && node.value === 0) return { kind: "0", risky: true };
  if (node.type === "BooleanLiteral") return { kind: String(node.value), risky: node.value === false };
  if (node.type === "NullLiteral") return { kind: "null", risky: false };
  return { kind: node.type, risky: false };
}

let total = 0;
const findings = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(LIB, f), "utf8");
  let ast;
  try {
    ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  } catch (e) { console.log(`  (skipped ${f}: ${e.message.slice(0, 60)})`); continue; }

  traverse(ast, {
    Function(p) {
      // Only exported functions — an internal helper's early return is the caller's problem to
      // reason about, and including them buries the signal.
      let exported = false;
      let name = (p.node.id && p.node.id.name) || null;
      let q = p;
      while (q) {
        if (q.isExportNamedDeclaration() || q.isExportDefaultDeclaration()) { exported = true; break; }
        if (q.isVariableDeclarator() && q.node.id && q.node.id.name && !name) name = q.node.id.name;
        q = q.parentPath;
      }
      if (!exported || !name) return;
      const paramNames = p.node.params.filter(x => x.type === "Identifier").map(x => x.name);

      p.traverse({
        Function(inner) { inner.skip(); },       // do not descend into nested functions
        ReturnStatement(r) {
          // Only returns guarded by a conditional — an unconditional final return is the answer,
          // not a bail-out.
          const gate = r.findParent(x => x.isIfStatement());
          if (!gate) return;
          total++;
          const d = describeReturn(r.node.argument, paramNames);
          if (!d.risky) return;
          const cond = src.slice(gate.node.test.start, gate.node.test.end).replace(/\s+/g, " ");
          findings.push({ file: f, name, line: r.node.loc.start.line, ret: d.kind, cond: cond.slice(0, 110) });
        },
      });
    },
  });
}

const byFile = new Map();
for (const x of findings) {
  if (!byFile.has(x.file)) byFile.set(x.file, []);
  byFile.get(x.file).push(x);
}
for (const [f, list] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${f}  (${list.length})`);
  for (const x of list) console.log(`  ${String(x.line).padStart(4)}  ${x.name}() returns ${x.ret}\n         when: ${x.cond}`);
}

console.log(`\n${files.length} lib files, ${total} conditional returns in exported functions`);
console.log(`${findings.length} return a value a caller cannot distinguish from "nothing is wrong"`);
console.log("\nReport only. Most of these are correct guard clauses — this is a list to READ,");
console.log("not a defect count. The question for each: could a CALLER tell this apart from a");
console.log("clean result, and does any audit depend on that distinction?");
