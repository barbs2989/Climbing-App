// Injection cases for check:read-failures.
//
// Its healthy output is "ok", which is exactly what a broken scan prints, so it has to be shown
// able to fail. Each case edits a real file, proves the edit LANDED by checksum before judging
// the guard, and restores — "injection logged, counter didn't move" has bitten this repo
// repeatedly and an edit that never applied reads as a guard that missed.
//
//   node scripts/oneoff/inject-read-failure-cases.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const DB = "lib/db.js";
const GUARD = "scripts/check-read-failures.mjs";
const sum = p => createHash("sha1").update(readFileSync(p)).digest("hex").slice(0, 10);

function run() {
  try {
    execFileSync("node", [GUARD], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout || "") + String(e.stderr || "") };
  }
}

const CASES = [
  { name: "1. the real historical defect — a pager swallows its error again",
    file: DB,
    edit: s => s.replace(
      "if (error) throw error;   // a failed read is not an empty page — see the note above",
      "if (error) return [];"),
    want: r => r.code !== 0 && /fetchOlderCrewMessages/.test(r.out) && /\[\]/.test(r.out) },

  { name: "2. the inbox swallow returns, and is named",
    file: DB,
    edit: s => s.replace(
      "if (error) throw error;   // a failed read is not an empty inbox — see the note above",
      "if (error) return [];"),
    want: r => r.code !== 0 && /fetchMyDirectMessages/.test(r.out) },

  { name: "3. a declaration that matches nothing is reported STALE",
    file: GUARD,
    edit: s => s.replace("const DECLARED = {", 'const DECLARED = {\n  noSuchReadFn: "invented",'),
    want: r => r.code !== 0 && /STALE/.test(r.out) && /noSuchReadFn/.test(r.out) },

  { name: "4. a COMMENT describing the forbidden shape must NOT trip it (must pass)",
    file: DB,
    edit: s => s.replace("export async function fetchMyDirectMessages",
      "// Never write `if (error) return [];` here — see check:read-failures.\nexport async function fetchMyDirectMessages"),
    want: r => r.code === 0 },

  { name: "5. a broken scan fails CLOSED rather than reporting a clean file",
    file: GUARD,
    edit: s => s.replace("if (exportedFns < 50)", "if (exportedFns < 100000)"),
    want: r => r.code !== 0 && /scan is broken/.test(r.out) },
];

let pass = 0;
for (const c of CASES) {
  const orig = readFileSync(c.file, "utf8");
  const before = sum(c.file);
  writeFileSync(c.file, c.edit(orig));
  const landed = sum(c.file) !== before;
  let r;
  try { r = run(); } finally { writeFileSync(c.file, orig); }

  if (!landed) { console.log(`  MISAPPLIED  ${c.name} — the edit never landed, so this proves nothing`); continue; }
  const ok = c.want(r);
  if (ok) pass++;
  console.log(`  ${ok ? "caught " : "MISSED "}  ${c.name}`);
}
console.log(`\n${pass}/${CASES.length} injection cases behaved as required`);
process.exit(pass === CASES.length ? 0 : 1);
