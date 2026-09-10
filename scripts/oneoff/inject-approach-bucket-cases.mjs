#!/usr/bin/env node
// Does check:add-route-fields catch the approach bucket coming back?
//
// Its healthy output is "the approach bucket keys are gone", which is also what a broken scan
// prints. Each case edits the tree, proves the edit LANDED by checksum, runs the guard, and is
// judged on the guard's OWN failure text. Files are restored byte-identically.
//
// Case 3 must stay SILENT and is the near-miss this assertion actually hit: the JSX comment left
// where the control used to be NAMES all four keys, so a raw scan reports the removal as a
// re-introduction — a guard failing on its own documentation.
//
// Do not commit while this is running.
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const CORE = "ClimbMatchCore.jsx";
const GUARD = "scripts/check-add-route-fields.mjs";
const sum = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

// A stable anchor inside AddRoute that the removal did not touch.
const ANCHOR = '{sf("road")?';

const CASES = [
  {
    name: "1-the-bucket-control-comes-back",
    why: "REAL DEFECT: chips writing an opaque key into a prose column",
    file: CORE, find: ANCHOR,
    repl: '{sf("approach")?<div>{[["u1","< 1 mi"],["1to3","1–3 mi"],["3to6","3–6 mi"],["6plus","6+ mi"]].map(o=>o[1])}</div>:null}' + ANCHOR,
    expect: /approach bucket key\(s\) u1, 1to3, 3to6, 6plus are back/,
  },
  {
    name: "2-one-key-alone-still-fires",
    why: "a partial re-introduction must not slip through on the strength of the other three",
    file: CORE, find: ANCHOR,
    repl: '{["3to6"].map(x=>x)}' + ANCHOR,
    expect: /approach bucket key\(s\) 3to6 are back/,
  },
  {
    name: "3-SILENT-a-comment-naming-the-keys",
    why: "MUST PASS — the removal's own explanation quotes all four; a guard that fired on it would forbid explaining itself",
    file: CORE, find: ANCHOR,
    repl: '{/* never re-add "u1" / "1to3" / "3to6" / "6plus" here */}' + ANCHOR,
    expect: null,
  },
  {
    name: "4-MUST_COVER-still-detects-a-stale-pin",
    why: "the pinned-field check must still fire — re-pinning approach while nothing submits it",
    file: GUARD, find: '  "season", "commit", "descentText",',
    repl: '  "approach", "season", "commit", "descentText",',
    expect: /the proposal no longer submits approach/,
  },
];

let pass = 0, bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`HARNESS BUG  ${c.name}: anchor matched ${n}x in ${c.file}`); bad++; continue; }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  if (sum(c.file) === beforeSum) { console.log(`HARNESS BUG  ${c.name}: checksum unmoved`); fs.writeFileSync(c.file, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [GUARD], { encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status ?? 1; }

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`HARNESS BUG  ${c.name}: TREE NOT RESTORED`); bad++; continue; }

  const fails = out.split("\n").filter((l) => l.includes("FAIL")).join("\n");
  if (c.expect === null) {
    if (code === 0 && !fails) { console.log(`ok    ${c.name} — correctly silent`); pass++; }
    else { console.log(`MISS  ${c.name}: fired on correct work\n${fails}`); bad++; }
  } else if (code !== 0 && c.expect.test(fails)) { console.log(`ok    ${c.name} — caught, by its own message`); pass++; }
  else { console.log(`MISS  ${c.name} (${c.why})\n  exit=${code}\n${fails || out.trim().split("\n").slice(-4).join("\n")}`); bad++; }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified`);
process.exit(bad ? 1 : 0);
