/* Does scripts/ci/should-publish.sh protect the property deploy.yml actually cares about?
   Two properties, pulling opposite ways, and a test that only checks one is worthless:

     1. production must never move BACKWARDS  (the 2026-08-06 incident: a late re-run of an
        older commit published, and #613/#621/#622 vanished from the live site)
     2. production must not STARVE            (2026-09-02: 17 commits and 80 minutes behind,
        because nothing was ever still the tip when its build finished)

   The old rule -- "am I the tip of main?" -- bought 1 by giving up 2. The new rule asks
   whether the PUBLISHED commit is a strict ancestor of mine, which buys both.

   Ancestry is real here, in a throwaway git repository, rather than mocked: the whole question
   is about commit relationships, and a fake would be testing the fake. */
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "ci", "should-publish.sh");
if (!fs.existsSync(SCRIPT)) throw new Error("ANCHOR LOST: scripts/ci/should-publish.sh is gone");

const repo = fs.mkdtempSync(path.join(os.tmpdir(), "cm-publish-"));
const git = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();
const commit = (msg) => { fs.writeFileSync(path.join(repo, "f"), msg); git("add", "f"); git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", msg); return git("rev-parse", "HEAD"); };

git("init", "-q", "-b", "main");
const A = commit("A"), B = commit("B"), C = commit("C"), D = commit("D");
git("checkout", "-q", "-b", "side", B);
const X = commit("X");
git("checkout", "-q", "main");

// _TEST_TIP stands in for `git fetch origin main`, which a throwaway repo has no remote for.
const run = (sha, tip, published) => {
  const out = execFileSync("bash", [SCRIPT], {
    cwd: repo, encoding: "utf8",
    env: { ...process.env, SHA: sha, _TEST_TIP: tip, _TEST_PUBLISHED: published ?? "", GH_TOKEN: "", GITHUB_OUTPUT: "" },
  });
  const m = /current=(true|false)/.exec(out);
  return { publish: m ? m[1] === "true" : null, why: (/::notice::(.*)/.exec(out) || [, ""])[1] };
};

let fail = 0;
const ok = (name, got, want, why) => {
  const good = got === want;
  console.log(`  ${good ? "ok   " : "FAIL "} ${name}  -> ${got ? "publish" : "skip"}${good ? "" : `  (wanted ${want ? "publish" : "skip"})`}`);
  if (!good) fail++; else if (why) console.log(`         ${why}`);
};

console.log("property 2 — a superseded commit may still publish, so deploys cannot starve:");
ok("tip of main, nothing newer", run(D, D, A).publish, true, run(D, D, A).why);
ok("SUPERSEDED but production is older  <- the starvation fix", run(C, D, A).publish, true, run(C, D, A).why);

console.log("\nproperty 1 — production must never move backwards:");
ok("production is NEWER than me (the 2026-08-06 rollback)", run(B, D, C).publish, false, run(B, D, C).why);
ok("production already serves me", run(C, D, C).publish, false, run(C, D, C).why);
ok("production is on a divergent line", run(C, D, X).publish, false, run(C, D, X).why);

console.log("\nfail-safe — an unknown published commit degrades to the OLD strict rule:");
ok("superseded, published unknown", run(C, D, "").publish, false, run(C, D, "").why);
ok("tip of main, published unknown", run(D, D, "").publish, true, run(D, D, "").why);

// A rule that always says "publish" satisfies property 2 and destroys property 1; a rule that
// always says "skip" does the reverse. Both must be exercised or neither is proven.
const verdicts = [run(D, D, A), run(C, D, A), run(B, D, C), run(C, D, C), run(C, D, X), run(C, D, "")].map(r => r.publish);
if (!verdicts.includes(true) || !verdicts.includes(false)) { console.log("  FAIL  the rule returned only one verdict — nothing is proven"); fail++; }

// --- the published-commit lookup ----------------------------------------------------------
// The dangerous input is not an unreadable response -- that yields nothing and falls back to
// the strict tip rule -- but a response read WRONGLY, which could hand back a plausible sha
// that is not live and let a run publish over something newer. So the walk is tested against
// canned payloads, including the 2026-08-06 shape: a FAILURE record sitting on top of a
// healthy site, where taking deployments[0] blindly returns the wrong commit.
const eq = (name, got, want) => {
  const good = got === want;
  console.log(`  ${good ? "ok   " : "FAIL "} ${name}  -> ${JSON.stringify(got).slice(0, 14)}`);
  if (!good) { console.log(`         wanted ${JSON.stringify(want).slice(0, 14)}`); fail++; }
};
const HELPER = path.join(ROOT, "scripts", "ci", "published-sha.py");
if (!fs.existsSync(HELPER)) throw new Error("ANCHOR LOST: scripts/ci/published-sha.py is gone");
const lookup = (blob) => {
  const f = path.join(repo, "fixture.json");
  fs.writeFileSync(f, JSON.stringify(blob));
  return execFileSync("python3", [HELPER, "--fixture", f], { encoding: "utf8" }).trim();
};
const dep = (id, sha) => ({ id, sha });

console.log("\npublished-sha.py — which deployment is actually live:");
eq("a failure record on top of a healthy site is walked PAST (returns the older SUCCESS)",
  lookup({ deployments: [dep(2, "b".repeat(40)), dep(1, "a".repeat(40))],
           statuses: { 2: [{ state: "failure" }], 1: [{ state: "success" }] } }), "a".repeat(40));
eq("the newest successful record wins when both succeeded",
  lookup({ deployments: [dep(2, "b".repeat(40)), dep(1, "a".repeat(40))],
           statuses: { 2: [{ state: "success" }], 1: [{ state: "success" }] } }), "b".repeat(40));
eq("no successful deployment at all -> unknown",
  lookup({ deployments: [dep(1, "a".repeat(40))], statuses: { 1: [{ state: "failure" }] } }), "");
eq("empty deployment list -> unknown", lookup({ deployments: [], statuses: {} }), "");
eq("a truncated sha is refused rather than used",
  lookup({ deployments: [dep(1, "abc")], statuses: { 1: [{ state: "success" }] } }), "");

fs.rmSync(repo, { recursive: true, force: true });
console.log("");
if (fail) { console.error(`probe-should-publish: ${fail} FAILED`); process.exit(1); }
console.log("probe-should-publish: ok — a superseded commit publishes when it moves production forward, never when it would move it back, and the live commit is read correctly.");
