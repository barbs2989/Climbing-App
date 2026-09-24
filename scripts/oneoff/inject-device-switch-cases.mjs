#!/usr/bin/env node
/* INJECTION SUITE for check:visibility-switches' `device` kind.
 *
 * The healthy output of that guard is "ok", which is also what a rule that cannot fire prints.
 * `how:"device"` is the first kind here that does NOT rest on a column, so it is the first that
 * could quietly become an escape hatch — a way to declare a switch persistent without persisting
 * anything a climber would notice. These cases are what stop that.
 *
 * Each case proves its edit LANDED by checksum before the guard is believed, restores every file
 * it touched BYTE-IDENTICALLY, and is judged on the guard's OWN FAIL text rather than on an exit
 * code: this guard fails closed for half a dozen unrelated reasons, and a case that merely made it
 * exit 1 would prove nothing about the rule it names.
 *
 * The harness also REFUSES any expectation that already appears in the clean run. An expectation
 * written against the text an assertion prints when it PASSES reports MISSED against a guard
 * firing perfectly, which this repo has recorded making three separate times.
 *
 * Run it from a clean tree. It edits app files in place, so do not commit while it is running.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUARD = path.join(ROOT, "scripts", "check-visibility-switches-persist.mjs");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(ROOT, f))).digest("hex");

const APP = "ClimbMatch.jsx";
const PREF = "lib/browse-visibility-pref.js";
const PRES = "lib/presence.js";
const TOUCHABLE = [APP, PREF, PRES];

/* Only FAIL lines. The guard prints its rule labels on `ok` lines too, and `dead()` writes
 * "FAIL: …" on a line of its own, so both shapes count and nothing else does. */
function runGuard() {
  try {
    const out = execFileSync("node", [GUARD], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, fails: [], all: out };
  } catch (e) {
    const all = (e.stdout || "") + (e.stderr || "");
    const fails = all.split("\n").filter((l) => l.trimStart().startsWith("- ") || l.startsWith("FAIL:"));
    return { code: e.status == null ? -1 : e.status, fails, all };
  }
}

const CASES = [
  {
    name: "seed-reverted",
    why: "the real pre-ship state: the switch renders and toggles, and forgets on reload",
    file: APP,
    find: "useState(visibleWhileBrowsingPref)",
    repl: "useState(false)",
    expect: "is not seeded from its stored value",
  },
  {
    name: "save-gone",
    why: "the toggle works for this session and never persists — the volatile-switch defect",
    file: APP,
    find: "setVisibleWhileBrowsing(next);saveVisibleWhileBrowsing(next);",
    repl: "setVisibleWhileBrowsing(next);",
    expect: "nothing calls `saveVisibleWhileBrowsing(`",
  },
  {
    /* THE LOAD-BEARING CASE. Every other clause is satisfied by a switch that persists a value
     * nothing reads — which is exactly what the four controls still behind PRIVACY_CONTROLS_LIVE
     * are, and exactly what `device` must never be allowed to bless. */
    name: "consumer-gone",
    why: "persists perfectly and governs nothing: the promise-to-nobody shape, made durable",
    file: APP,
    find: "visible:visibleWhileBrowsing}",
    repl: "visible:true}",
    expect: "reaches no consumer",
  },
  {
    /* No wiring test can see this one: the switch is stored, restored, and handed to the right
     * place, and the place ignores it. */
    name: "enforcement-broken",
    why: "the consumer receives the flag and broadcasts the name anyway",
    file: PRES,
    find: "{ id: m.id, visible: false }",
    repl: "{ id: m.id, name: m.name, visible: false }",
    expect: "does not OMIT the climber's identity",
  },
  {
    name: "pref-unguarded",
    why: "a raw localStorage read throws under SSR and in private mode, and validates nothing on read",
    file: PREF,
    find: "const pref = definePref(",
    repl: "const pref = rawPref(",
    expect: "does not go through `definePref`",
  },
  {
    name: "import-gone",
    why: "the module exists and the app never reaches it",
    file: APP,
    find: `import { visibleWhileBrowsingPref, saveVisibleWhileBrowsing } from "./lib/browse-visibility-pref";`,
    repl: "",
    expect: "imports nothing from ./lib/browse-visibility-pref",
  },
  {
    /* A COMMENT MUST NOT SATISFY THE CONSUMER CLAUSE. This guard reads raw source — deliberately,
     * because the offsets-preserving blanker desynchronises on JSX apostrophes and a naive
     * block-comment strip has eaten a fifth of a file in this repo before. So the question is
     * empirical: with the real consumer removed and a comment quoting it left behind, does the
     * rule still fire? If it does not, `device` can be satisfied by documentation. */
    name: "comment-cannot-stand-in-for-the-consumer",
    why: "presence is not use — a quoted shape must not satisfy a wiring rule",
    file: APP,
    find: "visible:visibleWhileBrowsing}",
    repl: "visible:true}/* handed to presence as visible:visibleWhileBrowsing */",
    expect: "reaches no consumer",
  },
  {
    /* The other half of the case above, and the half that stops the fix over-reaching: with the
     * real wiring INTACT, a comment quoting the shape is documentation and must be ignored. A
     * guard that fired here would forbid explaining itself — the trap this repo records as a guard
     * failing on its own documentation. */
    name: "SILENT-comment-beside-live-wiring",
    why: "documentation quoting the shape is not a defect",
    file: APP,
    find: "visible:visibleWhileBrowsing}",
    repl: "visible:visibleWhileBrowsing}/* presence receives visible:visibleWhileBrowsing */",
    silent: true,
  },
  {
    /* The consumer is DECLARED, so a rename has to be loud rather than quietly costing the
     * clause. "The anchor moved, re-point it" and "the consumer really went, so the switch now
     * governs nothing" want opposite repairs, and the message says both. */
    name: "consumer-renamed",
    why: "a declared anchor that stops matching must fail, not silently skip the clause",
    file: APP,
    find: "useRoutePresence(",
    repl: "useRoutePresenceRenamed(",
    expect: "ANCHOR LOST",
  },
];

/* ── refuse to start on a tree that is not already green ───────────────────────────────────── */
const before = Object.fromEntries(TOUCHABLE.map((f) => [f, sum(f)]));
const clean = runGuard();
if (clean.code !== 0) {
  console.error("REFUSED: the guard is not green on this tree, so no case would be attributable.\n" + clean.all);
  process.exit(1);
}

/* ── refuse an expectation the HEALTHY run already prints ──────────────────────────────────── */
for (const c of CASES) {
  if (c.silent) continue;
  if (clean.all.includes(c.expect)) {
    console.error(`REFUSED: case "${c.name}" expects text the CLEAN run already prints — it would pass without the guard firing.`);
    process.exit(1);
  }
}

let pass = 0;
for (const c of CASES) {
  const p = path.join(ROOT, c.file);
  const orig = fs.readFileSync(p, "utf8");
  const n = orig.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name}: find string matched ${n} times in ${c.file}, expected 1`); continue; }
  fs.writeFileSync(p, orig.replace(c.find, c.repl));
  const landed = sum(c.file) !== before[c.file];
  const r = landed ? runGuard() : null;
  fs.writeFileSync(p, orig);
  if (sum(c.file) !== before[c.file]) { console.log(`  TREE NOT RESTORED after ${c.name} — stop and check ${c.file}`); process.exit(1); }

  if (!landed) { console.log(`  HARNESS BUG  ${c.name}: edit never landed`); continue; }

  if (c.silent) {
    if (r.code === 0) { console.log(`  SILENT       ${c.name} — ${c.why}`); pass++; }
    else console.log(`  FIRED ON CORRECT WORK ${c.name}: ${c.why}\n${r.fails.map((l) => "      " + l.trim()).join("\n")}`);
    continue;
  }
  const hit = r.fails.some((l) => l.includes(c.expect));
  if (hit) { console.log(`  CAUGHT       ${c.name} — ${c.why}`); pass++; }
  else if (r.code === 0) console.log(`  MISSED       ${c.name}: the guard passed. ${c.why}`);
  else console.log(`  WRONG FAILURE ${c.name}: exit ${r.code}, but no FAIL line said "${c.expect}".\n${r.fails.map((l) => "      " + l.trim()).join("\n")}`);
}

for (const f of TOUCHABLE) if (sum(f) !== before[f]) { console.error("TREE NOT RESTORED: " + f); process.exit(1); }
console.log(`\n${pass}/${CASES.length} behaved as declared; every touched file restored byte-identically.`);
process.exitCode = pass === CASES.length ? 0 : 1;
