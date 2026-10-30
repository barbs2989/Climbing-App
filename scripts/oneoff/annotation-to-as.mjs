// Guards and injection suites anchor on `const NAME=` by TEXT. Typing a moved component as
// `const NAME: T=` breaks every one of them; `const NAME=<init> as T` types it the same way and keeps
// the anchor. node scripts/oneoff/annotation-to-as.mjs src/components/X.tsx NAME1,NAME2
import fs from "node:fs";
import { parse } from "@babel/parser";
import traverseM from "@babel/traverse";
const traverse = traverseM.default || traverseM;
const [file, names] = process.argv.slice(2); const want = new Set(names.split(","));
let s = fs.readFileSync(file, "utf8");
const ast = parse(s, { sourceType: "module", plugins: ["jsx", "typescript"] });
const edits = [];
traverse(ast, { VariableDeclarator(vp) { const n = vp.node; if (n.id.type !== "Identifier" || !want.has(n.id.name) || !n.id.typeAnnotation || !n.init) return;
  const t = s.slice(n.id.typeAnnotation.typeAnnotation.start, n.id.typeAnnotation.typeAnnotation.end);
  edits.push({ at: n.init.end, ins: ` as ${t}` }, { from: n.id.typeAnnotation.start, to: n.id.typeAnnotation.end, name: n.id.name }); } });
edits.sort((a, b) => (b.at ?? b.from) - (a.at ?? a.from));
for (const e of edits) s = e.at != null ? s.slice(0, e.at) + e.ins + s.slice(e.at) : s.slice(0, e.from) + s.slice(e.to);
fs.writeFileSync(file, s);
console.log("converted", edits.filter(e => e.name).map(e => e.name).join(", ") || "nothing");
