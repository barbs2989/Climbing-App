// A traceability check that passes on its first run is exactly the shape of one that cannot
// fail. Corrupt each claim in turn and require it to be caught, proving the pass is earned.
import fs from "fs";
import { execSync } from "child_process";

const F = "scripts/oneoff/trailhead-nocard-plan.mjs";
const orig = fs.readFileSync(F, "utf8");

const CASES = [
  { name: "1. invented FEATURE token (a trailhead the prose never names)",
    expect: /tokens not in its own approach/,
    edit: s => s.replace('must: ["Deception Pass", "Marmot", "Jade", "Dip Top"]',
                         'must: ["Deception Pass", "Marmot", "Jade", "Dip Top", "Snoqualmie Pass"]') },
  { name: "2. invented NUMBER in the direction line",
    expect: /numbers not in its own approach/,
    edit: s => s.replace("about 4 miles and 1,450 ft up the Quartz Creek Trail",
                         "about 4 miles and 9,999 ft up the Quartz Creek Trail") },
  { name: "3. coordinate borrowed from a row naming a DIFFERENT trailhead",
    expect: /donor names a DIFFERENT trailhead|coord does not match donor/,
    edit: s => s.replace('coord: [47.5435, -121.0966], coordFrom: "wa_mount_daniel_daniel_glacier"',
                         'coord: [47.914167, -121.312222], coordFrom: "wa_kyes_peak_glaciated_scramble"') },
  { name: "4. a route that is NOT actually a gap (already has a trailhead)",
    expect: /already has approach_logistics.trailhead|already has a Trailhead waypoint/,
    edit: s => s.replace('{ id: "wa_kyes_peak_northeast_ridge", area: "Kyes Peak",',
                         '{ id: "wa_colchuck_peak_northeast_couloir", area: "Kyes Peak",') },
];

let caught = 0;
for (const c of CASES) {
  const next = c.edit(orig);
  if (next === orig) { console.log("SKIP (edit did not land):", c.name); continue; }
  fs.writeFileSync(F, next);
  let out = "";
  try { out = execSync("node scripts/oneoff/trailhead-verify-traceable.mjs 2>&1", { encoding: "utf8" }); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(F, orig);
  const hit = c.expect.test(out);
  const line = (out.split("\n").find(l => l.includes("FAIL")) || "(no FAIL line)").trim();
  console.log((hit ? "CAUGHT  " : "MISSED  ") + c.name + "\n        " + line);
  if (hit) caught++;
}
fs.writeFileSync(F, orig);
console.log("\n" + caught + "/" + CASES.length + " injections caught");
process.exit(caught === CASES.length ? 0 : 1);
