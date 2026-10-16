// Is there a clean rule to guard the useMyFiledReports shape, or would it flag correct work?
//
// The candidate: inside a `queryFn`, every `await supabase…` must bind `error`. It is thematically
// exact — react-query's `isError` is the ONLY channel a query has to report failure, and every
// xUnavailable flag in the app keys on it — so a discarded error inside a queryFn is a failure the
// UI structurally cannot learn about.
//
// Measured before proposing it, because a rule that flags correct work teaches people to ignore it.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = fs.readdirSync(path.join(ROOT, "lib"))
  .filter((f) => /\.(js|jsx)$/.test(f)).map((f) => "lib/" + f)
  .filter((f) => /\buseQuery\s*\(/.test(fs.readFileSync(path.join(ROOT, f), "utf8")));

let inQueryFn = 0, discarded = 0, bound = 0;
for (const rel of FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    ObjectProperty(p) {
      if (!p.node.key || p.node.key.name !== "queryFn") return;
      inQueryFn++;
      p.traverse({
        VariableDeclarator(v) {
          const init = v.node.init;
          if (!init || init.type !== "AwaitExpression") return;
          if (!/supabase/.test(src.slice(init.start, init.end))) return;
          if (v.node.id.type !== "ObjectPattern") return;
          const keys = v.node.id.properties.map((pr) => pr.key && pr.key.name).filter(Boolean);
          if (keys.includes("error")) { bound++; return; }
          discarded++;
          const line = v.node.loc.start.line;
          console.log(`  ${rel}:${line}  discards error  { ${keys.join(", ")} }`);
          console.log(`      ${src.slice(v.node.start, v.node.start + 120).replace(/\s+/g, " ")}`);
        },
      });
    },
  });
}
console.log(`\n${FILES.length} file(s) with useQuery; ${inQueryFn} queryFn(s); `
  + `${bound} supabase await(s) bind error, ${discarded} discard it.`);
if (!inQueryFn) console.log("0 queryFns parsed — the scan is broken, not the code clean.");
