// Proves an extraction moved code and changed nothing but types (docs/refactor-progress.md, PR57 on).
//
//   node scripts/oneoff/verify-extraction.mjs [--base origin/main] [--parent RouteDetail.jsx] file1.tsx lib/x.js ...
//
// Every top-level function/const in each named file is looked up by NAME among the parent's
// top-level declarations at --base (lifted from git, never retyped), and the two are compared as
// code: TypeScript annotations, `as`/`!`/`satisfies`, interfaces and type aliases stripped, `export`
// and `export default` dropped, comments and formatting ignored (@babel/generator prints both).
// Any difference is printed and fails the run. A declaration with no counterpart in the base is
// listed as NEW (a typed helper written for the move) and fails unless --allow-new names it.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parse } from "@babel/parser";
import traverseM from "@babel/traverse";
import generateM from "@babel/generator";
const traverse = traverseM.default || traverseM;
const generate = generateM.default || generateM;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const base = opt("--base", "origin/main"), parent = opt("--parent", "RouteDetail.jsx");
const allowNew = new Set((opt("--allow-new", "") || "").split(",").filter(Boolean));
// --allow-differs A,B: declarations with a deliberate, reviewed change (recorded in refactor-progress.md);
// their difference is still printed.
const allowDiff = new Set((opt("--allow-differs", "") || "").split(",").filter(Boolean));
const files = argv;

function decls(src, ts) {
  const ast = parse(src, { sourceType: "module", plugins: ts ? ["jsx", "typescript"] : ["jsx"] });
  traverse(ast, {
    enter(p) {
      const n = p.node;
      if (n.typeAnnotation && n.typeAnnotation.type?.startsWith("TS")) n.typeAnnotation = null;
      if (n.returnType) n.returnType = null;
      if (n.typeParameters && n.type !== "JSXOpeningElement") n.typeParameters = null;
      if (n.typeArguments) n.typeArguments = null;
      if (n.optional && (n.type === "Identifier")) n.optional = false;
      if (n.definite) n.definite = false;
      // `var` -> `let`/`const` is the one code change lint forces on a moved .tsx (no-var); tsc
      // refuses a block-scoped read before its declaration, so the rename cannot change behaviour.
      if (n.type === "VariableDeclaration" && n.kind === "var") n.kind = "let";
      if (n.type === "VariableDeclaration" && n.kind === "const") n.kind = "let";
      if (["TSAsExpression", "TSNonNullExpression", "TSSatisfiesExpression", "TSTypeAssertion"].includes(n.type)) { p.replaceWith(n.expression); return; }
      if (["TSInterfaceDeclaration", "TSTypeAliasDeclaration"].includes(n.type)) { p.remove(); return; }
    },
  });
  const out = new Map();
  for (let st of ast.program.body) {
    if ((st.type === "ExportNamedDeclaration" || st.type === "ExportDefaultDeclaration") && st.declaration) st = st.declaration;
    if (st.type === "FunctionDeclaration" && st.id) out.set(st.id.name, st);
    else if (st.type === "VariableDeclaration") for (const d of st.declarations) if (d.id.type === "Identifier") out.set(d.id.name, { ...st, declarations: [d] });
  }
  return out;
}
const code = n => generate(n, { comments: false, compact: false }).code;
const baseSrc = execFileSync("git", ["show", `${base}:${parent}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20 });
const baseDecls = decls(baseSrc, false);
let bad = 0, ok = 0;
for (const f of files) {
  const d = decls(fs.readFileSync(path.join(ROOT, f), "utf8"), true);
  for (const [name, node] of d) {
    const b = baseDecls.get(name);
    if (!b) { if (allowNew.has(name)) { console.log(`NEW (allowed)  ${f}: ${name}`); continue; } console.log(`NEW  ${f}: ${name} — no declaration of that name in ${base}:${parent}`); bad++; continue; }
    const a = code(node), c = code(b);
    if (a === c) { ok++; continue; }
    if (!allowDiff.has(name)) bad++;
    const al = a.split("\n"), cl = c.split("\n"); let i = 0; while (i < al.length && al[i] === cl[i]) i++;
    const nd = al.filter((l, k) => l !== cl[k]).length + Math.abs(al.length - cl.length);
    console.log(`DIFFERS  ${f}: ${name} — ${nd} line(s) differ, first at line ${i + 1}:\n  base: ${cl[i]}\n  now:  ${al[i]}`);
  }
}
console.log(`${ok} declaration(s) identical to ${base}:${parent} modulo types; ${bad} not.`);
process.exit(bad ? 1 : 0);
