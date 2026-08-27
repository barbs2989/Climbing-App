// Injection cases for audit:trailhead-road-agreement.
//
// The audit reports ZERO against the whole catalog on sections 1, 2 and 3, and ONE on section 4
// (Suiattle River Road, seven routes, MP 4 against MP 4.5). Zero is also exactly what
// a BROKEN scan prints, and every one of the seven tightenings that took section 1 from 11 findings
// to 0 REMOVED a class of match — so the live risk is no longer noise, it is a needle narrowed until
// it matches nothing real. These cases are the only thing separating those two readings, and they
// hold both directions: the shapes the audit exists to catch must FIRE, and the correct shapes it
// was taught to ignore must STAY silent.
//
// Keep this header honest. A count here that has drifted from the live run is the stale-bookkeeping
// failure the `KNOWN` and `NEEDS_EXTRA_STATE` maps elsewhere in this repo are held to.
//
// It runs against a synthetic catalog, not the live database — the faults are in the data, and this
// checker cannot write. `--fixture` makes the audit read a JSON file instead of Supabase.
//
//   node scripts/oneoff/inject-trailhead-road-agreement-cases.mjs
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const TH = { trailhead: "Bogus Lake Trailhead", trailheadLat: 47.5, trailheadLng: -121.5 };
const route = (id, road, access) => ({ id, name: id, area_id: "wa_bogus", road, access: access || {}, approach_logistics: TH, waypoints: [] });

const CASES = [
  { name: "mowich", expect: 1,
    why: "the real defect: one row records a permanent closure, a sibling still promises a July opening",
    rows: [route("a", { status: "No public vehicle access via SR-165 — the bridge was permanently closed in April 2025" }),
           route("b", { status: "Seasonal, unpaved", seasonalGate: "Typically opens ~July" })] },

  { name: "indefinite", expect: 1,
    why: "an indefinite fire closure against a year-round claim — the Staircase shape",
    rows: [route("a", { seasonalGate: "Closed indefinitely since October 2025 due to fire damage" }),
           route("b", {}, { closures: "Area typically open year-round but snow dependent" })] },

  // --- the four that must stay SILENT ---------------------------------------------------------
  { name: "seasonalgate", expect: 0,
    why: "a winter gate is not a closure; it is the SAME fact a sibling states from the other end of the year",
    rows: [route("a", { status: "Closed to vehicles until the seasonal spring opening" }),
           route("b", { seasonalGate: "Typically opens ~July" })] },

  { name: "beyond", expect: 0,
    why: "Barlow Pass: 'paved TO the trailhead; permanently closed BEYOND it' is one road described from both sides",
    rows: [route("a", { status: "Paved to Bogus Lake Trailhead; permanently closed to vehicles beyond Bogus Lake due to washouts" }),
           route("b", { status: "Highway is paved to Bogus Lake; from there the road is gated" })] },

  { name: "opento", expect: 0,
    why: "Trinity: 'open to <somewhere short of the trailhead>' AGREES that the trailhead is unreachable",
    rows: [route("a", {}, { closures: "Closed at mile 16 with no reopening estimate given" }),
           route("b", { status: "Open to Atkinson Flat Campground (~mile 16); closed to vehicles beyond" })] },

  { name: "formerly", expect: 1,
    why: "PAST-tense access is the sentence EXPLAINING a closure — reading it as a live claim silently drops a real finding",
    rows: [route("a", { status: "No public vehicle access — permanently closed", seasonalGate: "Formerly open to vehicles mid-July–mid-October; as of the 2025 bridge closure this is a 27-mile walk" }),
           route("b", { status: "Seasonal", seasonalGate: "Typically opens ~July" })] },

  { name: "alternate", expect: 0,
    why: "a closure the row LABELS as another road is correct context, not a contradiction (Sol Duc naming the Elwha-side road)",
    rows: [route("a", { status: "Paved, open seasonally", seasonalGate: "Closed by snow in winter; the alternate Elwha-side road is permanently closed beyond Madison Falls" }),
           route("b", { status: "Paved, generally open year-round to the trailhead area" })] },
];

// --- SECTION 2 cases -------------------------------------------------------------------------
// Section 2 was rewritten after its first draft measured ~25-30% precision on a 20-row sample, so
// it needs its own coverage: the rewrite is what a silent regression would undo.
const road = (id, name, extra) => ({ id, name: id, area_id: "wa_bogus", road: { name, ...(extra || {}) }, access: {}, approach_logistics: TH, waypoints: [] });

const CASES2 = [
  { name: "wrongroad", expect: 1,
    why: "the real defect: a road block left describing the road a trailhead move REMOVED",
    rows: [road("a", "Chiwawa River Road (FR 6200) to Trinity"),
           road("b", "Sloan Creek Road (FR 49)"), road("c", "North Fork Sauk Road / Sloan Creek Road (FR 49)"),
           road("d", "Mountain Loop Highway to FR 49 (Sloan Creek Road)")] },

  { name: "samejourney", expect: 0,
    why: "different LEGS of one drive: Hannegan Pass Road IS FR 32, and a neighbour's prose says so",
    rows: [road("a", "Ruth Creek Road (Forest Service Road 32)"),
           road("b", "Hannegan Pass Road (FR 32)", { driveNote: "Follow Hannegan Pass Road, also signed Ruth Creek Road, to the trailhead" }),
           road("c", "Hannegan Pass Road (FS 32)"), road("d", "Hannegan Pass Road #32")] },

  { name: "pairshield", expect: 2,
    why: "TWO identically-wrong rows must not shield each other — the echo must come from a row that AGREES with the cluster",
    // The three correct rows must AGREE on a token, or no majority forms, core comes out empty and
    // the cluster is skipped before anything can be flagged. The first draft of this case named
    // three different roads and reported 0 — the audit was right and the CASE was wrong.
    rows: [road("a", "White Chuck Road (FR 23)"), road("b", "White Chuck Road (FR 23)"),
           road("c", "Sloan Creek Road (FR 49)"), road("d", "North Fork Sauk / Sloan Creek Road (FR 49)"),
           road("e", "Mountain Loop Highway to Sloan Creek Road (FR 49)")] },

  { name: "variant", expect: 0,
    why: "'Sol Duc Road' and 'Sol Duc Hot Springs Road' are the same road spelled two ways and must not fight",
    rows: [road("a", "Sol Duc Road"), road("b", "Sol Duc Hot Springs Road"),
           road("c", "Sol Duc Hot Springs Road (Sol Duc River Road)"), road("d", "Sol Duc Road (from US-101)")] },

  { name: "twoonly", expect: 0,
    why: "a cluster of two has no majority to measure against, so nothing may be flagged",
    rows: [road("a", "Chiwawa River Road"), road("b", "Sloan Creek Road (FR 49)")] },
];


/* --- section 3: the MILEPOST key ---------------------------------------------------------------
   Two must FIRE and three must stay SILENT, and the silent three are the ones that matter: this
   detector's first real run was 33% precise (3 disputed, 1 real) and every false positive was one
   of these shapes. A case that only proves it fires would be satisfied by a detector that flags
   everything. */
const mproute = (id, road, access) => ({ id, name: id, area_id: "wa_bogus", road, access: access || {}, approach_logistics: TH, waypoints: [] });

const CASES3 = [
  { name: "dispute", expect: 1,
    why: "the real one: MP 37.5 reopened per one route, still blocking per another.",
    rows: [
      mproute("a", { name: "Mountain Loop Highway", status: "Closed as of Dec 2025 - Mountain Loop Highway landslide at MP 37.5 blocks access to FR 49" }),
      mproute("b", { name: "Mountain Loop Highway", status: "Open, the Mountain Loop Highway reopened mid-May 2026 after a landslide near milepost 37.5" }),
    ] },

  { name: "seasonal", expect: 0,
    why: "a winter gate legitimately says BOTH — closes every winter, reopens every spring. Without this suppression the four largest clusters were SR-20 gate mileposts (MP 134 across 62 routes).",
    rows: [
      mproute("a", { name: "North Cascades Highway", status: "SR-20 closes every winter at milepost 134 due to avalanche hazard" }),
      mproute("b", { name: "North Cascades Highway", status: "SR-20 seasonal gate at milepost 134; typically reopened by late May" }),
    ] },

  { name: "hypothetical", expect: 0,
    why: "\"...when fully open\" is a counterfactual, not a claim the road is open. It put two Suiattle routes in the LIFTED column while their own status said CLOSED.",
    rows: [
      mproute("a", { name: "Suiattle River Road", status: "Suiattle River Road is CLOSED to vehicles at approximately milepost 4.5" }),
      mproute("b", { name: "Suiattle River Road", status: "Closed at milepost 4.5", driveNote: "Normally about 2.5-3 hours from Seattle via the Suiattle River Road when fully open" }),
    ] },

  { name: "narration", expect: 0,
    why: "one route narrating its road over time — a bare \"Closed\" now, plus an OLD reopening of a different washout — is not disagreeing with anybody. Judged per ROUTE, not per value.",
    rows: [
      mproute("a", { name: "Glacier Creek Road", status: "Closed to vehicles at the Glacier Creek bridge (~MP 3.0) due to December 2025 flood damage. A 2021 washout was patched with a bypass reopened in November 2023." }),
      mproute("b", { name: "Glacier Creek Road", status: "Closed to all vehicles at MP 3.0 (Glacier Creek bridge)" }),
    ] },

  { name: "opento", expect: 0,
    why: "\"closed at MP X\" and \"open to MP X\" are the SAME fact — shut beyond that point. The mirror section 1 already had to learn.",
    rows: [
      mproute("a", { name: "Chiwawa River Road", status: "Closed to vehicles beyond milepost 16" }),
      mproute("b", { name: "Chiwawa River Road", status: "Open to Atkinson Flat at milepost 16; closed beyond" }),
    ] },
];

/* --- section 4: the ROAD key ------------------------------------------------------------------
   Section 3 keys on the MILEPOST, so a disagreement ABOUT the milepost lands in two buckets and is
   never compared. Section 4 keys on the ROAD instead. One must FIRE and four must stay SILENT, and
   `tworoads` is the load-bearing one: the first draft clustered on token OVERLAP with a growing
   token set, which chains, and it reported 6 findings where 1 was real — a Ptarmigan Traverse row
   naming both Cascade River Road and Suiattle River Road merged the two into one cluster and
   reported Cascade's MP 20 winter gate as a third position for Suiattle's flood gate. */
const CASES4 = [
  { name: "positions", expect: 1,
    why: "the real one: seven live routes put ONE flood gate on FR 26 at both MP 4 and MP 4.5",
    rows: [
      mproute("a", { name: "Suiattle River Road (FR 26)", status: "Closed to motor vehicles beyond milepost 4 due to flood damage" }),
      mproute("b", { name: "Suiattle River Road (Forest Road 26)", status: "CLOSED to motorized vehicles at approximately milepost 4.5 due to washout damage" }),
    ] },

  // ROW ORDER IS LOAD-BEARING AND THIS CASE WAS VACUOUS WITHOUT IT. Chaining merges into whichever
  // cluster it meets first, so with the two-road row LAST the single-road rows have already formed
  // separate clusters and nothing merges: the case reported 0 against the chaining version too, and
  // therefore proved nothing. Measured with the two-road row FIRST: chaining 1, exact identity 0.
  // A case that passes against the implementation it exists to reject is not a case.
  { name: "tworoads", expect: 0,
    why: "a row naming TWO roads must not chain them into one cluster — this is the over-merge that made the first draft 6 findings where 1 was real",
    rows: [
      mproute("c", { name: "Cascade River Road (north approach) or Suiattle River Road (south approach)", status: "Closed at milepost 20" }),
      mproute("a", { name: "Cascade River Road", status: "Closed to vehicles beyond milepost 20" }),
      mproute("b", { name: "Suiattle River Road", status: "Closed to vehicles at milepost 4" }),
    ] },

  { name: "twogates", expect: 0,
    why: "a road really can carry two gates, and a route naming BOTH is describing them, not disagreeing with anyone",
    rows: [
      mproute("a", { name: "Suiattle River Road", status: "Closed at milepost 4; a second washout blocks the road again at milepost 12" }),
      mproute("b", { name: "Suiattle River Road", status: "Closed to vehicles at milepost 4" }),
    ] },

  { name: "seasonal", expect: 0,
    why: "a winter gate and a washout are two different gates on one road, and comparing them reports correct work",
    rows: [
      mproute("a", { name: "Cascade River Road", status: "Closed at milepost 8 by the Marble Creek washout" }),
      mproute("b", { name: "Cascade River Road", seasonalGate: "Snow-gated each winter at milepost 20" }),
    ] },

  { name: "noname", expect: 0,
    why: "with no road.name the identity is a GUESS at which road the sentence is about, and a guess cannot support a claim that two routes contradict each other",
    rows: [
      mproute("a", { status: "Closed to vehicles at milepost 4 by flood damage" }),
      mproute("b", { status: "Closed to vehicles at milepost 9 by flood damage" }),
    ] },
];

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "th-road-"));
let pass = 0, fail = 0;
for (const c of CASES) {
  const f = path.join(dir, `${c.name}.json`);
  fs.writeFileSync(f, JSON.stringify(c.rows));
  let out = "";
  try {
    out = execFileSync("node", ["scripts/audit-trailhead-road-agreement.mjs", "--fixture", f], { encoding: "utf8" });
  } catch (e) { out = String((e.stdout || "") + (e.stderr || "")); }
  const m = out.match(/^(\d+) cluster\(s\) where one route says/m);
  const got = m ? Number(m[1]) : -1;
  const ok = got === c.expect;
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${c.name.padEnd(13)} expected ${c.expect}, got ${got === -1 ? "NO COUNT LINE" : got}`);
  console.log(`        ${c.why}`);
  if (!ok) console.log(out.split("\n").filter(l => l.trim()).slice(-14).map(l => "        | " + l).join("\n"));
}
console.log("");
for (const c of CASES2) {
  const f = path.join(dir, `s2-${c.name}.json`);
  fs.writeFileSync(f, JSON.stringify(c.rows));
  let out = "";
  try {
    out = execFileSync("node", ["scripts/audit-trailhead-road-agreement.mjs", "--fixture", f], { encoding: "utf8" });
  } catch (e) { out = String((e.stdout || "") + (e.stderr || "")); }
  const m = out.match(/^(\d+) route\(s\) whose road\.name names a DIFFERENT road/m);
  const got = m ? Number(m[1]) : -1;
  const ok = got === c.expect;
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  s2:${c.name.padEnd(11)} expected ${c.expect}, got ${got === -1 ? "NO COUNT LINE" : got}`);
  console.log(`        ${c.why}`);
  if (!ok) console.log(out.split("\n").filter(l => l.trim()).slice(-14).map(l => "        | " + l).join("\n"));
}


console.log("");
for (const c of CASES3) {
  const f = path.join(dir, `s3-${c.name}.json`);
  fs.writeFileSync(f, JSON.stringify(c.rows));
  let out = "";
  try {
    out = execFileSync("node", ["scripts/audit-trailhead-road-agreement.mjs", "--fixture", f], { encoding: "utf8" });
  } catch (e) { out = String((e.stdout || "") + (e.stderr || "")); }
  const m = out.match(/(\d+) where one closure gets two answers/);
  const got = m ? Number(m[1]) : -1;
  const ok = got === c.expect;
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  s3:${c.name.padEnd(11)} expected ${c.expect}, got ${got === -1 ? "NO COUNT LINE" : got}`);
  console.log(`        ${c.why}`);
  if (!ok) console.log(out.split("\n").filter(l => l.trim()).slice(-14).map(l => "        | " + l).join("\n"));
}

console.log("");
for (const c of CASES4) {
  const f = path.join(dir, `s4-${c.name}.json`);
  fs.writeFileSync(f, JSON.stringify(c.rows));
  let out = "";
  try {
    out = execFileSync("node", ["scripts/audit-trailhead-road-agreement.mjs", "--fixture", f], { encoding: "utf8" });
  } catch (e) { out = String((e.stdout || "") + (e.stderr || "")); }
  const m = out.match(/(\d+) where one gate is given two POSITIONS/);
  const got = m ? Number(m[1]) : -1;
  const ok = got === c.expect;
  ok ? pass++ : fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  s4:${c.name.padEnd(11)} expected ${c.expect}, got ${got === -1 ? "NO COUNT LINE" : got}`);
  console.log(`        ${c.why}`);
  if (!ok) console.log(out.split("\n").filter(l => l.trim()).slice(-14).map(l => "        | " + l).join("\n"));
}

fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
