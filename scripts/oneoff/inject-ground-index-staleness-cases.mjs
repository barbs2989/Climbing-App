// Injection cases for `audit:ground-index`. Its healthy output is "0 retired, 0 drift", which is
// also exactly what a broken audit prints — so a clean run proves nothing until each case has been
// shown to move it.
//
// Every case proves its edit LANDED BY CHECKSUM before judging the audit, and restores the file
// afterwards, checking the checksum comes back. Without that, an edit whose pattern silently
// failed to match reads as "the audit missed it" and sends you debugging the wrong file — the trap
// this repo records for check:log and check:waypoint-styles.
//
//   node scripts/oneoff/inject-ground-index-staleness-cases.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("../..", import.meta.url).pathname;
const IDX = ROOT + "lib/ground-checked-pins.js";
const sum = s => createHash("sha1").update(s).digest("hex").slice(0, 10);

const original = readFileSync(IDX, "utf8");
const originalSum = sum(original);

const run = () => {
  try { return execFileSync("node", [ROOT + "scripts/audit-ground-index.mjs"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};

// Each case: mutate the shipped index, say what the audit must then say.
const CASES = [
  { name: "a pin was repaired (lat moved)",
    edit: s => s.replace(/\{lat:(-?\d+\.\d+),/, (m, v) => `{lat:${(Number(v) + 0.05).toFixed(5)},`),
    want: /went silent|REGENERATE|pins still matching\s*:\s*15[0-8] of 159/ },
  { name: "a pin's elevation was corrected",
    edit: s => s.replace(/,elev:(\d+),/, (m, v) => `,elev:${Number(v) + 7},`),
    want: /went silent|pins still matching\s*:\s*15[0-8] of 159/ },
  { name: "most of the index has been repaired -> REGENERATE",
    edit: s => s.replace(/\{lat:(-?\d+\.\d+),/g, (m, v) => `{lat:${(Number(v) + 0.05).toFixed(5)},`),
    want: /REGENERATE/ },
  { name: "the catalog grew past the measurement -> REGENERATE",
    edit: s => s.replace(/GROUND_PINS_MEASURED = \d+/, "GROUND_PINS_MEASURED = 2000"),
    want: /REGENERATE/ },
  { name: "the index is empty -> fail closed, never 'clean catalog'",
    edit: s => s.replace(/export const GROUND_DISAGREEMENTS = \{[\s\S]*?\n\};/, "export const GROUND_DISAGREEMENTS = {\n};"),
    want: /EMPTY|broken build/ },
];

let bad = 0;
for (const c of CASES) {
  const mutated = c.edit(original);
  if (sum(mutated) === originalSum) {
    console.log(`SKIP  ${c.name}\n      edit never landed — the pattern did not match. Fix the CASE, not the audit.`);
    bad++; continue;
  }
  writeFileSync(IDX, mutated);
  const out = run();
  writeFileSync(IDX, original);
  if (sum(readFileSync(IDX, "utf8")) !== originalSum) {
    console.log(`FATAL ${c.name}: the index was NOT restored. Fix it by hand before doing anything else.`);
    process.exit(1);
  }
  const caught = c.want.test(out);
  if (!caught) bad++;
  console.log(`${caught ? "ok   " : "MISS "} ${c.name}`);
  if (!caught) console.log("      audit said:\n" + out.split("\n").filter(l => /retired|REGENERATE|matching|verdict|EMPTY/.test(l)).map(l => "        " + l).join("\n"));
}

console.log(`\n${CASES.length - bad}/${CASES.length} caught.`);
console.log(`index restored: ${sum(readFileSync(IDX, "utf8")) === originalSum ? "yes" : "NO — FIX BY HAND"}`);
process.exit(bad ? 1 : 0);
