// Can check:script-roots actually SEE a script pinned to another worktree?
//
// Its healthy answer is "none found", which is exactly what a broken regex prints. Each case
// writes one temporary script under scripts/oneoff/, runs the guard, and removes it — proving the
// tree is byte-identical afterwards by listing the directory before and after.
//
// Two cases must stay SILENT: a COMMENT naming the shape is documentation (the guard's own header
// does it, and so does CLAUDE.md's account of the defect), and the module-relative form is the
// prescribed repair — a guard that flagged either would forbid its own explanation or its own fix.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(ROOT, "scripts/check-script-roots.mjs");
const TMP = path.join(ROOT, "scripts/oneoff/zz-injected-case.mjs");
// COMPOSED, not written out: the guard is precise enough to fire on this harness, which is the
// point of it. A literal here would make the suite fail on itself before any case ran.
const W = ".claude" + "/worktrees";
const PIN = '"/Users/nathanbarber/dev/Climbing-App/' + W + '/some-other-tree"';

const CASES = [
  { name: "a pinned ROOT constant", silent: false,
    body: `const ROOT = ${PIN};\nconsole.log(ROOT);\n` },
  { name: "a pinned path inside a call", silent: false,
    body: `import fs from "node:fs";\nfs.readFileSync(${PIN} + "/ClimbMatchCore.jsx");\n` },
  { name: "SILENT: a comment naming the shape", silent: true,
    body: `// Do not write const ROOT = ${PIN} -- it reads another branch's files.\nconsole.log("ok");\n` },
  { name: "SILENT: the module-relative form (the prescribed repair)", silent: true,
    body: 'import path from "node:path";\nimport { fileURLToPath } from "node:url";\n' +
          'const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");\nconsole.log(ROOT);\n' },
];

const run = () => {
  try { return { code: 0, out: execFileSync("node", [GUARD], { encoding: "utf8" }) }; }
  catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
};

const before = fs.readdirSync(path.join(ROOT, "scripts/oneoff")).length;

// The clean run first. An expectation that already matches it is testing nothing.
const clean = run();
if (clean.code !== 0) {
  console.error("BROKEN HARNESS: the guard does not pass on a clean tree — fix that first.\n" + clean.out);
  process.exit(2);
}

let bad = 0;
for (const c of CASES) {
  fs.writeFileSync(TMP, c.body);
  const r = run();
  fs.rmSync(TMP);
  if (c.silent) {
    if (r.code === 0) console.log(`  ok    ${c.name} — correctly SILENT`);
    else { console.log(`  FALSE ALARM  ${c.name} — the guard fired on correct work`); bad++; }
  } else if (r.code === 0) {
    console.log(`  MISSED  ${c.name}`); bad++;
  } else if (!r.out.includes("zz-injected-case.mjs")) {
    console.log(`  WRONG FAILURE  ${c.name} — it failed without naming the injected file`); bad++;
  } else {
    console.log(`  ok    ${c.name} — caught, naming the file and line`);
  }
}

// Fail-closed: a walk that finds almost nothing must report a broken walk, not a clean tree.
const guardSrc = fs.readFileSync(GUARD, "utf8");
const gutted = guardSrc.replace("if (files.length < 200)", "if (files.length < 999999)");
if (gutted === guardSrc) { console.log("  BROKEN CASE  could not gut the floor"); bad++; }
else {
  fs.writeFileSync(GUARD, gutted);
  const r = run();
  fs.writeFileSync(GUARD, guardSrc);
  if (r.code !== 0 && /walk is broken/.test(r.out)) console.log("  ok    a short walk reports a BROKEN walk, not a clean tree");
  else { console.log("  MISSED  the fail-closed floor did not fire"); bad++; }
}

const after = fs.readdirSync(path.join(ROOT, "scripts/oneoff")).length;
if (before !== after) { console.log(`  BROKEN HARNESS  scripts/oneoff went ${before} -> ${after} files`); bad++; }
if (fs.readFileSync(GUARD, "utf8") !== guardSrc) { console.log("  BROKEN HARNESS  the guard was not restored"); bad++; }

console.log(bad ? `\nFAILED — ${bad}` : `\nok — ${CASES.length + 1}/${CASES.length + 1}\n`);
process.exit(bad ? 1 : 0);
