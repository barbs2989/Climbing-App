#!/usr/bin/env node
/**
 * "After dark" and "Leave earlier" are compared against a CLOCK HOUR, and the value they are
 * compared to is UNBOUNDED.
 *
 *   sumH = depart + totalH          // absolute hours from midnight of the departure day
 *   retH = sumH + <return leg>
 *   late     = retH > 18.5          // 18.5 is 6:30 PM
 *   sumLate  = sumH > 13            // 13 is 1:00 PM
 *
 * `fmt` -- declared on the line BETWEEN them -- reduces the same value mod 1440 to render a clock
 * time and appends "(+Nd)". So the moment an estimate crosses midnight, every clock threshold is
 * passed permanently and the red label attaches to whatever time of day the arrival lands on.
 *
 * The app's own pinned sample route is the demonstration, at the calculator's DEFAULT settings:
 *
 *   Est. summit  4:28 AM (+1d)   "Leave earlier"     <- leaving earlier makes it darker
 *   Est. return 12:10 PM (+1d)   "After dark"        <- a midday arrival, in red
 *
 * FIXED. The trigger was right and the WORDING was wrong, so neither threshold moved: `retH >
 * 18.5` is exactly "this outing runs past dusk", which is the correct trigger however long the
 * outing, and only the LABEL gained the day. So THE NUMBERS BELOW DO NOT MOVE with the fix, and
 * that is the point of still being able to run it -- an unchanged trigger count is the proof that
 * no warning was added and none suppressed. What changed is what those tiles SAY.
 *
 * READ THE "would be mislabelled" LINES AS A CLASS SIZE, NEVER AS A DEFECT COUNT. They are the
 * tiles a day-blind label gets wrong, which is what check:return-leg section 2 now pins; a script
 * that went on printing them as live findings would be the stale instrument this repo has already
 * been caught by. Re-run it after touching the estimate, and compare the trigger counts.
 *
 * Read-only, report-only.
 *
 * Both statements are LIFTED from RouteDetail.jsx and executed, never retyped -- a copy would
 * agree with itself whatever the app did, which is the whole question. ANCHOR LOST if either
 * moves.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { selectAll } from "../lib/supabase-env.mjs";

const require_ = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const RD = path.join(ROOT, "RouteDetail.jsx");

function dead(msg) { console.error("BROKEN: " + msg); process.exit(1); }

// ---- lift the two statements ---------------------------------------------------------------
const src = fs.readFileSync(RD, "utf8");
function lift(re, what) {
  const m = re.exec(src);
  if (!m) dead("ANCHOR LOST: " + what + " -- re-point this measurement, it is reading nothing");
  const rest = src.slice(m.index + m[0].length);
  if (new RegExp(re.source, re.flags).exec(rest)) dead("AMBIGUOUS: " + what + " matched more than once");
  return m[0];
}
const STMT_EST = lift(/const hikeH=scarfHrs\([\s\S]*?retH=[^;]*;/, "the hikeH/techH/totalH/sumH/retH statement");
const STMT_FLAG = lift(/const late=retH>[^;]*;/, "the late/sumLate statement");
if (STMT_EST.length < 200) dead("the estimate statement lifted short (" + STMT_EST.length + " chars)");

const run = new Function(
  "route", "fit", "pack", "party", "depart",
  "scarfHrs", "techHrs", "gn", "gainCoversWholeOuting",
  `
  const hasPublishedSummitH=route.timing&&route.timing.summitTimeHrs!=null;
  const derivedSummitH=(!hasPublishedSummitH&&route.timing&&route.timing.totalHrs!=null)?Math.max(0,route.timing.totalHrs-(route.timing.approachTimeHrs||0)-(route.timing.descentTimeHrs||0)):null;
  const hasDerivedSummitH=derivedSummitH!=null&&derivedSummitH>0;
  const publishedIsWholeDay=!!(route.timing&&route.timing.summitTimeHrs!=null&&route.timing.totalHrs!=null&&route.timing.summitTimeHrs===route.timing.totalHrs&&route.timing.approachTimeHrs==null);
  const hikeCoversWholeDay=gainCoversWholeOuting(route);
  ${STMT_EST}
  ${STMT_FLAG}
  return { sumH, retH, late, sumLate, totalH };
`);

// ---- bundle core for the four helpers ---------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cm-afterdark-"));
const out = path.join(tmp, "b.cjs");
await build({
  stdin: {
    contents: "export { scarfHrs, techHrs, gn, gainCoversWholeOuting } from " +
      JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx")) + ";",
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);
for (const n of ["scarfHrs", "techHrs", "gn", "gainCoversWholeOuting"]) {
  if (typeof M[n] !== "function") dead("core does not export " + n);
}

// the calculator's own defaults, read from the source so they cannot drift out of this script
const DEF = /useState\(\{fit:"([a-z]+)",pack:(\d+),party:(\d+),depart:(\d+)\}\)/.exec(src);
if (!DEF) dead("ANCHOR LOST: the calculator's default state");
const fit = DEF[1], pack = +DEF[2], party = +DEF[3], depart = +DEF[4];

const rows = await selectAll(
  "routes",
  "id,name,dist_km,gain_ft,loss_ft,pitches,grade,discipline,timing,waypoints",
  "id=like.wa_*",
  { pageSize: 1000 },
);
if (!rows.length) dead("read 0 routes -- a failed read reads as a clean catalog here");

// DUSK is the app's own threshold; DAWN is its symmetric counterpart. A return at 00:22 is
// genuinely after dark, so counting it as a contradiction would overstate this by half.
const DUSK = 18.5, DAWN = 6;
let n = 0, crosses = 0, lateContradicts = 0, sumContradicts = 0, lateFires = 0, sumFires = 0;
const worst = [];
for (const r of rows) {
  const route = {
    distKm: r.dist_km,
    gainM: r.gain_ft != null ? r.gain_ft / 3.28084 : null,
    lossM: r.loss_ft != null ? r.loss_ft / 3.28084 : null,
    pitches: r.pitches, grade: r.grade, discipline: r.discipline,
    timing: r.timing, waypoints: r.waypoints,
    gain_ft: r.gain_ft, loss_ft: r.loss_ft,
  };
  let v;
  try { v = run(route, fit, pack, party, depart, M.scarfHrs, M.techHrs, M.gn, M.gainCoversWholeOuting); }
  catch { continue; }
  if (!isFinite(v.retH) || !isFinite(v.sumH)) continue;
  n++;
  const retClock = ((v.retH % 24) + 24) % 24, sumClock = ((v.sumH % 24) + 24) % 24;
  if (v.retH >= 24 || v.sumH >= 24) crosses++;
  if (v.late) lateFires++;
  if (v.sumLate) sumFires++;
  // the contradiction: the red label fires while the CLOCK it annotates is inside daylight
  if (v.late && retClock >= DAWN && retClock <= DUSK) {
    lateContradicts++;
    worst.push({ id: r.id, clock: retClock, h: v.retH });
  }
  if (v.sumLate && sumClock >= DAWN && sumClock <= 13) sumContradicts++;
}

const pct = (x) => (100 * x / n).toFixed(1) + "%";
console.log("routes with a computable estimate  : " + n + " of " + rows.length);
console.log("defaults read from source          : fit=" + fit + " pack=" + pack + " party=" + party + " depart=" + depart);
console.log("estimate crosses midnight          : " + crosses + "  (" + pct(crosses) + ")");
console.log("");
console.log("the return warning triggers on     : " + lateFires + "  (" + pct(lateFires) + ")");
console.log("  ...returning in DAYLIGHT, so a day-blind label would call it 'After dark' : " + lateContradicts);
console.log("the summit warning triggers on     : " + sumFires + "  (" + pct(sumFires) + ")");
console.log("  ...summiting BEFORE 1 PM, so a day-blind label would say 'Leave earlier'  : " + sumContradicts);
worst.sort((a, b) => Math.abs(12 - a.clock) - Math.abs(12 - b.clock));
console.log("");
console.log("worst 10, by how far the annotated clock time is from dark (these read Overnight now):");
for (const w of worst.slice(0, 10)) {
  const hr = Math.floor(w.clock), mn = Math.round((w.clock - hr) * 60);
  console.log("  " + w.id.padEnd(46) + " returns " + String(hr).padStart(2, "0") + ":" +
    String(mn).padStart(2, "0") + " on day " + (1 + Math.floor(w.h / 24)));
}
fs.rmSync(tmp, { recursive: true, force: true });
