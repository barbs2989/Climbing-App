// Where does check:waypoint-placement's 2.5 minutes actually go?
// Measure before optimising, or you speed up the wrong thing.
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/route-page-cleanup/";
const t0 = Date.now();
const mark = (label, since) => console.log(`${String(Date.now() - since).padStart(7)} ms  ${label}`);

let t = Date.now();
const core = readFileSync(ROOT + "ClimbMatchCore.jsx", "utf8");
const rd = readFileSync(ROOT + "RouteDetail.jsx", "utf8");
mark(`read both sources (${(core.length / 1024 | 0)}kB + ${(rd.length / 1024 | 0)}kB)`, t);

t = Date.now();
const { parse } = await import("@babel/parser");
const _t = (await import("@babel/traverse")).default;
const traverse = _t.default || _t;
mark("import babel", t);

t = Date.now();
const a1 = parse(core, { sourceType: "module", plugins: ["jsx"] });
mark("parse ClimbMatchCore", t);
t = Date.now();
const a2 = parse(rd, { sourceType: "module", plugins: ["jsx"] });
mark("parse RouteDetail", t);

t = Date.now();
let n = 0;
for (const ast of [a1, a2]) traverse(ast, { CallExpression() { n++; } });
mark(`traverse both (${n} call expressions)`, t);

t = Date.now();
const require_ = createRequire(import.meta.url);
const esbuild = require_("esbuild");
mark("require esbuild", t);

const tmp = mkdtempSync(join(ROOT, ".prof-"));
try {
  writeFileSync(join(tmp, "e.jsx"), `
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import RouteDetail from "${ROOT}RouteDetail.jsx";
console.log(typeof RouteDetail);
`);
  t = Date.now();
  esbuild.buildSync({
    entryPoints: [join(tmp, "e.jsx")], bundle: true, format: "esm", platform: "node",
    outfile: join(tmp, "out.mjs"), jsx: "automatic", logLevel: "silent",
    define: { "import.meta.env": "{}" },
    external: ["react", "react-dom", "react-dom/server", "@tanstack/react-query", "@supabase/supabase-js"],
  });
  mark("esbuild bundle (externals)", t);

  t = Date.now();
  esbuild.buildSync({
    entryPoints: [join(tmp, "e.jsx")], bundle: true, format: "esm", platform: "node",
    outfile: join(tmp, "out2.mjs"), jsx: "automatic", logLevel: "silent",
    define: { "import.meta.env": "{}" },
  });
  mark("esbuild bundle (NO externals — bundles react too)", t);
} finally { rmSync(tmp, { recursive: true, force: true }); }

mark("TOTAL", t0);
