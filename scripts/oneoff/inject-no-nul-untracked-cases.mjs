// Does check:no-nul see a file that is NOT YET TRACKED?
//
// THE INCIDENT: #1449 failed CI on a literal NUL in a script I had just written, while
// `npm run check:no-nul` passed locally on the same tree moments earlier. Not a flake — the guard
// enumerated with a bare `git ls-files`, which lists TRACKED files only, and the file was untracked
// when I ran it. The counts said so and I did not read them: 2003 files before `git add`, 2009
// after.
//
// That is the worst possible shape for this guard specifically. It runs FIRST in the build chain,
// so when it does fire in CI nothing else runs and the PR shows one red check with no other
// information — and the file it could not see is precisely the file you are about to commit, whose
// diff is the thing the guard exists to protect.
//
// The defect is reproduced by REVERTING the fix, the way every injection harness here works, so
// the suite keeps meaning something on a fixed tree. Each case proves its edit landed BY CHECKSUM
// and restores the guard byte-identically.
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(ROOT, "scripts/check-no-nul-bytes.mjs");
const VICTIM = path.join(ROOT, "scripts/oneoff/zz-untracked-nul-probe.mjs");
const NUL = String.fromCharCode(0);   // never a literal NUL in this file — the guard forbids it

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12);
const original = readFileSync(GUARD, "utf8");
const guardBefore = sha(GUARD);
const FIXED = '["ls-files", "--cached", "--others", "--exclude-standard"]';
const BARE = '["ls-files"]';

function runGuard() {
  try { execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); return { code: 0, out: "" }; }
  catch (e) { return { code: e.status, out: String(e.stdout || "") + String(e.stderr || "") }; }
}
const restore = () => writeFileSync(GUARD, original);
const cleanup = () => { rmSync(VICTIM, { force: true }); restore(); };

let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { fails++; console.log("  FAIL  " + m); };
const dead = (m) => { cleanup(); console.error("\nPROBE BROKEN — " + m + "\nNothing below was checked.\n"); process.exit(1); };

console.log("check:no-nul — can it see an UNTRACKED source file?\n");

if (!original.includes(FIXED)) dead("the guard is not in its fixed form — ANCHOR LOST, or the fix was reverted");
if (runGuard().code !== 0) dead("the tree is already failing check:no-nul, so every verdict below is about the wrong thing");
ok("the guard starts clean and in its fixed form");

// The victim: an untracked source file holding one NUL — exactly the #1449 shape.
writeFileSync(VICTIM, "// scratch probe\nconst k = a + \"" + NUL + "\" + b;\n");
if (!existsSync(VICTIM)) dead("victim not written");
if (!execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" }).includes("zz-untracked-nul-probe")) {
  dead("the victim is not reported as untracked-and-not-ignored, so the case tests nothing");
}
ok("the victim exists, is untracked, and is not gitignored");

// ── case 1: the FIX catches it ───────────────────────────────────────────────────────────────
const r1 = runGuard();
if (r1.code !== 0 && /zz-untracked-nul-probe/.test(r1.out)) ok("case 1 — the guard names the untracked file");
else bad("case 1 — the guard MISSED the untracked file: " + r1.out.slice(0, 160));

// ── case 2: reverting to a bare ls-files reproduces the #1449 miss ───────────────────────────
writeFileSync(GUARD, original.replace(FIXED, BARE));
if (sha(GUARD) === guardBefore) dead("case 2 edit never landed");
const r2 = runGuard();
if (r2.code === 0) ok("case 2 — with a bare ls-files the guard PASSES over the same file (the real defect)");
else bad("case 2 — a bare ls-files still caught it, so the fix is not what makes the difference");
restore();

// ── case 3: quiet on a clean tree, or the fix is worse than the gap it closes ────────────────
rmSync(VICTIM, { force: true });
const r3 = runGuard();
if (r3.code === 0) ok("case 3 — with the victim gone the widened guard is quiet: no false alarm from ordinary untracked files");
else bad("case 3 — the widened guard fails on a clean tree: " + r3.out.slice(0, 200));

// ── case 4: .gitignore still respected, so node_modules and the dotfiles cannot be dragged in ─
const others = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
if (!others.some((f) => f.startsWith("node_modules/") || f === ".env" || f === ".env.local")) ok("case 4 — --exclude-standard keeps node_modules and the .env dotfiles out of the walk");
else bad("case 4 — gitignored paths leaked into the walk");

if (sha(GUARD) !== guardBefore) bad("the guard was NOT restored byte-identically");
else ok("guard restored byte-identically");

console.log(fails ? `\n${fails} failure(s)` : "\nok — the gap is real, the widening closes it, and it stays quiet otherwise.");
process.exit(fails ? 1 : 0);
