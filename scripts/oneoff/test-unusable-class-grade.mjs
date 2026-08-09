// dbRouteToCamel drops a class grade only where it cannot possibly apply. Both directions
// matter: the discipline guard is load-bearing, and removing it silently strips the VALID
// class grade off every alpine and scrambling route in the catalog.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";
const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/rappels-rack-filter-class-audit";
const require_ = createRequire(import.meta.url);
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-grade-")), "b.cjs");
await build({
  stdin: { contents: `export { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error",
});
const { dbRouteToCamel } = require_(out);

const CASES = [
  // [discipline, grade, expected, label]
  ["sport", "3rd", null, "sport + 3rd -> dropped (Prism Roof)"],
  ["trad", "4th", null, "trad + 4th -> dropped"],
  ["bouldering", "3rd", null, "bouldering + 3rd -> dropped"],
  ["rock", "4th", null, "rock + 4th -> dropped"],
  ["sport", "Class 3", null, "the 'Class 3' spelling too"],
  // …and everything legitimate survives
  ["sport", "5.13c", "5.13c", "a real sport grade survives"],
  ["trad", "5.9+", "5.9+", "a real trad grade survives"],
  ["bouldering", "V4", "V4", "a V grade survives"],
  ["alpine", "4th", "4th", "ALPINE keeps its valid class grade"],
  ["scrambling", "3rd", "3rd", "SCRAMBLING keeps its valid class grade"],
  ["mountaineering", "Class 3", "Class 3", "mountaineering keeps its class grade"],
  ["ice", "4th", "4th", "ice keeps its class grade"],
  ["sport", null, null, "no grade stays no grade"],
  ["sport", "5.4", "5.4", "5.x is never a class grade"],
];
let bad = 0;
for (const [discipline, grade, want, label] of CASES) {
  const got = dbRouteToCamel({ id: "t", discipline, grade }).grade;
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? "  ok    " : "  FAIL  ") + label + `  (want ${JSON.stringify(want)}, got ${JSON.stringify(got)})`);
}
console.log(bad ? `\n${bad} failure(s).` : "\nok — class grades dropped only where they cannot apply.");
process.exit(bad ? 1 : 0);
