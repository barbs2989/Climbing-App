// What is the demo account's own trust score? The new group-join gate refuses below
// GROUP_TRUST_MIN, so a probe that drives it can only prove the refusal if the demo climber is
// actually under the bar — and can only prove the ADMIT path if somebody is over it. Measure
// before building the harness rather than discovering it from a confusing result.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
export { vScore, ME, CLIMBERS } from "${path.join(ROOT, "ClimbMatchCore.jsx")}";
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-trust-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { vScore, ME, CLIMBERS } = require_(out);

console.log(`ME (${ME.name}): vScore = ${vScore(ME)}`);
console.log("seed climbers:");
for (const c of CLIMBERS) console.log(`  ${String(vScore(c)).padStart(3)}  ${c.name}`);
console.log("\nA signed-in account is reset to empty stats, so its score is the floor:");
console.log("  vScore({}) =", vScore({}), " vScore(null) =", vScore(null));
