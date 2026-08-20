// Injection cases for check:outage.
//
// The expected result of that guard is "no findings", which is exactly what a BROKEN guard
// prints. So each case below reverts a real, merged fix and requires the guard to fail while
// NAMING the screen it broke — a run that dies from a port race or a dead database must not
// count as a catch.
//
// Every case proves its edit LANDED, by checksum, before it judges the guard. This repo has
// twice recorded an injection reported as "guard missed" when the edit never applied (a `sed`
// that hit the wrong one of two identical lines; a perl escape that worked on bytes). An
// injection that produces a different failure is not a catch.
//
// Cases, in order:
//   1. partners  — revert #1164: PartnerSearch stops taking objectivesUnavailable.  MUST FAIL,
//                  naming Partners.
//   2. home      — revert #1172: the Home tiles print their counts again.           MUST FAIL,
//                  naming Home:revisited (never plain Home — that entry is printed as evidence
//                  and never judged, because it is measured before the reads settle).
//   3. logbook   — revert #1155: MyAscents stops taking logsUnavailable.            MUST FAIL,
//                  naming Logbook:Completed.
//   4. nothing   — no edit at all.                                                  MUST PASS.
//                  Without this the other three are satisfied by a guard that always fails.
//
// Case 4 is not decoration. Cases 1-3 alone are passed by `process.exitCode = 1` at the top of
// the file; only the pair pins the guard to reporting something real.
//
// The fail-closed paths are cheaper to exercise by hand and are NOT run here:
//   ONLY=nosuchtable npm run check:outage   -> "NOTHING WAS BLOCKED", exit 1
// which is the case that matters most, since a guard measuring nothing prints a clean table.
//
// Usage: node scripts/oneoff/inject-outage-cases.mjs [case ...]
// Each case takes a full healthy+failing walk (~4 min), so name the ones you want.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 12);

const CASES = {
  partners: {
    file: "ClimbMatch.jsx",
    from: "objectivesUnavailable={objectivesUnavailable} meListed={",
    to: "meListed={",
    expect: "fail",
    names: /Partners/,
  },
  home: {
    file: "ClimbMatch.jsx",
    from: 'My objectives",objectivesUnavailable?"couldn’t load":objs.length',
    to: 'My objectives",objs.length',
    expect: "fail",
    names: /Home:revisited/,
  },
  logbook: {
    file: "ClimbMatch.jsx",
    from: "<MyAscents logsUnavailable={logsUnavailable} routeById={routeById}",
    to: "<MyAscents routeById={routeById}",
    // TWO call sites, and the harness refused this case until it said so. MyAscents is mounted
    // from both the Logbook tab and the Me tab; reverting one leaves the other wired, so the
    // screen under test would have kept its fix and the run would have read as a MISS.
    hits: 2,
    expect: "fail",
    names: /Logbook:Completed/,
  },
  nothing: { expect: "pass" },
};

const wanted = process.argv.slice(2).filter((a) => CASES[a]);
if (!wanted.length) {
  console.log("name at least one case: " + Object.keys(CASES).join(" "));
  process.exit(1);
}

let bad = 0;
for (const name of wanted) {
  const c = CASES[name];
  const p = c.file ? path.join(ROOT, c.file) : null;
  const original = p ? fs.readFileSync(p, "utf8") : null;
  let landed = true;

  try {
    if (p) {
      const before = sum(p);
      const want = c.hits || 1;
      const n = original.split(c.from).length - 1;
      if (n !== want) {
        console.log(`\n[${name}] EDIT NEVER LANDED — pattern matched ${n} times, expected ${want}. ` +
          `Fix the CASE before doubting the guard.`);
        bad++;
        continue;
      }
      fs.writeFileSync(p, original.split(c.from).join(c.to));
      landed = sum(p) !== before;
      if (!landed) {
        console.log(`\n[${name}] EDIT NEVER LANDED — checksum unchanged.`);
        bad++;
        continue;
      }
      console.log(`\n[${name}] injected into ${c.file} (${before} -> ${sum(p)})`);
    } else {
      console.log(`\n[${name}] no edit — the guard must PASS on an unmodified tree`);
    }

    const r = spawnSync("npm", ["run", "check:outage"], { encoding: "utf8", cwd: ROOT });
    const out = (r.stdout || "") + (r.stderr || "");
    const failed = r.status !== 0;
    const dead = /DID NOT RUN/.test(out);

    if (dead) {
      console.log(`  INCONCLUSIVE — the guard reported it did not run. That is not a catch.`);
      console.log("  " + (out.match(/check:outage DID NOT RUN.*/) || [""])[0]);
      bad++;
    } else if (c.expect === "fail" && failed && c.names.test(out)) {
      console.log(`  caught, and named the right screen (exit ${r.status})`);
    } else if (c.expect === "fail" && failed) {
      console.log(`  FAILED FOR THE WRONG REASON — exit ${r.status} but ${c.names} is not in the output.`);
      bad++;
    } else if (c.expect === "fail") {
      console.log(`  MISSED — the guard passed with the fix reverted.`);
      bad++;
    } else if (c.expect === "pass" && !failed) {
      console.log(`  passed, as it must on a clean tree`);
    } else {
      console.log(`  FALSE POSITIVE — the guard failed on an unmodified tree.`);
      bad++;
    }
  } finally {
    if (p && original !== null) {
      fs.writeFileSync(p, original);
      console.log(`  restored ${c.file} (${sum(p)})`);
    }
  }
}

console.log(bad ? `\n${bad} case(s) did not behave` : "\nall cases behaved");
process.exit(bad ? 1 : 0);
