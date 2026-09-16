// INJECTION SUITE for audit:pin-elev-vs-own-prose.
//
// The audit's healthy output is a SMALL NUMBER, which is exactly what a scan that matches nothing
// prints — so a case proving only that it fires says almost nothing. SIX of the nine must stay
// SILENT, and they are the load-bearing half: each pins one way a bare "N ft" in this prose is not
// an elevation, and the unrestricted form reported 466 findings on the live catalog against 11.
//
// The faults live in the DATA, so a case cannot inject one by editing code and must never write to
// the live project. Every case is a synthetic catalog handed to `--fixture`, the mechanism
// audit:trailhead-road already sets. Nothing here reads the database.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT = path.join(ROOT, "scripts", "audit-pin-elev-vs-own-prose.mjs");

const pin = (over) => Object.assign({
  type: "Trailhead", name: "Stuart Lake Trailhead", lat: 47.5278, lng: -120.8205,
  elev: 3200, distMi: 0, directions: "Drive up Icicle Creek Road and follow Road 7601 to its end.",
}, over);
// EVERY fixture carries a CONTROL: a trailhead pin that is comparable and AGREES. Without it a
// SILENT case satisfies the audit's own fail-closed floor by accident — a one-pin fixture whose
// pin is correctly excluded IS a scan that cannot fire, so the run dies as BROKEN and the case
// reports a miss against an audit behaving perfectly. With it, the floor is met and the silence is
// attributable to the case's own pin rather than to the harness.
const CONTROL = {
  type: "Trailhead", name: "Blue Lake Trailhead", lat: 48.518965, lng: -120.67436, elev: 5400,
  directions: "Park at the signed Blue Lake Trailhead on SR-20, at roughly 5,400 ft.",
};
const cat = (...pins) => [
  { id: "wa_fixture_control", waypoints: [CONTROL] },
  { id: "wa_fixture_route", waypoints: pins },
];

const CASES = [
  { name: "disagrees", fires: true,
    cat: cat(pin({ directions: "Follow Road 7601 to its end, around 3,540 feet, where the Stuart Lake Trailhead begins." })),
    expect: "3,540",
    why: "the real historical shape — the pin's own Getting here line states a different height, and the route page renders both inches apart" },

  { name: "SILENT-agrees-within-tolerance", fires: false,
    cat: cat(pin({ directions: "The Stuart Lake Trailhead sits at the end of Road 7601, at about 3,240 feet." })),
    why: "a rounded pin and rounded prose legitimately differ; a guard firing on 40 ft would report the whole catalog" },

  { name: "SILENT-a-gain-is-not-a-height", fires: false,
    cat: cat(pin({ directions: "From the Stuart Lake Trailhead the trail climbs hard, gaining around 4,500 ft to the basin." })),
    why: "THE tokeniser lesson: a bare 'N ft' is an amount far more often than a place, and reading one as a height made nearly every pin contradict itself" },

  { name: "SILENT-a-rate-is-not-a-height", fires: false,
    cat: cat(pin({ directions: "The Stuart Lake Trailhead route climbs at roughly 1,200 ft per mile for the last two miles." })),
    why: "'at roughly 1,200 ft' carries a positional preposition and is a RATE — the positional rule alone is not enough" },

  { name: "SILENT-a-wall-height-is-not-a-height", fires: false,
    cat: cat(pin({ directions: "Tallest fin above the Stuart Lake Trailhead (walls to 120 ft); park at the pulloff." })),
    why: "'to' is deliberately NOT positional: 'walls to 120 ft' is a wall, and admitting it reported nine identical Dikes routes" },

  { name: "SILENT-height-in-a-sentence-that-does-not-name-the-pin", fires: false,
    cat: cat(pin({ directions: "Park at the Stuart Lake Trailhead. Hike the switchbacks to Cascade Pass at 5,392 ft." })),
    why: "the prose legitimately names other places' heights; firing on one accuses correct data — the real wa_magic_mountain shape" },

  { name: "SILENT-not-a-trailhead-pin", fires: false,
    cat: cat(pin({ type: "Summit", name: "Sherpa Peak Summit", directions: "The Sherpa Peak Summit tops out at about 8,605 feet." })),
    why: "scoped to trailheads, measured rather than chosen: across every type the same rule reports 50 and an en-route pin's prose is a NARRATIVE of the leg" },

  { name: "SILENT-one-of-two-stated-heights-agrees", fires: false,
    cat: cat(pin({ directions: "The Stuart Lake Trailhead is at about 3,240 feet; the route tops out near 9,415 ft." })),
    why: "one sentence legitimately names several heights, so a single match is agreement and none is the contradiction" },

  { name: "FAILS-CLOSED-nothing-comparable", fires: true, closed: true,
    // Deliberately WITHOUT the control: the control exists to make a comparable pin present, so
    // including it here would satisfy the very floor this case exists to trip.
    cat: [{ id: "wa_fixture_route", waypoints: [pin({ directions: "Drive to the end of the road and park." })] }],
    expect: "the scan cannot fire",
    why: "a fixture whose prose states no height must be reported as a BROKEN scan — it otherwise prints the same reassuring zero as a clean catalog" },
];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pinelev-"));
let pass = 0;
for (const c of CASES) {
  const f = path.join(dir, c.name + ".json");
  fs.writeFileSync(f, JSON.stringify(c.cat));
  let out = "", code = 0;
  try { out = execFileSync("node", [AUDIT, `--fixture=${f}`], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status || 1; }

  if (c.closed) {
    if (code !== 0 && out.includes(c.expect)) { console.log(`  ok    ${c.name}: failed closed`); pass++; }
    else console.log(`  MISSED  ${c.name}: exited ${code}\n${out}`);
  } else if (c.fires) {
    if (/^1 disagree/m.test(out) && out.includes(c.expect)) { console.log(`  ok    ${c.name}: caught`); pass++; }
    else if (/^[1-9]\d* disagree/m.test(out)) console.log(`  WRONG FAILURE  ${c.name}: fired, but not on "${c.expect}"\n${out}`);
    else console.log(`  MISSED  ${c.name}\n${out}`);
  } else {
    if (/^0 disagree/m.test(out)) { console.log(`  ok    ${c.name}: silent, as required`); pass++; }
    else console.log(`  FIRED ON CORRECT WORK  ${c.name}\n${out}`);
  }
  console.log(`        ${c.why}`);
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass}/${CASES.length}`);
process.exit(pass === CASES.length ? 0 : 1);
