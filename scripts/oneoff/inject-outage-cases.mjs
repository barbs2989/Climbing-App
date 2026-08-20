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
//   4. friends   — revert the Crew:Friends fix.                                    MUST FAIL,
//                  naming Crew:Friends.
//   5. groups    — revert the Crew:Groups fix.                                     MUST FAIL,
//                  naming Crew:Groups.
//   6. invites   — revert the Crew:Requests fix.                                   MUST FAIL,
//                  naming Crew:Requests.
//   7. ranks     — revert the Leaderboards fix.                                   MUST FAIL,
//                  naming Ranks. This one is in ClimbMatchCore.jsx, not ClimbMatch.jsx.
//   8. nothing   — no edit at all.                                                 MUST PASS.
//                  Without this the others are satisfied by a guard that always fails.
//
// Cases 4-6 also prove the WALK reaches those three sub-views at all, which is a separate claim
// from whether the fix works: `crewView` defaults to "crews", so before this they were three
// screens the guard had never opened, and a screen that is never opened has no findings for the
// same reason an empty query has no rows.
//
// The "nothing" case is not decoration. The others alone are passed by `process.exitCode = 1` at
// the top of the file; only the pair pins the guard to reporting something real.
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
  // The three Crew sub-views. Each reverts ONE surface, because reverting all three at once
  // cannot tell "the guard sees this screen" from "the guard sees the Crew tab behind it".
  friends: {
    file: "ClimbMatch.jsx",
    // Neutralise the CONDITION rather than deleting a branch: cutting the ternary in half leaves
    // unbalanced JSX, and an injection that produces a SYNTAX ERROR is not a catch -- the guard
    // would fail on a blank app and read as though it had found the defect.
    from: 'connectionsUnavailable?"Couldn’t load your friends',
    to: 'false?"Couldn’t load your friends',
    expect: "fail",
    names: /Crew:Friends/,
  },
  groups: {
    file: "ClimbMatch.jsx",
    from: '{groupsUnavailable?"couldn’t load":joinedGroups.length+" joined"}',
    to: '{joinedGroups.length+" joined"}',
    expect: "fail",
    names: /Crew:Groups/,
  },
  invites: {
    file: "ClimbMatch.jsx",
    from: '>{crewInvitesUnavailable?"Couldn’t load your crew invites":"No crew invites"}</div>',
    to: '>No crew invites</div>',
    expect: "fail",
    names: /Crew:Requests/,
  },
  // The Ranks tab, which was NEVER WALKED until the TABS list was corrected: it said "Me",
  // and NAV's last two entries are "Ranks" and "Profile". So this case pins two things at once
  // -- that the fix works, and that the walk reaches a tab it used to skip entirely.
  ranks: {
    file: "ClimbMatchCore.jsx",
    // The short form of this anchor matches TWICE: #1155 already put a logsUnavailable notice
    // with identical styling in MyAscents. The harness REFUSED the case and said so, which is
    // exactly what it is for -- an injection that edits the wrong one of two identical lines
    // reads as "guard missed" when the guard never saw a change.
    from: 'logsUnavailable?<div style={{fontSize:12,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 10px",marginBottom:9,lineHeight:1.45}}>Couldn’t load your climbs, so your own',
    to: 'false?<div style={{fontSize:12,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 10px",marginBottom:9,lineHeight:1.45}}>Couldn’t load your climbs, so your own',
    expect: "fail",
    names: /Ranks/,
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
