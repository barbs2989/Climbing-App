// Does every stitched parent (readParentSource) still PARSE? Two moved files that each declare the same
// top-level name (a `type Gesture`, an `interface Climate`, a helper) parse alone and fail stitched, and
// every guard that parses the stitched page then dies. Lists the clashes per parent.
//   node scripts/oneoff/stitch-dup-names.mjs
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import { MOVED, movedAsParentText } from "../lib/guard-sources.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
let bad = 0;
for (const [parent, files] of Object.entries(MOVED)) {
  const seen = new Map();
  const kinds = new Map();
  const add = (name, f, kind) => { if (!seen.has(name)) { seen.set(name, []); kinds.set(name, []); } seen.get(name).push(f); kinds.get(name).push(kind); };
  const top = (src, f, ts) => {
    const ast = parse(src, { sourceType: "module", plugins: ts ? ["jsx", "typescript"] : ["jsx"] });
    for (let st of ast.program.body) {
      if ((st.type === "ExportNamedDeclaration" || st.type === "ExportDefaultDeclaration") && st.declaration) st = st.declaration;
      if (st.type === "ImportDeclaration") { if (f === parent) for (const s of st.specifiers) add(s.local.name, f); continue; }
      if (st.id && st.id.name) add(st.id.name, f, st.type);
      if (st.type === "VariableDeclaration") for (const d of st.declarations) if (d.id.type === "Identifier") add(d.id.name, f);
    }
  };
  top(fs.readFileSync(path.join(ROOT, parent), "utf8"), parent, false);
  for (const f of files) top(movedAsParentText(fs.readFileSync(path.join(ROOT, f), "utf8"), f), f, true);
  // TypeScript MERGES interfaces of one name, so interface + interface is legal; anything else is a clash.
  for (const [name, fs_] of seen) if (fs_.length > 1 && !kinds.get(name).every(k => k === "TSInterfaceDeclaration") && !(fs_.length === 2 && fs_[0] === parent && files.some(f => path.parse(f).name === name))) { console.log(`${parent}: ${name} declared in ${fs_.join(", ")}`); bad++; }
}
console.log(bad ? `${bad} clash(es)` : "ok — no stitched parent declares a name twice");
process.exit(bad ? 1 : 0);
