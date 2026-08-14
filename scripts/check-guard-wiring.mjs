#!/usr/bin/env node
// check:guard-wiring — every check-*.mjs on disk must actually RUN somewhere.
//
// The failure this exists for is not "a gate was removed". It is "a gate was written and
// never wired in", and the two are not equally visible: a removed gate at least leaves a
// diff on package.json, while a guard that was authored, injection-tested, documented in
// CLAUDE.md and then never added to the build chain or a workflow looks — from every
// vantage point anyone actually checks — exactly like a guard that passes. Nobody sees a
// green tick that was never asked for. That is the same shape as check:overlay-discovery
// (a modal no guard could open was not a missing row, it was not a row) and check:drift
// (a workflow cannot report on a run that never existed): a coverage hole is invisible by
// construction unless something asks from outside.
//
// It was prompted by a near-miss rather than a live break. On 2026-08-12 two sessions
// added a gate at the same insertion point in package.json, and reconciling the rebase came
// down to comparing two counts of the build chain — 33 against 33, which looked like a
// dropped gate and turned out to be one side counting `vite build` and the other not. The
// counts agreed by accident and disagreed by accident; neither was evidence. A set diff
// settled it in one command. This is that set diff, run on every build.
//
// Three ways a script counts as wired, and the third is the one a first draft gets wrong:
//   1. named in the `build` chain in package.json
//   2. invoked by a workflow as `npm run <name>`
//   3. invoked by a workflow as `node scripts/<file>` DIRECTLY
// Both invocation forms live in .github/workflows/build-check.yml today — `npm run
// check:refs` on one line and `node scripts/check-migration-claims.mjs` on another. A
// matcher that only knows form 2 reports check:counts and check:drift as unwired when both
// have run on a schedule for weeks. Measured: that draft claimed 5 unwired guards, of which
// 3 were false.
//
// Anything genuinely unwired must be declared in EXCLUDED with a reason. A declaration that
// stops being true FAILS — both directions — so the bookkeeping cannot rot into a list that
// silently permits everything. Same rule as check:field-renders' KNOWN map.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (what) => {
  console.error(`\ncheck:guard-wiring FAILED — ${what}.`);
  console.error("Nothing below was checked. This guard reports absence, so a broken scan");
  console.error("would otherwise read as a clean sweep.\n");
  process.exit(1);
};

// A guard that runs nowhere is the thing being detected, so the detector failing to read
// its own inputs must never print ok. Every read below is fatal on failure.
const SCRIPTS = path.join(ROOT, "scripts");
if (!fs.existsSync(SCRIPTS)) dead("scripts/ does not exist");

const onDisk = fs.readdirSync(SCRIPTS).filter((f) => /^check-.*\.mjs$/.test(f)).sort();
if (!onDisk.length) dead("found zero check-*.mjs files — the scan broke, or scripts/ moved");

let pkg;
try { pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")); }
catch (e) { dead(`package.json could not be parsed: ${e.message}`); }
const npmScripts = pkg.scripts || {};
if (!npmScripts.build) dead("package.json has no `build` script — the chain is the main wiring point");

const WF = path.join(ROOT, ".github", "workflows");
if (!fs.existsSync(WF)) dead(".github/workflows does not exist — CI wiring could not be read");
const wfFiles = fs.readdirSync(WF).filter((f) => /\.ya?ml$/.test(f));
if (!wfFiles.length) dead("found zero workflow files — CI wiring could not be read");

// Strip whole-line YAML comments before matching. render-guards.yml carries a prose comment
// that NAMES check:migration-claims while that guard is actually wired in build-check.yml;
// a naive substring scan credits the wrong file and would keep reporting green after the
// real invocation was deleted. Only full-line comments are stripped — a mid-line `#` inside
// a shell `run:` is not reliably a comment, and guessing there would strip real commands.
const wfText = wfFiles
  .map((f) => fs.readFileSync(path.join(WF, f), "utf8"))
  .join("\n")
  .split("\n")
  .filter((l) => !/^\s*#/.test(l))
  .join("\n");

// Declared exemptions. A name here must be a real file, and must genuinely be unwired.
const EXCLUDED = {
  "check-signed-in.mjs":
    "was wired into render-guards.yml on 2026-08-13 (#919) and UNWIRED again the same day, " +
    "because it went red on main: modal:inboxOpen reports 'added nothing on any of 6 tabs'. " +
    "That is unresolved rather than dismissed — the Inbox's empty-state copy has changed on " +
    "main since the guard's one passing run, so it may be a real regression in that modal " +
    "rather than a fixture artifact. It stays hand-runnable (npm run check:signed-in, which " +
    "still passes end to end apart from that one assertion) and the CI job comes back once " +
    "the inbox question is answered. The durable accounts and secrets it needs are already " +
    "in place, so re-wiring is a one-file change.",
  "check-enrichment-traceable.mjs":
    "takes an enrichment BATCH FILE as its argument and verifies that every number and " +
    "load-bearing feature word in a generated segment also appears in that route's own " +
    "source text — i.e. that a re-homing pass invented nothing. Same shape as " +
    "check-sql-targets below: there is no standing file for a schedule or a build to run " +
    "it against, because the thing it checks exists only between a batch being written " +
    "and `enrich:apply` writing it. It gates that moment, by hand, before the write.",
  "check-sql-targets.mjs":
    "takes a .sql FILE as its argument (`npm run check:sql -- fix.sql`) and reads the " +
    "live DB. There is no standing file to check, so there is nothing for a schedule or " +
    "a build to run it against — it gates the moment a .sql file is handed to the user.",
};

const buildChain = npmScripts.build;
const wiring = new Map();

for (const f of onDisk) {
  const ref = "scripts/" + f;
  if (buildChain.includes(ref)) { wiring.set(f, "build chain"); continue; }

  // form 3: a workflow runs the file directly
  if (wfText.includes(ref)) { wiring.set(f, "workflow (direct node)"); continue; }

  // form 2: a workflow runs an npm script that points at this file
  const viaNpm = Object.entries(npmScripts)
    .filter(([, body]) => body.includes(ref))
    .map(([name]) => name)
    .filter((name) => wfText.includes("run " + name));
  if (viaNpm.length) { wiring.set(f, `workflow (npm run ${viaNpm[0]})`); continue; }

  wiring.set(f, null);
}

const unwired = onDisk.filter((f) => wiring.get(f) === null);

console.log(`check:guard-wiring — ${onDisk.length} check scripts on disk`);

// 1. Anything unwired must be declared.
const undeclared = unwired.filter((f) => !EXCLUDED[f]);
if (undeclared.length) {
  for (const f of undeclared)
    fail(`scripts/${f} is not in the build chain and is not invoked by any workflow — ` +
         `it runs NOWHERE. Wire it into package.json's \`build\` chain, or into a ` +
         `workflow, or declare it in EXCLUDED in this file WITH A REASON.`);
} else ok(`every unwired script is declared (${unwired.length} declared, ${onDisk.length - unwired.length} wired)`);

// 2. A declaration that is no longer true fails — both directions.
for (const name of Object.keys(EXCLUDED)) {
  if (!onDisk.includes(name))
    fail(`EXCLUDED names scripts/${name}, which does not exist. Stale bookkeeping — ` +
         `remove the entry in the same commit that removed the file.`);
  else if (wiring.get(name) !== null)
    fail(`EXCLUDED names scripts/${name} as unwired, but it now runs in the ${wiring.get(name)}. ` +
         `Remove it from EXCLUDED — a stale exemption is room for a real one to hide in.`);
}
if (!failures) ok(`both EXCLUDED entries are real files and genuinely unwired`);

// 3. An npm script pointing at a check file that does not exist is dead wiring: the chain
//    would fail loudly, but a standalone entry just sits there looking like coverage.
for (const [name, body] of Object.entries(npmScripts)) {
  const m = /scripts\/(check-[A-Za-z0-9_-]+\.mjs)/.exec(body);
  if (m && !onDisk.includes(m[1]))
    fail(`npm script "${name}" runs scripts/${m[1]}, which does not exist on disk.`);
}

// 4. Every guard must be NAMED in CLAUDE.md's command block.
//
//    Sections 1-3 ask whether a guard runs. This asks whether anyone can find out that it
//    exists, which is a different hole and was the larger one: measured on 2026-08-13,
//    **11 of the 39 build-chain guards appeared nowhere in CLAUDE.md at all** — including
//    check:contrib-shapes, written and injection-tested the day before by the same session
//    that then failed to document it.
//
//    That matters here more than it would in a repo with a test suite. CLAUDE.md is the
//    file every session reads and is told OVERRIDES its defaults; it is also the only index
//    of what has already been guarded. A guard nobody can see is not merely undocumented,
//    it is an invitation to write it a second time — and this codebase has taken that hit
//    repeatedly: FOUR copies of the grade parser that had drifted into three behaviours,
//    THREE waypoint audits of which two ask the same question with different thresholds.
//    Both were written by people who could not see what already existed.
//
//    Structural, not lexical: it requires the name inside the ```bash command block, which
//    is the index, and NOT merely somewhere in the file. Prose mentions another guard in
//    passing all the time — check:schema is named only inside check:ci-cancel's paragraph,
//    which tells a reader nothing about how to run it or what it covers. An "appears
//    anywhere" test passes on those and would have reported 5 of these 11 as documented.
const mdPath = path.join(ROOT, "CLAUDE.md");
if (!fs.existsSync(mdPath)) dead("CLAUDE.md does not exist — the guard index could not be read");
const mdBlock = /```bash\n([\s\S]*?)```/.exec(fs.readFileSync(mdPath, "utf8"));
if (!mdBlock) dead("CLAUDE.md has no ```bash command block — the guard index could not be found");
const indexed = new Set([...mdBlock[1].matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map((m) => m[1]));
// Fail closed. An index that stopped parsing would otherwise report every guard as
// undocumented, which is loud, OR — if the regex matched nothing at all — the emptiness
// would make `indexed` empty and every guard fail. Both are noisy rather than silent, but a
// block that parsed to a HANDFUL is the dangerous middle: it reads as a real index and is
// not one. 20 is well below the ~45 entries present and well above any partial parse.
if (indexed.size < 20) dead(`CLAUDE.md's command block parsed to only ${indexed.size} entries — the index could not be read`);

// Declared exemptions, same rule as EXCLUDED: a name here must be a real file, and must
// genuinely be absent from the index. Empty today, and it should stay that way — every
// guard in this repo is worth one line.
const UNDOCUMENTED = {};

// An alias is a npm script that runs ONLY this guard — not any chain that happens to
// contain it. `build` matches `scripts/check-fire.mjs` on a substring test, and `npm run
// build` is the third line of the command block, so a substring test credits the block with
// documenting all 39 build-chain guards and this whole section passes vacuously. It did:
// the first draft reported "all 53 guards are named" and injection case 1 (delete a guard's
// line from the block) did not move it. Only the 14 guards outside the chain were really
// being tested, which is how check:sql was still caught — a false pass that looked like a
// clean sweep, and was found ONLY by injection.
const aliasesOf = (f) => Object.entries(npmScripts)
  .filter(([, body]) => new RegExp("^node scripts/" + f.replace(/\./g, "\\.") + "(\\s|$)").test(body.trim()))
  .map(([name]) => name);

const undocumented = onDisk.filter((f) => !aliasesOf(f).some((a) => indexed.has(a)));
const undocUndeclared = undocumented.filter((f) => !UNDOCUMENTED[f]);
if (undocUndeclared.length) {
  for (const f of undocUndeclared)
    fail(`scripts/${f} (npm run ${aliasesOf(f)[0]}) is not named in CLAUDE.md's command ` +
         `block, so nothing tells the next session it exists. Add one line there — a name ` +
         `and what it asks — or declare it in UNDOCUMENTED in this file WITH A REASON.`);
} else ok(`all ${onDisk.length} guards are named in CLAUDE.md's command block`);

for (const name of Object.keys(UNDOCUMENTED)) {
  if (!onDisk.includes(name))
    fail(`UNDOCUMENTED names scripts/${name}, which does not exist. Stale bookkeeping.`);
  else if (!undocumented.includes(name))
    fail(`UNDOCUMENTED names scripts/${name} as undocumented, but it is now in the command ` +
         `block. Remove the entry — a stale exemption is room for a real one to hide in.`);
}

if (failures) {
  console.error(`\ncheck:guard-wiring FAILED — ${failures} problem(s).\n`);
  process.exit(1);
}

const byHow = new Map();
for (const f of onDisk) {
  const k = wiring.get(f) === null ? "declared-exempt" : wiring.get(f).replace(/\(npm run .*\)/, "(npm run)");
  byHow.set(k, (byHow.get(k) || 0) + 1);
}
console.log(`\nok — every guard runs somewhere: ` +
  [...byHow].map(([k, n]) => `${n} ${k}`).join(", ") + "\n");

// Injection cases (run by hand; each must FAIL and name the offending script):
//   1. add a new scripts/check-nothing.mjs and wire it nowhere      -> undeclared, names it
//   2. delete `node scripts/check-fire.mjs &&` from the build chain -> undeclared, names it
//   3. add "check-fire.mjs" to EXCLUDED while it is still wired     -> stale exemption
//   4. rename check-signed-in.mjs                                   -> EXCLUDED names a missing file
//   5. point scripts/ at a directory with no check-*.mjs            -> dead(), not ok
// Section 4 (the CLAUDE.md index), all 5 caught — scripts/oneoff/inject-guard-wiring-docs.sh:
//   1. delete a guard's line from the command block   -> names the guard
//   2. UNDOCUMENTED entry naming a documented guard   -> stale exemption
//   3. rename the ```bash fence                       -> dead("no command block"), not ok
//   4. shrink the block to 2 entries                  -> dead("parsed to only 2"), not ok
//   5. mention a guard in PROSE but not in the block  -> still fails (structural, not lexical)
// Case 1 FALSE-PASSED on the first draft and case 5 with it, and neither was visible by
// reading the code: aliasesOf() matched `scripts/x.mjs` as a substring, so `build` counted
// as an alias of all 39 chain guards and `npm run build` in the block documented every one
// of them. It printed "all 53 guards are named" while testing only 14. Fixing it surfaced
// 6 more undocumented guards, check:migrations among them. Re-run these after ANY change to
// how an alias is resolved.
