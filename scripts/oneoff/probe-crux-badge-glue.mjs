// A pitch row renders `{p.grade}{p.crux ? <span style={{marginLeft:6}}>CRUX</span> : null}` inside
// a `clickable()` control. Two text nodes, a CSS margin between them, and the accessibility tree
// has no margins — so a pitch graded "5.9" announces as "5.9CRUX". That is the #740 shape exactly,
// and check:a11y-badges exists for it.
//
// So why is that guard green? It reaches the route page with `?zr=1`, which opens ROUTES[0] — a
// SEED route. This asks whether any seed route can render a crux row at all: if none can, the
// defect is unreachable to the walk by construction, the same way the Ranks tab was before
// check:screen-lists.
//
// Report-only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-crux-")), "b.cjs");
await build({
  stdin: { contents: `export { ROUTES } from "${path.join(ROOT, "ClimbMatchCore.jsx")}";`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { ROUTES } = require_(out);

const picked = ROUTES.find((rt)=>Array.isArray(rt.pitchDetail)&&rt.pitchDetail.length&&rt.pitchDetail.some((x)=>x&&x.crux));
console.log("?zrp=1 picks:", picked ? picked.id : "(none)");
if (picked) {
  const cx = picked.pitchDetail.filter((x)=>x&&x.crux);
  console.log("  its crux grades:", cx.map((x)=>JSON.stringify(x.grade)).join(", "));
  console.log("  glue-capable (grade ends in a word char):", cx.some((x)=>/\w$/.test(String(x.grade||""))));
}
const r0 = ROUTES[0];
console.log(`ROUTES[0] — the route ?zr=1 opens: ${r0.id} (${r0.name}), discipline ${r0.discipline}, pitches ${r0.pitches}`);
console.log(`  pitchDetail: ${Array.isArray(r0.pitchDetail) ? r0.pitchDetail.length + " entries" : String(r0.pitchDetail)}`);

let routesWithCrux = 0, cruxRows = 0, glued = 0;
const examples = [];
for (const rt of ROUTES) {
  const pd = rt.pitchDetail;
  if (!Array.isArray(pd)) continue;
  let any = false;
  for (const p of pd) {
    if (!p || !p.crux) continue;
    any = true; cruxRows++;
    // The glue only happens when the grade's LAST character is a word character. "5.9+" is safe
    // because `+` separates the two fragments; "5.9" is not.
    if (/\w$/.test(String(p.grade || ""))) { glued++; examples.push(`${rt.id} · ${p.grade}CRUX`); }
  }
  if (any) routesWithCrux++;
}

console.log(`\nacross ${ROUTES.length} seed routes:`);
console.log(`  ${routesWithCrux} route(s) have a crux pitch, ${cruxRows} crux row(s) total`);
console.log(`  ${glued} of those would announce as "<grade>CRUX" (grade ends in a word character)`);
for (const e of examples.slice(0, 8)) console.log(`      ${e}`);
if (!glued) {
  console.log("\nNo seed route can render the glued shape, so check:a11y-badges cannot see it from ?zr=1.");
  console.log("The guard is reporting reality; the surface is simply outside its walk.");
}
