#!/usr/bin/env node
// Do the two checkers of the profile/fire distance readouts actually catch what they describe?
//
// There are two, deliberately, and they see different things:
//   GUARD  `check:units --only=profile`  — SOURCE. In the build chain, so it actually runs.
//   PROBE  probe-full-profile-distance-honours-units.mjs — RENDERS FullProfile in both units,
//          which the guard cannot: FullProfile ends in createPortal and check:units bundles
//          react-dom IN, so the portal cannot be flattened from outside its bundle.
//
// A case names which of them must react. Requiring BOTH everywhere would be wrong — the probe
// does not render the fire panel, and the guard cannot see a number that failed to convert at
// runtime — so each case states its own targets and is judged on that checker's OWN failure text.
//
// Case 5 must stay SILENT in both: `uDistMi(dist)` is a different ROUNDING, not a units defect,
// and a checker that fired on it would forbid a correct refactor.
//
// Every edit is proven to land by checksum, and every file is restored byte-identically.
// Do not commit while this is running.
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const CORE = "ClimbMatchCore.jsx";
const FIRE = "lib/FireNearRoute.jsx";
const PROBE = ["node", ["scripts/oneoff/probe-full-profile-distance-honours-units.mjs"]];
const GUARD = ["node", ["scripts/check-units.mjs", "--only=profile"]];
const sum = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

const HEADER = '<span style={{color:C.blue}}>{uDistMi(+dist.toFixed(1))+" away"}</span>';
const CARD = '{score>=80?"Excellent match":"Good match"} · {uDistMi(+dist.toFixed(1))+" away"}';
const FIRELINE = "and {fires.length - 4} more within {uDistMi(radiusMi)}";

const CASES = [
  {
    name: "1-header-prints-bare-miles",
    why: "REAL DEFECT: the header read `{dist.toFixed(1)} mi away`",
    file: CORE, find: HEADER,
    repl: '<span style={{color:C.blue}}>{dist.toFixed(1)} mi away</span>',
    targets: { guard: /hardcoded unit/, probe: /hardcoded unit|metric still renders miles/ },
  },
  {
    name: "2-compatibility-card-prints-bare-miles",
    why: "REAL DEFECT: the card read `{dist.toFixed(1)} miles away`",
    file: CORE, find: CARD,
    repl: '{score>=80?"Excellent match":"Good match"} · {dist.toFixed(1)} miles away',
    targets: { guard: /hardcoded unit/, probe: /hardcoded unit|metric still renders miles/ },
  },
  {
    name: "3-fire-panel-radius-prints-bare-miles",
    why: "REAL DEFECT: the wildfire panel converted every fire and not its own radius",
    file: FIRE, find: FIRELINE,
    repl: "and {fires.length - 4} more within {radiusMi} miles",
    targets: { guard: /hardcoded unit|radius unconverted/ },
  },
  {
    name: "4-a-unit-word-swapped-with-NO-conversion",
    why: "the dangerous near-miss: metric reads km while the NUMBER is still miles",
    file: CORE, find: HEADER,
    repl: '<span style={{color:C.blue}}>{dist.toFixed(1)+(uImp()?" mi":" km")+" away"}</span>',
    // The guard sees the helper count drop; only the RENDER can see that the number never moved.
    targets: { guard: /routes 1 distance readout|uDistMi 1 time/, probe: /number did not change between units/ },
  },
  {
    name: "5-different-rounding-through-the-same-helper",
    why: "MUST FAIL the guard — it honours the setting and still moves what the default shows",
    // THIS CASE USED TO EXPECT A PASS, on the reasoning that uDistMi(dist) is not a UNITS defect.
    // That reasoning is right about the category and wrong about the consequence: rounding to 1dp
    // in MILES first is what keeps the imperial string byte-identical to what the line printed
    // before it was converted, and that is the whole reason the conversion was safe to ship.
    // Measured on main's own tree, this edit produced 0 FAIL lines before and after — silent,
    // while moving every imperial reader from "756.7 mi away" to "756.72 mi away".
    //
    // The original objection stands and is answered rather than overruled: pinning the
    // EXPRESSION would forbid improving it. The render assertion pins the PROPERTY instead, so a
    // rewrite that keeps imperial unchanged still passes. The probe stays SILENT because it asks
    // whether the number changes BETWEEN UNITS, which this edit does not break.
    file: CORE, find: HEADER,
    repl: '<span style={{color:C.blue}}>{uDistMi(dist)+" away"}</span>',
    targets: { guard: /imperial readouts say/, probe: null },
  },
];

const run = ([cmd, args]) => {
  try { return { out: execFileSync(cmd, args, { encoding: "utf8" }), code: 0 }; }
  catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status ?? 1 }; }
};

let pass = 0, bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log(`HARNESS BUG  ${c.name}: anchor matched ${n}x in ${c.file}`); bad++; continue; }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  if (sum(c.file) === beforeSum) { console.log(`HARNESS BUG  ${c.name}: checksum unmoved`); fs.writeFileSync(c.file, before); bad++; continue; }

  const verdicts = [];
  for (const [which, want] of Object.entries(c.targets)) {
    const { out, code } = run(which === "guard" ? GUARD : PROBE);
    const fails = out.split("\n").filter((l) => l.includes("FAIL")).join("\n");
    if (want === null) {
      verdicts.push(code === 0 && !fails ? [true, `${which} silent`] : [false, `${which} fired on correct work:\n${fails}`]);
    } else {
      verdicts.push(code !== 0 && want.test(fails) ? [true, `${which} caught`] : [false, `${which} did not catch (exit=${code})\n${fails}`]);
    }
  }

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`HARNESS BUG  ${c.name}: TREE NOT RESTORED`); bad++; continue; }

  if (verdicts.every(([good]) => good)) { console.log(`ok    ${c.name} — ${verdicts.map((v) => v[1]).join(", ")}`); pass++; }
  else { console.log(`MISS  ${c.name} (${c.why})`); verdicts.filter(([g]) => !g).forEach(([, m]) => console.log("      " + m)); bad++; }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified`);
process.exit(bad ? 1 : 0);
