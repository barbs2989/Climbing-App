// Does a TRAILHEAD pin's stored elevation agree with the elevation stated in its OWN prose?
//
// The route page renders both, inches apart: the elevation chip on the waypoint row, and the
// "Getting here —" line directly beneath it, which is `wp.directions`. So a disagreement is not a
// fact about a table — it is ONE SCREEN stating a height twice and giving two answers. Found on a
// CI `ui-screens` capture: "Stuart Lake Trailhead / 3,200 ft" above "follow it to its end, around
// 3,540 feet, where the Stuart Lake Trailhead ... begin".
//
// NOTHING ELSE CAN SEE IT, and the three near misses each ask a different question:
//   audit:waypoint-elevations  asks whether the TERRAIN admits a pin's height   (one record)
//   audit:summit-splits        asks whether two ROUTES place one point apart    (across routes)
//   audit:trailhead-agreement  compares a route's two trailhead COORDINATES     (not heights)
// A number written into the pin's own sentence is outside all three by construction.
//
// REPORT ONLY. Both records are the pin's own, so neither is privileged; `--ground` asks the USGS
// DEM, which derives from neither.
//
// WHAT THE GROUND CAN AND CANNOT SAY, because this line used to claim more than it had. It can
// refuse the PIN: a pin IS the coordinate, so "nothing near this height exists here" is about the
// pin and nothing else. It CANNOT rule on a refused SENTENCE — a sentence legitimately names a
// second feature with its own height, and four of the six live findings do (Cascade Pass at 5,392
// ft, Slate Pass at 6,900, Longs Pass at 6,200, a switchback at ~5,600). Only reading tells a wrong
// number from a number about somewhere else, and the old verdict asserted "the sentence is the
// wrong half" about two of them.
//
// Read-only, anon key. NOT a build gate: a property of the DB rather than of the checkout, so no
// code change can cause or fix it — the reasoning that keeps `check:counts` out.
import { readFileSync } from "node:fs";
import { anonKey, selectAll } from "./lib/supabase-env.mjs";

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const STATE = arg("state", "wa");
const TOL_FT = Number(arg("tol", 100));   // a rounded pin and rounded prose legitimately differ
const WANT_GROUND = process.argv.includes("--ground");
const FIXTURE = arg("fixture", null);
const GROUND_FIXTURE = arg("ground-fixture", null);
// The placement slop audit:waypoint-elevations measured for a hand-placed pin. Taking the TOP of
// its 118-183 m band deliberately: over-stating the uncertainty widens the box, which errs toward
// UNSETTLED, and a report that flags correct work is one people learn to ignore.
const SLOP_M = 183;

// AN ELEVATION IS NOT A GAIN, AND A BARE "N ft" CANNOT TELL THEM APART. This prose is full of
// amounts — "gaining about 450 ft", "a ~150-ft rappel", "losing around 1,900 ft" — and reading one
// as a height makes almost every pin contradict itself: the unrestricted form reported 466
// findings and the readable ones were nearly all amounts. A count is only as good as its
// tokeniser.
//
// The discriminator is POSITIONAL, never a deny-list of amount verbs, which one more verb beats:
// an elevation is somewhere you ARE. `to` is deliberately NOT positional here — "walls to 120 ft"
// is a wall height — and a RATE is excluded outright, because "at roughly 1,200 ft per mile"
// otherwise reads as a place.
//
// One-sided: a height used as a bare modifier ("the 8,800 ft snowfield") is MISSED rather than
// misread, which costs a finding and cannot manufacture one.
//
// `around` is the hard one: it serves BOTH a position ("to its end, around 3,540 feet") and an
// amount ("gaining around 4,500 ft"), so admitting it bare re-imports the gains and refusing it
// loses the founding case from the CI capture. It counts only as an APPOSITIVE — after a comma —
// which is structural rather than a deny-list of amount verbs that one more verb beats.
const FT_RE = /(?:\b(?:at|near|reaching)|,\s*around)\s+(?:about\s+|roughly\s+|approximately\s+|~\s*)?(\d{1,2},\d{3}|\d{3,5})\s*-?\s*(?:ft\b|feet\b|foot\b)(?!\s*(?:per|\/)\s*(?:mi|mile|km))/gi;

// A token every trailhead name shares makes the naming test VACUOUS in the wide direction — the
// mirror of a too-narrow proxy. These are feature types and directions, not identities.
const GENERIC = new Set(["trailhead", "trail", "head", "road", "creek", "lake", "camp", "pass",
  "col", "summit", "peak", "mountain", "basin", "junction", "start", "parking", "lot", "upper",
  "lower", "north", "south", "east", "west", "the", "and", "via", "from", "near", "end"]);

function statedHeights(sentence) {
  return [...sentence.matchAll(FT_RE)].map(m => Number(m[1].replace(/,/g, "")))
    .filter(n => Number.isFinite(n) && n >= 200 && n <= 15000);
}

async function load() {
  if (FIXTURE) return JSON.parse(await import("node:fs").then(fs => fs.promises.readFile(FIXTURE, "utf8")));
  return selectAll("routes", "id,waypoints", `id=like.${STATE}_*&waypoints=not.is.null`,
    { key: anonKey(), pageSize: 1000 });
}

const rows = await load();
if (!rows.length) { console.error("FAIL: zero routes read — a broken scan, not a clean catalog."); process.exit(1); }

let pins = 0, trailheads = 0, withProse = 0, comparable = 0;
const findings = [];
for (const r of rows) {
  for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) {
    pins++;
    // SCOPED TO TRAILHEADS, MEASURED RATHER THAN CHOSEN. Across every pin type the same rule
    // reports 50 and precision collapses: an en-route pin's prose is a NARRATIVE of the leg
    // ("breaks treeline near 4,600 ft, joins the Monitor Ridge route near 7,000 ft"), so the
    // heights belong to points along the way and naming the pin proves nothing about them. A
    // trailhead's `directions` is a "Getting here" line whose SUBJECT is the trailhead, and the
    // drive ends there.
    if (!/trailhead/i.test(String(w.type || ""))) continue;
    trailheads++;
    const elev = Number(w.elev != null ? w.elev : w.elevFt);
    if (!Number.isFinite(elev) || elev <= 0) continue;
    const prose = [w.directions, w.note].filter(x => typeof x === "string" && x).join("  ");
    if (!prose) continue;
    withProse++;
    const toks = String(w.name || "").toLowerCase().split(/[^a-z0-9]+/)
      .filter(t => t.length > 3 && !GENERIC.has(t));
    if (!toks.length) continue;
    for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
      // A HEIGHT COUNTS ONLY IN A SENTENCE THAT NAMES THIS PIN. Without it the prose's other
      // heights are read as claims about the trailhead — "hike the switchbacks to Cascade Pass at
      // 5,392 ft" is about the pass, and firing on it accuses correct data.
      const low = sentence.toLowerCase();
      if (!toks.some(t => low.includes(t))) continue;
      const stated = statedHeights(sentence);
      if (!stated.length) continue;
      comparable++;
      // Any stated figure within tolerance is AGREEMENT: one sentence legitimately names several
      // heights, so a single match settles it and none is the contradiction.
      if (stated.some(n => Math.abs(n - elev) <= TOL_FT)) continue;
      const closest = stated.reduce((a, b) => Math.abs(b - elev) < Math.abs(a - elev) ? b : a);
      findings.push({ route: r.id, name: w.name, lat: w.lat, lng: w.lng, elev, stated, closest,
        gap: Math.abs(closest - elev), sentence: sentence.replace(/\s+/g, " ") });
    }
  }
}

// FAIL CLOSED. Each of these otherwise prints the same reassuring small number as a clean catalog.
if (!trailheads) { console.error("FAIL: no pin is typed Trailhead — the scan cannot fire."); process.exit(1); }
if (!withProse) { console.error("FAIL: no trailhead pin carries prose — the scan cannot fire."); process.exit(1); }
if (!comparable) { console.error("FAIL: no trailhead pin's own naming sentence states a height — the scan cannot fire."); process.exit(1); }

// --- THE GROUND'S RESOLVING POWER IS NOT A CONSTANT, AND THE BAR USED TO BE -------------------
//
// This block compared ONE reading against a flat bar: the closer record had to be within 50 ft and
// the other at least 3x further, floored at 150. That bar cannot tell 193 ft of terrain relief from
// 616 ft, and over the six live findings it was wrong TWICE, in opposite directions — it refused a
// verdict the ground decides plainly at the Park Butte trailhead (193 ft of relief; the pin sits 92
// ft below anything the terrain holds within its own uncertainty) and issued one the ground cannot
// support at Osceola Peak (486 ft of relief, which admits both figures comfortably).
//
// So ask the terrain instead of a constant: sample the ground across the pin's own rounding box
// plus placement slop, and ask whether each claimed height is something that box could innocently
// produce. See scripts/lib/ground-box.mjs, which is the same arithmetic audit:waypoint-elevations
// uses — extracted rather than copied.
//
// AND THE TWO VERDICTS ARE NOT SYMMETRIC, WHICH IS THE PART THE OLD RULE GOT WRONG.
//
//   the box refuses the PIN            -> a verdict. A pin IS the coordinate, so "the ground here
//                                         holds nothing near this height" is a statement about the
//                                         pin and nothing else.
//   the box refuses the STATED height  -> NOT a verdict about which half is wrong. A sentence can
//                                         legitimately name a SECOND feature with its own height,
//                                         and FOUR of these six do: Cascade Pass at 5,392 ft, Slate
//                                         Pass at 6,900, Longs Pass at 6,200, a switchback at
//                                         ~5,600. The ground cannot tell a wrong number from a
//                                         number about somewhere else — only reading can. The old
//                                         line asserted "the sentence is the wrong half" about two
//                                         of them, which is the direction that has somebody edit
//                                         correct prose.
let boxOf = null, boxAdmits = null;
if (WANT_GROUND) {
  const lib = await import("./lib/ground-box.mjs");
  boxAdmits = lib.boxAdmits;
  // A TEST SEAM, like --fixture: --ground-fixture supplies the nine readings per route so the
  // verdict can be proven without a network. 3DEP is the default and nothing else changes.
  let canned = null;
  if (GROUND_FIXTURE) canned = JSON.parse(readFileSync(GROUND_FIXTURE, "utf8"));
  boxOf = async (f) => {
    if (!canned) return lib.groundBox(f.lat, f.lng, SLOP_M, { tries: 8 });
    const q = (canned[f.route] || []).slice();
    return lib.groundBox(f.lat, f.lng, SLOP_M, { read: async () => (q.length ? q.shift() : null) });
  };
}

findings.sort((a, b) => b.gap - a.gap);
let settled = 0, ambiguous = 0;
for (const f of findings) {
  console.log(`${f.gap.toLocaleString()} ft  ${f.route}`);
  console.log(`   "${f.name}" stores ${f.elev.toLocaleString()} ft; its own sentence says ${f.stated.map(n => n.toLocaleString()).join(", ")}`);
  console.log(`   ${f.sentence.slice(0, 260)}`);
  if (!boxOf) continue;
  // FAIL CLOSED. A box built from too few readings is not a statement about the terrain, and a
  // 3DEP outage must read as "not measured" rather than as a narrow box that settles everything.
  const box = await boxOf(f);
  if (!box) { console.log("   ground: NOT MEASURED — not agreement, and not a verdict."); continue; }
  const pinOk = boxAdmits(box, f.elev);
  const statedOk = f.stated.some(n => boxAdmits(box, n));
  const verdict = (!pinOk && statedOk)
    ? "the PIN is the wrong half — the ground under it holds nothing near that height"
    : (pinOk && !statedOk)
      ? "the stated height is not AT this coordinate — the sentence is either wrong or naming a different feature, and the ground cannot tell those apart. READ it."
      : pinOk
        ? "UNSETTLED — this terrain admits both figures"
        : "UNSETTLED — this terrain admits neither, so the pin's own elevation is in question too";
  if (!pinOk && statedOk) settled++; else if (pinOk && !statedOk) ambiguous++;
  console.log(`   ground ${box.centre == null ? "?" : Math.round(box.centre).toLocaleString()} ft; across this pin's own uncertainty the terrain runs ${Math.round(box.lo).toLocaleString()}-${Math.round(box.hi).toLocaleString()} ft (${Math.round(box.relief)} ft of relief, ${box.read}/9 read)`);
  console.log(`   => ${verdict}`);
}
if (WANT_GROUND) console.log(`\n${settled} pin(s) the ground decides; ${ambiguous} where the stated height is simply not here — read those, the ground cannot rule on them.`);

console.log(`\n${rows.length} routes, ${pins} pins, ${trailheads} typed Trailhead, ${withProse} of those carrying prose, ${comparable} whose own naming sentence states a height.`);
console.log(`${findings.length} disagree by more than ${TOL_FT} ft.`);
if (!WANT_GROUND) console.log("Pass --ground to ask the USGS DEM which half each one is; it derives from neither record.");
console.log("Report only: a sentence may legitimately name a SECOND feature with its own height, and the ground cannot tell that from a wrong number — it can only refuse the PIN, which is the coordinate itself.");
