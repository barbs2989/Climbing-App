// Does any workflow pin a GitHub Action below the version this repo has moved to?
//
// THE FAILURE THIS EXISTS FOR, and it is already scheduled to recur. On 2026-08-13 every one
// of the five actions this repo uses still targeted the Node 20 runtime, which reached EOL in
// April. GitHub was force-migrating them onto Node 24 and printing a deprecation warning on
// every job; when it stops forcing, CI stops -- all of it, at once, for reasons unrelated to
// any commit. #899 bumped all five.
//
// Nothing prevented that and nothing prevents the next one. The regression shape is not a
// downgrade, which nobody does deliberately -- it is a NEW job copied from an older block:
// #895 was open with a `merge-survival` job pinning checkout@v4 and setup-node@v4, written
// before #899 and correct when it was written. Whichever merged second silently reintroduced
// the dead runtime, and no gate would have said so.
//
// A VERSION FLOOR, NOT "THE LATEST". This deliberately does not ask GitHub what the newest
// release is: that is a network call in a build gate, it makes the build fail on a day
// upstream ships a major, and a major bump is a decision (three of the five carried breaking
// changes -- see the notes beside FLOORS). The floor is what THIS repo has already moved to
// and verified. Going forward is a deliberate edit here; going backward is a failure.
//
// Static -- no network, no browser -- so it sits in `npm run build` with the other gates.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WF = path.join(ROOT, ".github", "workflows");

// The version this repo has moved to and verified. Raise a number here in the SAME commit
// that raises it in the workflows. Each note records what was checked before the bump,
// because a major bump is a decision and the reasoning is the expensive part.
// The Node the guards THEMSELVES run on, which is a different question from the runtime
// the actions use. Node 20 went end-of-life in April 2026 and CI ran it for four months
// after; #899 fixed the actions and deliberately left this alone, because the local machine
// was on 20 and a CI-only bump is exactly the CI/local drift this repo works to avoid.
// Raised to 22 once that was settled. Raise it here in the SAME commit that raises it in
// the workflows.
const NODE_FLOOR = 22;

const FLOORS = {
  // v5 moved to the Node 24 runtime; v7 is ESM and blocks fork-PR checkout under
  // pull_request_target / workflow_run -- neither trigger is used here.
  "actions/checkout": 7,
  // v5 added automatic caching keyed on a `packageManager` field in package.json (this repo
  // has none, and every call site sets `cache: npm` explicitly); v6 narrowed that to npm.
  "actions/setup-node": 7,
  // v5/v6 are runtime bumps; v7 adds an opt-in `archive: false` for single files.
  "actions/upload-artifact": 7,
  // v5 is the Node 24 runtime bump.
  "actions/deploy-pages": 5,
  // v4 STOPPED INCLUDING DOTFILES -- a dropped `.nojekyll` breaks Pages serving silently.
  // Verified none exist: neither `public/` nor a built `dist/` carries a hidden file, and
  // Vite emits `assets/` with no underscore directories, so this repo never needed one.
  "actions/upload-pages-artifact": 5,
};

let failures = 0;
const fail = (m) => { console.log(`  FAIL  ${m}`); failures++; };
const ok = (m) => console.log(`  ok    ${m}`);
const dead = (m) => { console.error(`\ncheck:action-versions DIED — ${m}\n`); process.exit(1); };

if (!fs.existsSync(WF)) dead(`${path.relative(ROOT, WF)} does not exist — nothing was scanned`);
const files = fs.readdirSync(WF).filter((f) => /\.ya?ml$/.test(f));
if (!files.length) dead("no workflow files found — the scan is broken, not the CI clean");

// Comments are stripped before anything is matched, and that is load-bearing: deploy.yml
// carries a past-tense account of the 2026-08-06 outage that NAMES `deploy-pages@v4`. That
// prose is history and must not read as a pin. Same rule as check:ci-cancel, which had to
// strip comments for exactly the same reason one file over.
const uses = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(WF, f), "utf8");
  src.split("\n").forEach((line, i) => {
    const code = line.replace(/#.*$/, "");
    const m = /uses:\s*([\w.-]+\/[\w.-]+)@v(\d+)/.exec(code);
    if (m) uses.push({ file: f, line: i + 1, action: m[1], major: Number(m[2]) });
  });
}
if (!uses.length) dead(`scanned ${files.length} workflow file(s) and found NO action pins — the match is broken`);

console.log(`check:action-versions — ${uses.length} action pin(s) across ${files.length} workflow file(s)\n`);

// 1. Nothing may sit below the floor.
let below = 0;
for (const u of uses) {
  const floor = FLOORS[u.action];
  if (floor === undefined) continue;
  if (u.major < floor) {
    below++;
    fail(`${u.file}:${u.line} pins ${u.action}@v${u.major}, below the v${floor} this repo ` +
         `moved to. A job copied from an older block reintroduces a runtime that is already ` +
         `deprecated. Bump it, or raise the floor in FLOORS with a note saying what changed.`);
  }
}
if (!below) ok(`every pin is at or above its declared floor`);

// 2. An unregistered action fails, so adding one is a decision rather than a default.
const unregistered = [...new Set(uses.filter((u) => !FLOORS[u.action]).map((u) => u.action))];
if (unregistered.length)
  for (const a of unregistered)
    fail(`${a} is used but has no entry in FLOORS. Add one recording the version this repo ` +
         `has verified — an unpinned-by-policy action is how the last one drifted for months.`);
else ok(`all ${Object.keys(FLOORS).length} actions in use are registered`);

// 3. A stale floor fails, so the list cannot rot into a description of workflows that are gone.
const inUse = new Set(uses.map((u) => u.action));
for (const a of Object.keys(FLOORS))
  if (!inUse.has(a)) fail(`FLOORS declares ${a}, which no workflow uses. Stale bookkeeping — remove it.`);
if ([...Object.keys(FLOORS)].every((a) => inUse.has(a))) ok(`no stale FLOORS entry`);

// 4. The Node the guards run on. Same regression shape as an action pin and the same cause:
// a new job copied from an older block. Comments are stripped above, so prose recording the
// old value cannot read as a pin.
const nodePins = [];
for (const f of files) {
  fs.readFileSync(path.join(WF, f), "utf8").split("\n").forEach((line, i) => {
    const m = /node-version:\s*'?"?(\d+)/.exec(line.replace(/#.*$/, ""));
    if (m) nodePins.push({ file: f, line: i + 1, major: Number(m[1]) });
  });
}
if (!nodePins.length) dead(`scanned ${files.length} workflow file(s) and found NO node-version pins — the match is broken`);
const oldNode = nodePins.filter((n) => n.major < NODE_FLOOR);
for (const n of oldNode)
  fail(`${n.file}:${n.line} pins node-version ${n.major}, below the ${NODE_FLOOR} this repo moved to. ` +
       `Node ${n.major} is out of support; raise it, or raise NODE_FLOOR with a note saying why.`);
if (!oldNode.length) ok(`all ${nodePins.length} node-version pin(s) are at or above ${NODE_FLOOR}`);

console.log("");
if (failures) {
  console.error(`check:action-versions FAILED — ${failures} problem(s).\n`);
  process.exit(1);
}
console.log("check:action-versions ok — no workflow pins an action below the version this repo has moved to.\n");

// Injection-tested; cases in scripts/oneoff/inject-action-version-cases.sh:
//   1. pin checkout@v4 in a new job        -> FAIL naming file, line and floor  (the #895 shape)
//   2. add a third-party action            -> FAIL as unregistered
//   3. FLOORS entry no workflow uses       -> FAIL as stale
//   4. comment naming deploy-pages@v4      -> PASS (history, not a pin)
//   5. break the `uses:` regex             -> DIED "found NO action pins", never ok
//   6. pin node-version back to 20          -> FAIL naming file, line and NODE_FLOOR
//   7. break the node-version regex         -> DIED "found NO node-version pins", never ok
