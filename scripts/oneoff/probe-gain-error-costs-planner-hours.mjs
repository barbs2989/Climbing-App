// What does an understated gain_ft actually cost on the Plan tab?
//
// The chain is real and was checked rather than assumed:
//   routes.gain_ft -> dbRouteToCamel `gainM: r.gain_ft/3.28084` -> scarfHrs(distKm, gainM, …)
// and the Plan tab turns that into an estimated summit time, an estimated return, and the
// "after dark" warning. So an impossible gain is not a cosmetic number — it is an optimistic
// turnaround a party can plan around.
//
// This prints the hours the stored value buys versus the hours the route's own waypoints demand,
// for the worst findings. Uses the app's OWN scarfHrs, lifted through esbuild rather than
// reimplemented — a reimplementation would agree with itself and prove nothing.
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import { createRequire } from "module";
import { execFileSync } from "child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `export { scarfHrs } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-gain-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" });
const { scarfHrs } = require_(out);
if (typeof scarfHrs !== "function") { console.error("ANCHOR LOST: scarfHrs is not exported from ClimbMatchCore.jsx"); process.exit(1); }

/* stdio must be pinned. With the default, the child's stderr is interleaved into what
   execFileSync hands back and the JSON parse dies at whatever byte the first stray line lands
   on — which reads as "the audit emits broken JSON". It does not: the same output parses fine
   on its own, checked before blaming it. Print the head on failure so the next person does not
   have to re-derive that. */
const raw = execFileSync("node", [path.join(ROOT, "scripts/audit-gain-vs-waypoints.mjs"), "--json"], { encoding: "utf8", maxBuffer: 64e6, stdio: ["ignore", "pipe", "ignore"] });
let findings;
try { findings = JSON.parse(raw); }
catch (e) { console.error(`could not parse the audit output (${e.message}); first 200 chars:\n${raw.slice(0, 200)}`); process.exit(1); }
if (!findings.length) { console.error("the audit reported nothing — cannot measure a cost"); process.exit(1); }

const FT_PER_M = 3.28084;
console.log(`\n=== what the understated gain costs on the Plan tab ===`);
console.log(`Using the app's own scarfHrs at default fitness/pack. Approach leg only — the number the`);
console.log(`estimated summit time is built from.\n`);
let worst = 0, n = 0;
for (const f of findings.slice(0, 12)) {
  if (f.distKm == null) continue;
  const storedHrs = scarfHrs(f.distKm, f.gain / FT_PER_M, 0);
  const trueHrs = scarfHrs(f.distKm, f.rise / FT_PER_M, 0);
  if (!Number.isFinite(storedHrs) || !Number.isFinite(trueHrs)) continue;
  const diff = trueHrs - storedHrs;
  worst = Math.max(worst, diff); n++;
  console.log(`  ${f.id.padEnd(46)} ${f.distKm} km`);
  console.log(`     stored gain ${String(f.gain).padStart(5)} ft -> ${storedHrs.toFixed(1)} hr approach`);
  console.log(`     own pins say ${String(f.rise).padStart(5)} ft -> ${trueHrs.toFixed(1)} hr approach     UNDERSTATED BY ${diff.toFixed(1)} hr`);
}
console.log(`\n${n} measured · worst understatement ${worst.toFixed(1)} hr of approach time.`);
console.log(`That is time a party does not know it needs, on the tab that tells them whether they get down before dark.`);
