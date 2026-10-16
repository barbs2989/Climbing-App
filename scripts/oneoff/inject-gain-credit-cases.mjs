#!/usr/bin/env node
/* Injection suite for audit:gain's climbing-vertical credit.
 *
 * WHY A FIXTURE RATHER THAN AN EDIT: the faults this audit reports live in the DATA, so a case
 * cannot be injected by editing code, and a checker must never write to the live project to make
 * one. `audit:trailhead-road` sets that precedent and it is the reason its rules are testable.
 *
 * WHY IT JUDGES ON --json RATHER THAN ON TEXT: this repo has three times recorded a case written
 * against the text an assertion prints when it PASSES, reporting MISSED against a detector that
 * was firing correctly. Asking whether a route id is in the findings array cannot make that
 * mistake — there is no passing text to match by accident.
 *
 * THE SILENT CASES ARE THE LOAD-BEARING HALF. A credit that excused everything would satisfy
 * every "must fire" case here; cases 2, 3 and 5 are what stop that, and case 4 is what stops the
 * opposite over-reach.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const AUDIT = path.join(ROOT, "scripts", "audit-gain-vs-waypoints.mjs");
const FT_PER_PITCH = 35 * 3.28084;

/* A synthetic route in the shape readAll() returns. Elevations in feet under `elev`, which is the
   spelling the audit reads first. */
function route({ id, gain, pitches = 0, thFt = 5200, sumFt = 7720, bivyFt = null }) {
  return {
    id, name: id, area_id: "fx_area", discipline: "alpine",
    gain_ft: gain, dist_km: 3.2, pitches, high_point_ft: sumFt,
    waypoints: [
      { name: "Fixture Trailhead", type: "Trailhead", elev: thFt },
      { name: "Fixture Summit", type: "Summit", elev: sumFt },
    ],
    bivy: bivyFt == null ? [] : [{ name: "Fixture high camp", elev: bivyFt }],
  };
}

const CASES = [
  {
    /* wa_liberty_traverse's exact shape, and the route check:gain-floor-stated's own suite names
       as one that must NOT be accused: 26 pitches over a 2,520 ft rise, so the walk accounts for
       none of the gap and a stored 2,001 is entirely plausible. */
    name: "credit-fires-on-a-heavily-pitched-route",
    expect: "SILENT",
    rows: [route({ id: "fx_liberty_traverse", gain: 2001, pitches: 26 })],
  },
  {
    /* NON-VACUITY. The identical row with no pitch count must still be reported, or the credit is
       excusing by existing rather than by arithmetic. */
    name: "same-route-with-no-pitches-is-still-caught",
    expect: "FIRES",
    rows: [route({ id: "fx_liberty_traverse", gain: 2001, pitches: 0 })],
  },
  {
    /* Austera's shape: a gap far larger than the pitch count can explain. A credit that swallowed
       this would be hiding the findings this audit exists for. */
    name: "a-gap-the-pitches-cannot-explain-survives-the-credit",
    expect: "FIRES",
    rows: [route({ id: "fx_austera", gain: 1280, pitches: 3, thFt: 2100, sumFt: 8339 })],
  },
  {
    /* The other over-reach. A row whose gain is fine must stay silent whatever its pitch count —
       a rule that only ever fires is as useless as one that never does. */
    name: "a-correct-gain-is-not-reported",
    expect: "SILENT",
    rows: [route({ id: "fx_fine", gain: 2400, pitches: 0 })],
  },
  {
    /* The credit must not break the CONVENTION test beside it. This row measures its gain from a
       recorded high camp to the SUMMIT — the audit's own worked example shape — and crediting the
       climb there would look for a camp `climbFt` lower and stop matching it. Two routes moved
       INTO the findings when that was tried, which is what a credit must never do. */
    name: "a-camp-to-summit-convention-is-still-excused",
    expect: "SILENT",
    rows: [route({ id: "fx_camp", gain: 1720, pitches: 4, thFt: 2100, sumFt: 8339, bivyFt: 6619 })],
  },
];

function run(rows, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gain-inj-"));
  const fx = path.join(dir, "fixture.json");
  fs.writeFileSync(fx, JSON.stringify(rows));
  try {
    const out = execFileSync("node", [AUDIT, "--fixture", fx, "--json", "--limit", "999", ...extra], { encoding: "utf8" });
    return { ok: true, findings: JSON.parse(out) };
  } catch (e) {
    return { ok: false, code: e.status, stderr: String(e.stderr || "") };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

let pass = 0, fail = 0;
for (const c of CASES) {
  const r = run(c.rows);
  if (!r.ok) {
    console.log(`FAIL  ${c.name}\n      the audit exited ${r.code} instead of reporting. ${r.stderr.slice(0, 200)}`);
    fail++; continue;
  }
  const ids = new Set(r.findings.map((f) => f.id));
  const fired = c.rows.some((x) => ids.has(x.id));
  const want = c.expect === "FIRES";
  if (fired === want) {
    console.log(`ok    ${c.name}  (${c.expect})`);
    pass++;
  } else {
    console.log(`FAIL  ${c.name}  expected ${c.expect}, and it ${fired ? "FIRED" : "stayed SILENT"}`);
    fail++;
  }
}

/* FAIL-CLOSED. An empty catalog must be reported as a broken read, never as a clean one — the
   direction that lets an audit print reassurance about a query that returned nothing. */
const empty = run([]);
if (!empty.ok && empty.code === 1) { console.log("ok    an empty catalog fails CLOSED"); pass++; }
else { console.log("FAIL  an empty catalog did not fail closed"); fail++; }

console.log(`\n${pass}/${pass + fail} behaved as declared`);
process.exitCode = fail ? 1 : 0;
