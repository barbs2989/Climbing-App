// Injection cases for check-topo-outage-copy.mjs.
//
// The guard's healthy output is "8 cases, 0 failures", which is exactly what a broken probe
// prints. Each case edits RouteDetail.jsx, proves the edit LANDED by checksum, runs the guard,
// and restores the file byte-identically.
//
// Case 1 is the real historical defect, not a synthetic one: the body as it stood before this
// change, unconditioned under a headline that already flipped.
//
// CASE 3 MUST FAIL ON THE HEALTHY SIDE. Deleting the invitation from both states also silences
// case 2, so a guard that only asserted the outage half would go GREEN on a blanket rewrite that
// turned a correct empty state into an error message. That is the direction that teaches authors
// to break working copy, and it is the case worth having.

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const F = path.join(ROOT, "RouteDetail.jsx");
const GUARD = path.join(ROOT, "scripts/check-topo-outage-copy.mjs");
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);

const ORIGINAL = fs.readFileSync(F, "utf8");
const BEFORE = sum(ORIGINAL);

const INVITE = "A topo overlays the route line and markers on a photo of the wall, face, or line. Got a clear shot? Add it and draw the line so the next party can follow it.";
const BROKEN_BODY = "A topo may already be on file for this route — this one list just didn’t load, so this is not a claim that there is none. Check your connection and try again.";

const CASES = [
  {
    name: "1 the real defect: the body ignores the flag and always invites",
    expect: "fail",
    edit: (s) => s.replace(`body:"${BROKEN_BODY}"}`, `body:"${INVITE}"}`),
  },
  {
    name: "2 the headline ignores the flag too",
    expect: "fail",
    edit: (s) => s.replace('?{head:"Couldn’t load the topos"', '?{head:"No topo yet"'),
  },
  {
    name: "3 blanket rewrite: neither state invites the first topo",
    expect: "fail",
    edit: (s) => s.replace(`:{head:"No topo yet",\n      body:"${INVITE}"}`,
      `:{head:"No topo yet",\n      body:"${BROKEN_BODY}"}`),
  },
  {
    name: "4 the JSX stops using the decision (copy reaches no screen)",
    expect: "fail",
    edit: (s) => s.replace("{topoCopy.body}</div>", "{\"A topo, once somebody adds one.\"}</div>"),
  },
  {
    name: "5 an unrelated comment edit — must stay SILENT",
    expect: "pass",
    edit: (s) => s.replace("export function topoEmptyCopy(unavailable){",
      "/* injection case 5: a comment is not a regression */\nexport function topoEmptyCopy(unavailable){"),
  },
];

let bad = 0;
for (const c of CASES) {
  const edited = c.edit(ORIGINAL);
  if (edited === ORIGINAL) {
    console.log(`  HARNESS  ${c.name}\n           EDIT NEVER LANDED — the pattern did not match. Fix the case, not the guard.`);
    bad++;
    continue;
  }
  fs.writeFileSync(F, edited);
  if (sum(fs.readFileSync(F, "utf8")) === BEFORE) {
    console.log(`  HARNESS  ${c.name}\n           checksum unchanged after writing — the edit did not reach disk.`);
    bad++;
    fs.writeFileSync(F, ORIGINAL);
    continue;
  }
  let code = 0, output = "";
  try {
    output = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    code = e.status ?? 1;
    output = (e.stdout || "") + (e.stderr || "");
  }
  fs.writeFileSync(F, ORIGINAL);
  if (sum(fs.readFileSync(F, "utf8")) !== BEFORE) {
    console.log("  HARNESS  restore did not return the file byte-identically — STOP and check git status.");
    process.exit(1);
  }

  const caught = code !== 0;
  const want = c.expect === "fail";
  const verdict = caught === want ? "OK  " : "MISS";
  if (caught !== want) bad++;
  const first = output.split("\n").find((l) => /FAIL|FAILED/.test(l)) || "(no failure line)";
  console.log(`  ${verdict}  ${c.name}`);
  console.log(`        expected the guard to ${c.expect}, it ${caught ? "failed" : "passed"} — ${first.trim()}`);
}

console.log(`\ninject-topo-outage-cases: ${CASES.length - bad}/${CASES.length} behaved as specified`);
process.exit(bad ? 1 : 0);
