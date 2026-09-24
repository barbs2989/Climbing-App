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
// --- THE --ground VERDICT, which had no case behind it at all ---------------------------------
//
// The nine above prove the audit FINDS a disagreement. None of them ran `--ground`, so the line
// that tells a reader WHICH HALF is wrong was unexercised — and it was wrong on two of the six live
// findings, in opposite directions, for the whole time it existed.
//
// These run offline: `--ground-fixture` supplies the nine readings per route, so the box, the
// admit test and the verdict all execute with no network. The readings are the REAL ones measured
// against 3DEP on 2026-09-24, so a case is a statement about the live catalog rather than a
// convenient shape.
//
// `forbid` is the load-bearing half. Four of these six sentences are CORRECT and merely name a
// second feature, so a verdict blaming the sentence is the direction that has somebody edit good
// prose. A case that only checks the right string appears is satisfied by a line that prints every
// verdict at once.
const GROUND_CASES = [
  { name: "GROUND-pin-refused-is-a-verdict",
    // Park Butte / Schreiber's Meadow. The old flat bar refused this one: the sentence was 23 ft
    // out and the pin 137, "not the separation this batch demands". Across the pin's own
    // uncertainty the terrain never drops below 3,292, so 3,200 is not innocent terrain variation.
    pin: pin({ name: "Park Butte / Schreiber's Meadow", lat: 48.70681, lng: -121.81225, elev: 3200,
      directions: "Drive to the end of Forest Road 13, which ends at the Park Butte / Schreiber's Meadow trailhead at about 3,360 feet." }),
    ground: [3337, 3415, 3395, 3296, 3281, 3320, 3351, 3372, 3414],
    expect: "the PIN is the wrong half",
    why: "a pin IS the coordinate, so the ground refusing it is a statement about the pin and nothing else — this is the only verdict the ground can actually reach, and it had never once fired" },

  { name: "GROUND-refused-sentence-is-NOT-a-verdict",
    // Cascade Pass Trailhead. The sentence names CASCADE PASS at 5,392 ft — 3.7 miles away, so the
    // ground is right to refuse 5,392 AT THIS COORDINATE and wrong to conclude the sentence errs.
    pin: pin({ name: "Cascade Pass Trailhead", lat: 48.475, lng: -121.075, elev: 3600,
      directions: "Park at the Cascade Pass Trailhead and hike the switchbacks to Cascade Pass at 5,392 ft." }),
    ground: [3648, 3409, 3520, 3777, 4024, 3900, 3612, 3455, 3700],
    expect: "READ it",
    forbid: "the sentence is the wrong half",
    why: "the ground cannot tell a wrong number from a number about somewhere else; the old rule asserted the first about a sentence this repo's own repair batch records as correct" },

  { name: "GROUND-both-admitted-is-unsettled",
    // Slate Pass / Buckskin Ridge. 486 ft of relief admits 7,170 and 6,900 alike — and the old bar
    // called this "the PIN is right — the sentence is the wrong half" off a single centre reading.
    pin: pin({ name: "Slate Pass / Buckskin Ridge Trailhead", lat: 48.7, lng: -120.68, elev: 7170,
      directions: "The Slate Pass / Buckskin Ridge Trailhead sits high; Slate Pass, at about 6,900 feet, is at the second switchback." }),
    ground: [7162, 6730, 6880, 7050, 7216, 7100, 6950, 6810, 7180],
    expect: "UNSETTLED",
    forbid: "the sentence is the wrong half",
    why: "on steep ground the DEM cannot separate two heights 262 ft apart, and a flat bar asserted that it could" },

  { name: "GROUND-both-refused-questions-the-pin-too",
    pin: pin({ name: "Esmeralda Basin Trailhead", lat: 47.43, lng: -120.93, elev: 3800,
      directions: "Follow FR-9737 to the Esmeralda Basin Trailhead, then climb to a gully leaving the trail near the last switchback at 5,600 ft." }),
    ground: [4261, 4221, 4300, 4450, 4723, 4600, 4380, 4250, 4500],
    expect: "the pin's own elevation is in question too",
    why: "a box that admits neither figure is saying something about the PIN as well, which the old single-reading line could not express" },

  { name: "GROUND-FAILS-CLOSED-too-few-readings",
    pin: pin({ name: "Park Butte / Schreiber's Meadow", lat: 48.70681, lng: -121.81225, elev: 3200,
      directions: "Drive to the end of Forest Road 13, which ends at the Park Butte / Schreiber's Meadow trailhead at about 3,360 feet." }),
    ground: [3337, 3415, null, null, null, 3320, null, null, null],
    expect: "NOT MEASURED",
    forbid: "the PIN is the wrong half",
    why: "a 3DEP outage must read as no verdict, never as a narrow box that settles everything — the direction that manufactures verdicts" },
];

const gdir = fs.mkdtempSync(path.join(os.tmpdir(), "pinelev-ground-"));
let gpass = 0;
console.log("");
for (const c of GROUND_CASES) {
  const f = path.join(gdir, c.name + ".json");
  const g = path.join(gdir, c.name + ".ground.json");
  fs.writeFileSync(f, JSON.stringify(cat(c.pin)));
  fs.writeFileSync(g, JSON.stringify({ wa_fixture_route: c.ground }));
  let out = "";
  try { out = execFileSync("node", [AUDIT, `--fixture=${f}`, "--ground", `--ground-fixture=${g}`], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }

  const hit = out.includes(c.expect);
  const bad = c.forbid && out.includes(c.forbid);
  if (hit && !bad) { console.log(`  ok    ${c.name}`); gpass++; }
  else if (bad) console.log(`  WRONG VERDICT  ${c.name}: output contains the forbidden "${c.forbid}"\n${out}`);
  else console.log(`  MISSED  ${c.name}: no "${c.expect}"\n${out}`);
  console.log(`        ${c.why}`);
}
fs.rmSync(gdir, { recursive: true, force: true });

fs.rmSync(dir, { recursive: true, force: true });
const total = CASES.length + GROUND_CASES.length;
console.log(`\n${pass + gpass}/${total}`);
process.exit(pass + gpass === total ? 0 : 1);
