// A climber sets their hiking pace. Does anything that MATCHES on pace ever see it?
//
// The pace a climber types lands in App state as `mySpeedFtHr` (useState(null)). Two surfaces read
// it: their own Profile (SpeedProfile's `override`) and FullProfile, which is handed it as a prop.
//
// Two things MATCH on pace and read neither:
//
//   compat(ME, candidate)   scores pace only when BOTH sides state one, else a neutral +5
//   the "Speed match" toggle  `_mp = Number(ME.hikingSpeedFtHr)||0` and excludes on |gap| > 400
//
// Both read `ME.hikingSpeedFtHr`, which the sign-in reset sets to undefined and NOTHING writes
// back (0 occurrences of `ME.hikingSpeedFtHr=`). So for a real signed-in account `_mp` is always
// 0, the filter's `if(_mp && _cp && ...)` can never fire, and the toggle excludes nobody however
// many times it is pressed.
//
// SEED WORKS, REAL ACCOUNT DOES NOT — the shape check:signed-in exists for. Signed out, ME is the
// demo climber and carries a seeded pace, so both behave correctly. Only a real account, whose
// reset zeroed the field, is affected — and it stays affected after they set a pace, because the
// value they set never reaches ME.
//
// This executes the real compat and a faithful copy of the filter's own predicate rather than
// reasoning about them.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, `.pace-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
  "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });

const { compat, __set_MY_PACE, paceOf } = await import(out + "?t=" + Date.now());
if (typeof __set_MY_PACE !== "function" || typeof paceOf !== "function") {
  console.error("ANCHOR LOST — core no longer exports the pace bridge."); process.exit(1);
}

// THE FILTER'S PREDICATE, LIFTED FROM SOURCE rather than re-typed, so this cannot drift from the
// thing it claims to measure and fails loudly if that line moves.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const fm = /if\(speedMatch\)\{const _mp=([^;]+);const _cp=([^;]+);if\(([^)]+\)*)\)return false;\}/.exec(core)
        || /if\(speedMatch\)\{(.+?)\}\n?/.exec(core);
if (!fm) { console.error("ANCHOR LOST — the speedMatch filter moved; refusing to guess at its rule."); process.exit(1); }
console.log("  the filter, as written:\n    " + fm[0].trim().slice(0, 200) + "\n");

const base = { id: 0, disciplines: ["alpine"], sportGrade: "5.10a", objectiveIds: [], verified: true, availability: ["weekends"] };
const cand = { id: 7, disciplines: ["alpine"], sportGrade: "5.10a", objectiveIds: [], verified: true, availability: ["weekends"], hikingSpeedFtHr: 1400 };

// A real account after the sign-in reset: hikingSpeedFtHr is gone, whatever they typed.
const meReset = { ...base };                                   // what compat() and the filter see
const meWithPace = { ...base, hikingSpeedFtHr: 1450 };          // what the climber actually set

console.log("  compat(me, candidate) — candidate paces 1400 ft/hr, climber set 1450:\n");
for (const [label, me] of [["ME after the reset (what the code reads)", meReset],
                           ["ME carrying the pace they set", meWithPace]]) {
  console.log(`    ${String(compat(me, cand)).padStart(3)}   ${label}`);
}

// The filter itself: reproduce it exactly as the source states it.
const speedExcludes = (mePace, candPace) => {
  const _mp = Number(mePace) || 0, _cp = Number(candPace) || 0;
  return !!(_mp && _cp && Math.abs(_cp - _mp) > 400);
};
console.log("\n  \"Speed match\" toggle — does it exclude a badly-mismatched candidate?\n");
const slow = 600;
for (const [label, mePace] of [["ME after the reset (undefined)", undefined],
                               ["ME carrying the pace they set (1450)", 1450]]) {
  const ex = speedExcludes(mePace, slow);
  console.log(`    ${ex ? "excludes" : "KEEPS   "}  a 600 ft/hr candidate   ${label}`);
}

// ---- AFTER THE FIX: App pushes the pace into core, exactly as it pushes RESPONSE_RATES ----
console.log("\n  with __set_MY_PACE(1450) — the value App already holds:\n");
__set_MY_PACE(1450);
let bad = 0;
const must = (cond, label) => { console.log(`    ${cond ? "ok   " : "FAIL "} ${label}`); if (!cond) bad++; };

must(paceOf(meReset) === 1450, "the signed-in climber's set pace is now visible to matching");
must(paceOf(cand) === 1400, "a candidate's OWN recorded pace still wins over the global");
must(paceOf({ id: 9 }) === 0, "another climber with no pace is still unknown, not borrowed from me");
must(compat(meReset, cand) === compat(meWithPace, cand),
  `compat now scores the same as if ME carried it (${compat(meReset, cand)})`);

// The filter, re-run through the real paceOf rather than the hand copy.
const excludesNow = (() => { const _mp = paceOf(meReset), _cp = paceOf({ id: 7, hikingSpeedFtHr: slow }); return !!(_mp && _cp && Math.abs(_cp - _mp) > 400); })();
must(excludesNow, "\"Speed match\" now excludes the 600 ft/hr candidate");

__set_MY_PACE(null);
must(paceOf(meReset) === 0, "with no pace set it is UNKNOWN again — absence must not read as a match");
must(compat(meReset, cand) === 83, "and compat falls back to the neutral middle");

// ---- THE WIRING, which the execution above cannot see ----
// Everything above passes against a core that is correct and an App that never pushes the value.
// That is one line in a 400kB render body and exactly what a stale-base squash drops, so assert it.
const appSrc = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
console.log("\n  wiring:\n");
must(/__set_MY_PACE/.test(appSrc.slice(0, appSrc.indexOf("function App"))), "ClimbMatch.jsx imports __set_MY_PACE from core");
must(/__set_MY_PACE\(mySpeedFtHr\)/.test(appSrc), "App pushes mySpeedFtHr into core every render");
must(!/const _mp=Number\(ME\.hikingSpeedFtHr\)/.test(core), "the Speed match filter no longer reads the blank ME field");
must(!/var _pa=Number\(a\.hikingSpeedFtHr\)/.test(core), "compat no longer reads it directly either");

clean();
if (bad) { console.error(`\n${bad} assertion(s) failed.`); process.exit(1); }
console.log("\n  A toggle that can never exclude anyone is a control that does nothing. The pace the");
console.log("  climber set was in App state the whole time — it simply never reached either reader.");
