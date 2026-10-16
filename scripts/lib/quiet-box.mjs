// A BROWSER RESULT FROM AN OVERSUBSCRIBED BOX IS NOT EVIDENCE, AND NOTHING ENFORCED THAT.
//
// CLAUDE.md records this lesson in four places and it has cost real work every time:
//
//   * check:outage's `ranks` case "reported MISSED at a load average of ~450 and CAUGHT at ~260
//     ON THE SAME COMMIT. Re-run a miss on a quiet machine before believing it."
//   * check:waypoint-placement: "a wall-clock profile taken at load average ~450 was off by 4x —
//     it also blamed the wrong two suspects."
//   * check:wp-styles' timing was quoted at 2m29s and measures 37s; "a timing taken on a loaded
//     box is not a profile."
//   * memory: "Browser/build failures = the BOX is oversubscribed."
//
// Every one of those is prose. Nothing asked the machine, so the rule was applied when somebody
// happened to remember — which is the same argument this repo makes for a script over a comment
// everywhere else (`a semantic invariant in a comment rots`).
//
// BOTH DIRECTIONS ARE UNSAFE, which is why this refuses rather than warns. A browser probe that
// MISSES on a loaded box reads as a live defect and sends somebody to edit correct code. One that
// PASSES can be vacuous, because screens never settled and every "is absent" assertion passes
// against empty text — `probe-overlay-width-cap` records exactly that ("a skipped overlay is
// indistinguishable from a passing one"). So a loaded run is worthless in both directions and the
// honest thing is to produce no verdict at all.
//
// THE THRESHOLDS ARE DERIVED FROM THIS REPO'S OWN RECORDED RUNS, NOT FITTED TO A BAD NIGHT.
// This box has 4 cores, so load-per-core is the meaningful figure rather than the raw average:
//
//     runs CLAUDE.md calls quiet     load 3.8, 4.7          ~1x cores
//     runs it says invalidated       load 110, 227, 250, 450   27x, 57x, 62x, 112x
//
// There is a wide empty band between them. QUIET_X sits at 2x (covering both recorded quiet runs)
// and REFUSE_X at 6x — an order of magnitude below the cheapest recorded bad run, so this cannot
// fire on a borderline-fine machine. Between the two it runs and STAMPS the output, because a
// mildly busy box degrades a result rather than destroying it.
//
// SCOPED TO HAND-RUN PROBES, AND THAT IS SAFE BY CONSTRUCTION: no workflow executes anything under
// scripts/oneoff/ (both references in .github/workflows/ are comments) and package.json names no
// probe, so this can never make CI refuse to run. Do NOT wire it into a check: guard — a CI runner
// is small and legitimately busy, and a guard that declines to run is a guard you do not have.
import os from "node:os";

export const QUIET_X = 2;
export const REFUSE_X = 6;

// loadavg() is [0,0,0] on platforms that do not report it. Treat that as UNKNOWN and proceed:
// this exists to catch a box known to be bad, and blocking one that cannot answer would stop
// everybody for no measurement at all.
export function boxLoad() {
  const cores = Math.max(1, os.cpus().length || 1);
  const [load1, load5, load15] = os.loadavg();
  const known = Number.isFinite(load1) && load1 > 0;
  return { cores, load1, load5, load15, known, perCore: known ? load1 / cores : null };
}

export function loadLine(b = boxLoad()) {
  if (!b.known) return `load: not reported by this platform (${b.cores} cores)`;
  return `load ${b.load1.toFixed(1)} across ${b.cores} cores = ${b.perCore.toFixed(1)}x oversubscribed`
    + ` (5m ${(b.load5 / b.cores).toFixed(1)}x, 15m ${(b.load15 / b.cores).toFixed(1)}x)`;
}

// Call this FIRST, before spawning a dev server or a browser — the point is to spend nothing on a
// run whose verdict could not be believed. `name` is the probe, used only in the message.
//
// Returns { quiet, caveat } so a caller can stamp its own summary. Exits 1 above REFUSE_X unless
// the caller passed --anyway (or set QUIET_BOX=0), and an override says outright that the run is
// not evidence, so a transcript cannot be read later as a clean result.
// `box` is a TEST SEAM and nothing else passes it — the same idiom as check:column-drift's
// --fixture and --known. Without it the quiet branch could only be exercised on a quiet machine,
// which is exactly the machine this repo does not reliably have, so two of the three branches
// would ship unproven.
export function assertQuietBox(name, { argv = process.argv, env = process.env, box = null } = {}) {
  const b = box || boxLoad();
  const override = argv.includes("--anyway") || env.QUIET_BOX === "0";

  if (!b.known || b.perCore <= QUIET_X) return { quiet: true, caveat: null, box: b };

  if (b.perCore > REFUSE_X && !override) {
    console.error(`REFUSING TO RUN ${name} — ${loadLine(b)}.`);
    console.error(`Above ${REFUSE_X}x a browser result is not evidence IN EITHER DIRECTION: a miss reads`);
    console.error(`as a live defect and sends you to edit correct code, and a pass can be vacuous because`);
    console.error(`screens never settled. Re-run on a quiet box (this repo's own quiet runs are ~1x).`);
    console.error(`Pass --anyway to run regardless — the output will say it is not evidence.`);
    process.exit(1);
  }

  const caveat = b.perCore > REFUSE_X
    ? `NOT EVIDENCE — forced with --anyway at ${b.perCore.toFixed(1)}x oversubscribed. A miss here is not attributable and a pass may be vacuous.`
    : `DEGRADED BOX — ${loadLine(b)}. A MISS in this run is not attributable; re-run on a quiet box before believing one.`;
  console.error(caveat);
  return { quiet: false, caveat, box: b };
}
