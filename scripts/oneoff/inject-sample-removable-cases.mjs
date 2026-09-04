// Injection suite for check:sample-content-removable.
//
// Its healthy output is "everything is gated", which is also what a broken traversal prints — the
// failure this repo records under half a dozen names. So each case reproduces a way the removal
// contract could quietly stop being true, and asserts the guard SAYS SO. Every edit proves it
// landed by checksum and restores the file byte-identically.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const sha = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const CASES = [
  {
    name: "ungated",
    why: "a promised constant loses its gate — the exact thing that makes the flag stop being the whole switch",
    file: CORE,
    find: "const COMMENTS = DEMO_FILLERS ? [",
    repl: "const COMMENTS = true ? [",
    expect: /sample comment.*NOT initialised from DEMO_FILLERS/s,
  },
  {
    name: "nonempty-off",
    why: "the gate survives but its OFF branch swaps one set of samples for another instead of removing them",
    file: CORE,
    find: "const GROUPS=DEMO_FILLERS?[{id:\"group_wasatch_trad\"",
    repl: "const GROUPS=DEMO_FILLERS?[{id:\"group_wasatch_trad2\"",
    // renaming the id alone must NOT fire — this case exists to prove the guard is not merely
    // matching on that literal. Expect a PASS.
    expectPass: true,
  },
  {
    name: "renamed",
    why: "a promised constant is renamed, so its entry silently stops asking its question",
    file: CORE,
    find: "const FILLER_CLIMBERS=DEMO_FILLERS?",
    repl: "const SAMPLE_CLIMBERS=DEMO_FILLERS?",
    expect: /filler climber.*NOT initialised from DEMO_FILLERS|not listed in this guard/s,
  },
  {
    name: "inline-reworded",
    why: "an inline sample seed is reworded, so the marker matches nothing and its surface goes unchecked",
    file: APP,
    find: 'id:"cat_ex1"',
    repl: 'id:"cat_sample1"',
    expect: /sample belay catch could not be found/s,
  },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSha = sha(c.file);
  if (before.split(c.find).length - 1 !== 1) {
    console.log(`  SKIP  ${c.name}: anchor \`${c.find.slice(0, 50)}\` is not unique — the case would edit the wrong thing.`);
    bad++;
    continue;
  }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  const landed = sha(c.file) !== beforeSha;

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "check-sample-content-removable.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); code = e.status || 1; }

  fs.writeFileSync(c.file, before);
  const restored = sha(c.file) === beforeSha;

  const ok = c.expectPass ? code === 0 : (code !== 0 && c.expect.test(out));
  console.log(`  ${ok ? "ok   " : "FAIL "} ${c.name} — ${c.why}`);
  if (!landed) { console.log("        edit never landed (checksum unchanged) — the case proved nothing."); bad++; continue; }
  if (!restored) { console.log("        FILE NOT RESTORED."); bad++; continue; }
  if (!ok) {
    bad++;
    console.log(`        expected ${c.expectPass ? "a PASS" : "a failure matching " + c.expect}; got exit ${code}`);
    console.log("        " + out.split("\n").filter((l) => /FAIL|ok —|NOTE/.test(l)).slice(0, 3).join("\n        "));
  }
}
console.log(bad ? `\n${bad} case(s) did not behave.` : `\nok — ${CASES.length}/${CASES.length}.`);
process.exit(bad ? 1 : 0);
