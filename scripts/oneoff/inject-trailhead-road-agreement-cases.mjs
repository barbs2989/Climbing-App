// Injection cases for audit:trailhead-road-agreement.
//
// The audit reports 3 findings against Washington. Three is also what a BROKEN scan prints, and the
// six tightenings that took it from 11 to 3 each removed a class of match — so the live risk is no
// longer noise, it is a needle that has been narrowed until it matches nothing real. These cases
// hold both directions: the two shapes it exists to catch must FIRE, and the four correct shapes it
// was taught to ignore must STAY silent.
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
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
