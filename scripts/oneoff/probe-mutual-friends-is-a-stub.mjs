// MUTUAL FRIENDS IS A STUB, AND EVERY ENTRY POINT IS CORRECTLY GATED OFF IT.
//
// `mutualIds()` takes NO ARGUMENTS and returns a literal `[]`, so `mutualCount()` is 0 for every
// climber, always. Each of the five UI entry points renders as `mutualCount(...) ? control : null`,
// so the "N mutual friends ›" row never appears and the Mutual friends sheet is unreachable through
// the app -- only `?z=mutualModal`, the guards' own opener, can mount it.
//
// This is the OPPOSITE of the usual defect here: nothing on screen is false, because whoever built
// it gated every consumer. What it costs is a whole feature's UI sitting inert, and the risk that a
// session finds the sheet through the overlay walk and polishes copy no user can read. That already
// happened once (#1637 fixed its subtitle), which is why this is written down.
//
// It is NOT a regression: `git log -S "function mutualIds"` returns only the original upload and
// the monolith split (#497). It was never implemented and never reverted.
//
// EXECUTED rather than read, because "returns a literal" is the kind of claim a refactor quietly
// falsifies -- and because a reader can talk themselves into believing a one-line function.
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(ROOT, ".mutual-probe-"));
try {
  const entry = path.join(tmp, "entry.mjs");
  fs.writeFileSync(entry, 'export { mutualIds, mutualCount, mutualLabel, mutualFirstNames } from "../ClimbMatchCore.jsx";\n');
  const out = path.join(tmp, "b.mjs");
  execSync(`npx esbuild ${entry} --bundle --format=esm --platform=node --jsx=automatic ` +
           `--loader:.jsx=jsx --define:import.meta.env={} --external:react --external:react-dom ` +
           `--external:@tanstack/react-query --external:@supabase/supabase-js --outfile=${out}`,
           { stdio: ["ignore", "ignore", "pipe"] });
  const m = await import(out);
  if (typeof m.mutualIds !== "function") { console.error("BROKEN: mutualIds is not exported."); process.exit(1); }

  // A climber id and a friend list that OVERLAP as much as possible. If any input could produce a
  // mutual friend, this one would.
  const cases = [
    ["seed climber 1 vs my friends [1,2,3]", 1, [1, 2, 3]],
    ["climber 2 vs [2]", 2, [2]],
    ["climber 0 (ME) vs [0,1,2,3,4,5]", 0, [0, 1, 2, 3, 4, 5]],
    ["a uuid vs a uuid list", "u-1", ["u-1", "u-2"]],
    ["no arguments at all", undefined, undefined],
  ];
  let nonEmpty = 0;
  console.log("mutualIds.length (declared parameters): " + m.mutualIds.length + "\n");
  for (const [label, id, mine] of cases) {
    const ids = m.mutualIds(id, mine);
    const n = m.mutualCount(id, mine);
    const lbl = m.mutualLabel(id, mine);
    if (ids.length || n) nonEmpty++;
    console.log("  " + label.padEnd(38) + " ids=" + JSON.stringify(ids) + "  count=" + n + '  label="' + lbl + '"');
  }
  console.log("\ninputs producing a mutual friend: " + nonEmpty + " of " + cases.length);
  if (nonEmpty) {
    console.log("\nmutualIds IS implemented now -- this probe is STALE. Delete it and remove the note");
    console.log("in CLAUDE.md that says the feature is unreachable.");
    process.exit(1);
  }
  console.log("\nSo mutualCount() is 0 for every climber, and every entry point renders as");
  console.log("`mutualCount(...) ? control : null`. The Mutual friends sheet is unreachable in the");
  console.log("app. Nothing on screen is false -- the feature is absent, not lying.");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
