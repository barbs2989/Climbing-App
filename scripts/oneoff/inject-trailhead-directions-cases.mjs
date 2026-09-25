#!/usr/bin/env node
// Injection harness for check:trailhead-directions.
//
// Its healthy output is "one drive control per screen", which is exactly what a guard that has
// stopped looking prints. Each case edits RouteDetail.jsx in place, proves the edit LANDED by
// checksum, runs the guard, and restores the file byte-identically.
//
// Cases 1-3 put #1437's duplication back one piece at a time, so the guard cannot pass on the
// strength of its neighbours. Case 4 is the mislabelled row. Case 5 is the neighbouring field the
// consolidation could have stranded. Cases 6 and 7 must stay SILENT — they are the two false
// positives the counting method was chosen to avoid, and a guard that fired on either would be
// telling authors to rewrite real trailhead prose or to delete a working control.
// Case 8 is section 7: the stat tiles (Elevation, Approach, To the peak) come back onto the
// TRAILHEAD card. They were removed because TECH STATS already states them. Cases 9-10 guarded
// the removed Approach tile's SOURCE and were retired with it.
// Cases 11-13 are section 8: the PLANNER, the last reader on this page still on the raw column.
// 11 is that revert, 12 must stay SILENT (a rename), and 13 edits lib/outing.js rather than the
// app file -- an effDistKm that halves regardless of the recorded trip shape.
//
// CASE 13 IS WHY THESE ARE JUDGED ON THE GUARD'S OWN FAIL LINES AND NOT ON AN EXIT CODE. It
// used to trip the old tile section AND section 8, so a suite reading only the status would credit
// section 8 with its neighbour's catch -- "an injection that produces a different failure is not a catch". Each
// case may name the text its own failure must carry, matched against FAIL lines only, and the
// harness REFUSES any expectation that already appears in the clean run.
//
// IT ALSO FOUND A WEAKNESS IN THE GUARD RATHER THAN IN THE APP, which is what a suite is for:
// section 8's point-to-point control was once 30 km, and against that a shape-blind halving still
// reads LONGER, so case 13 passed silently while the old tile section correctly failed. The
// control is 70 km now, between the halved and the full figure, and only then does the case fire.
//
// DO NOT COMMIT WHILE THIS RUNS — it edits the app source in place (#1190).

import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "RouteDetail.jsx");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "1. the standalone 'Directions to trailhead' button is back beside the card",
    find: '<TrailheadCard route={route} onEdit={()=>{setFixOpenSection("approach");setFixOpen(true);}}/>',
    repl: '<TrailheadCard route={route} onEdit={()=>{setFixOpenSection("approach");setFixOpen(true);}}/><button onClick={()=>window.open("https://maps.example","_blank")}>Directions to trailhead (Google Maps)</button>',
    expect: "fail",
  },
  {
    name: "2. TrailheadCard restates the road again",
    find: '    {(dir&&!dup)?<div style={{fontSize:12.5,',
    repl: '    <div>{"Road \\u00b7 "}{route.road&&route.road.name}</div>\n    {(dir&&!dup)?<div style={{fontSize:12.5,',
    expect: "fail",
  },
  {
    name: "3. the coordinates drop off the surviving control",
    find: '>{lat.toFixed(5)+", "+lng.toFixed(5)}</span>',
    repl: '>Coordinates</span>',
    expect: "fail",
  },
  {
    // REPOINTED when #1493 gave the Plan tab sole ownership of GETTING THERE on a crag. This case
    // used to inject the label into the crag OVERVIEW panel, and that state is now unreachable:
    // `road` is one of the fields hasPlanContent() reads, so a route carrying a drive note always
    // has a Plan tab and the Overview panel no longer renders its road at all. Injected there the
    // case MISSED — correctly, because there was nothing on that render to mislabel. It aims at
    // the surface that does render the note, which is the same defect in the place it can occur.
    name: "4. the drive note is labelled \"Trailhead\" again, on the tab that prints it",
    find: 'row("Drive notes",road.driveNote)',
    repl: 'row("Trailhead",road.driveNote)',
    expect: "fail",
  },
  {
    // The gap #1479 declared and deferred, now closed by #1493 and guarded by section 1b. Reverting
    // the gate puts GETTING THERE back on BOTH tabs of a crag route, each with its own drive
    // control — one destination offered twice on one page, which is the #1437 defect one level out.
    name: "4b. the crag says GETTING THERE on Overview AND Plan again",
    find: '{cragOnly&&!showPlan?<div style={{marginBottom:12}}>',
    repl: '{cragOnly?<div style={{marginBottom:12}}>',
    expect: "fail",
  },
  {
    name: "5. the seasonal gate loses its only remaining render site",
    find: 'row("Seasonal gate",road.seasonalGate)}',
    repl: "null}",
    expect: "fail",
  },
  {
    name: "6. SILENT: trailhead PROSE that says \"Drive here\" is content, not a control",
    find: "function TrailheadCard({route,onEdit}){",
    repl: "function TrailheadCard({route,onEdit}){\n  route=Object.assign({},route,{approachLogistics:Object.assign({},route.approachLogistics,{trailheadDirection:\"Drive here and park at the gate; Directions to trailhead (Google Maps) is not what this sentence is.\"})});",
    expect: "pass",
  },
  {
    name: "7. SILENT: a handler-only button is still a control (no href to count)",
    find: '<a href={"https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng} target="_blank" rel="noreferrer" style={{flex:"0 0 auto",display:"flex",alignItems:"center",justifyContent:"center",padding:"7px 14px",borderRadius:8,border:"1px solid "+C.greenDim,background:C.greenBg,color:C.green,fontSize:12.5,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Drive here</a>',
    repl: '<button onClick={()=>window.open("https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng,"_blank")} style={{flex:"0 0 auto",padding:"7px 14px",borderRadius:8,border:"1px solid "+C.greenDim,background:C.greenBg,color:C.green,fontSize:12.5,fontWeight:700}}>Drive here</button>',
    expect: "pass",
  },
  {
    /* The stat tiles come back. TECH STATS already states the elevation and approach, and the
       user asked for the TRAILHEAD card to carry only where it is and how to drive there. */
    name: "8. the TRAILHEAD card prints an Elevation / Approach tile again",
    find: '    {(dir&&!dup)?<div style={{fontSize:12.5,',
    repl: '    <div><div>{uElev(2400)}</div><div>Elevation</div><div>Approach (one way)</div></div>\n    {(dir&&!dup)?<div style={{fontSize:12.5,',
    expect: "fail",
    expectText: "the TRAILHEAD card prints stat tiles again",
  },
  {
    /* THE REAL DEFECT SECTION 8 EXISTS FOR. The planner was the last reader on this page still
       on the raw column, so Est. summit, Est. return and the "After dark" warning were computed
       from a distance the page did not show. Reverting it moves NO identifier -- effDistKm stays
       imported and four other readers keep calling it -- which is precisely the shape
       audit:silent-reverts says in its own closing caveat it cannot see. */
    name: "11. the planner's hike leg reads the raw dist_km column again",
    find: "const hikeH=scarfHrs(effDistKm(route),route.gainM",
    repl: "const hikeH=scarfHrs(route.distKm,route.gainM",
    expect: "fail",
    expectText: "the planner's estimate is UNCHANGED by the route's itinerary",
  },
  {
    /* SILENT. Section 8 is behavioural on purpose: it compares a render against a control
       identical but for the itinerary, so it cannot be satisfied -- or defeated -- by how the
       call is spelled. A guard pinned to the expression would forbid an ordinary hoist. */
    name: "12. SILENT: the distance is hoisted to a local, still effDistKm",
    find: "  const hikeH=scarfHrs(effDistKm(route),route.gainM",
    repl: "  const _planKm=effDistKm(route);const hikeH=scarfHrs(_planKm,route.gainM",
    expect: "pass",
  },
  {
    /* OVER-REACH, AND IT EDITS lib/outing.js RATHER THAN THE APP FILE. A rule that only ever
       demands a SHORTER estimate is satisfied by halving every itinerary total, which is wrong
       for a recorded point-to-point: that trip does not retrace, so its total IS the one-way
       distance and the honest answer is LONGER. This is the case that earns section 8's second
       fixture, and the one that found the control was too small to separate the two. */
    name: "13. effDistKm halves regardless of the recorded trip shape",
    file: path.join(ROOT, "lib", "outing.js"),
    find: "return effDistIsWholeTrip(route) ? totMi * 1.60934 : (totMi * 1.60934) / 2;",
    repl: "return (totMi * 1.60934) / 2;",
    expect: "fail",
    expectText: "a recorded point-to-point route did not get a longer estimate",
  },

];

const OUTING = path.join(ROOT, "lib", "outing.js");
/* Snapshot EVERY file any case may touch and restore all of them after each case. A case aimed at
   lib/outing.js must leave RouteDetail.jsx alone and vice versa, and the run must never be able to
   end on a tree it has damaged — the hazard two overlapping suites already paid for. */
const SNAP = new Map([[FILE, fs.readFileSync(FILE, "utf8")], [OUTING, fs.readFileSync(OUTING, "utf8")]]);
const restoreAll = () => { for (const pair of SNAP) fs.writeFileSync(pair[0], pair[1]); };
const treeOk = () => [...SNAP].every((pair) => sum(fs.readFileSync(pair[0], "utf8")) === sum(pair[1]));
let bad = 0;

const clean = run();
if (clean.status !== "pass") { console.log("  BROKEN  check:trailhead-directions does not pass on a clean tree"); process.exit(1); }
console.log("  ok      clean tree: check:trailhead-directions passes");

/* An expectation written against the text an assertion prints when it PASSES reports MISSED
   against a guard firing correctly — a mistake this repo has recorded making three times. Refuse
   it structurally rather than remembering not to. */
for (const c of CASES) {
  if (c.expectText && clean.out.includes(c.expectText)) {
    console.log(`  BROKEN  ${c.name}: its expectation already appears in the CLEAN run, so it proves nothing`);
    bad++;
  }
}

for (const c of CASES) {
  const target = c.file || FILE;
  const origin = SNAP.get(target);
  if (!origin) { console.log(`  BROKEN  ${c.name}: names a file this harness does not snapshot`); bad++; continue; }
  if (!origin.includes(c.find)) { console.log(`  BROKEN  ${c.name}: anchor not found — re-anchor this case`); bad++; continue; }
  fs.writeFileSync(target, origin.replace(c.find, c.repl));
  const landed = sum(fs.readFileSync(target, "utf8")) !== sum(origin);
  let got;
  try { got = run(); } finally { restoreAll(); }
  if (!treeOk()) { console.log("  BROKEN  TREE NOT RESTORED — a file did not come back byte-identically"); process.exit(1); }
  if (!landed) { console.log(`  BROKEN  ${c.name}: edit never landed`); bad++; continue; }
  if (got.status !== c.expect) { console.log(`  MISS    ${c.name} — guard ${got.status}ed, expected ${c.expect}`); bad++; continue; }
  /* Judged on the guard's own FAIL LINES, never on the word "FAIL" appearing anywhere in the
     output: these assertion labels are prose and several of them contain it. */
  if (c.expectText) {
    const fails = got.out.split("\n").filter((l) => l.indexOf("  FAIL") === 0);
    if (!fails.some((l) => l.includes(c.expectText))) {
      console.log(`  WRONG FAILURE  ${c.name} — the guard failed, but on a different assertion than this case names`);
      bad++; continue;
    }
  }
  console.log(`  ok      ${c.name} — guard ${got.status === "fail" ? "CAUGHT it" : "stayed quiet"}`);
}

function run() {
  try {
    const out = execFileSync("node", [path.join(ROOT, "scripts", "check-trailhead-directions.mjs")], { cwd: ROOT, encoding: "utf8" });
    return { status: "pass", out };
  } catch (e) {
    return { status: "fail", out: String((e && e.stdout) || "") + String((e && e.stderr) || "") };
  }
}

console.log("");
console.log(bad ? `${bad} problem(s) — check:trailhead-directions is not proven.` : `ok — ${CASES.length}/${CASES.length}, and every file is byte-identical to where it started.`);
process.exit(bad ? 1 : 0);
