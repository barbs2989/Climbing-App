// Injection cases for the blind-column scan in audit:terrain.
//
// The scan's healthy output is "all declared: true", which is also exactly what it prints if
// the scan is broken. So it has to be proven able to FAIL. Each case edits a real file, checks
// by checksum that the edit landed, runs the audit, and restores — because "injection logged,
// counter didn't move" has bitten this repo repeatedly, and an injection that never applied
// reads as a guard that missed.
//
//   node scripts/oneoff/inject-terrain-blind-scan-cases.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const AUDIT = "scripts/audit-route-terrain.mjs";
const TERRAIN = "lib/terrain.js";
const sum = p => createHash("sha1").update(readFileSync(p)).digest("hex").slice(0, 10);

function run() {
  try {
    return execFileSync("node", [AUDIT, "--state", "wa"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) { return String(e.stdout || "") + String(e.message || ""); }
}

const CASES = [
  { name: "1. an undeclared column carrying terrain prose is reported",
    file: AUDIT,
    edit: s => s.replace(/^\s*climate: ".*",$/m, ""),
    want: out => /UNDECLARED/.test(out) && /\bclimate\b/.test(out) },

  { name: "2. a declaration that matches nothing is reported STALE",
    file: AUDIT,
    edit: s => s.replace("const NOT_TERRAIN_EVIDENCE = {",
      'const NOT_TERRAIN_EVIDENCE = {\n  no_such_column_zzz: "invented, so nothing can carry prose in it",'),
    want: out => /STALE/.test(out) && /no_such_column_zzz/.test(out) },

  { name: "3. dropping a column from CORPUS_COLUMNS makes it show up as unread",
    file: TERRAIN,
    edit: s => s.replace('"approach", "descent", "descent_text"', '"descent", "descent_text"'),
    want: out => /UNDECLARED/.test(out) && /\bapproach\b/.test(out) },

  { name: "4. a healthy tree reports every carrying column as declared (must PASS)",
    file: AUDIT,
    edit: s => s,
    want: out => /all declared: true/.test(out) && !/UNDECLARED/.test(out) && !/STALE/.test(out) },
];

let pass = 0;
for (const c of CASES) {
  const orig = readFileSync(c.file, "utf8");
  const before = sum(c.file);
  writeFileSync(c.file, c.edit(orig));
  const after = sum(c.file);
  const landed = c.name.startsWith("4.") ? true : before !== after;
  let out = "";
  try { out = run(); } finally { writeFileSync(c.file, orig); }

  if (!landed) { console.log(`  MISAPPLIED  ${c.name} — the edit never landed, so this proves nothing`); continue; }
  const ok = c.want(out);
  if (ok) pass++;
  console.log(`  ${ok ? "caught " : "MISSED "}  ${c.name}`);
}
console.log(`\n${pass}/${CASES.length} injection cases behaved as required`);
process.exit(pass === CASES.length ? 0 : 1);
