// Are the fabricated SUMMIT pins actually wrong?
//
// The answer looks like it should be "some of them", and it is "essentially none" -- which is worth
// establishing properly rather than inferring from a sorted list, because a negative result here
// removes 32 pins from the backlog permanently.
//
// A summit pin is only comparable with its area's coordinate when it really IS that area's summit:
//   * the app's own `type` must say Summit or Topout -- a name ending in "summit" also fits
//     "Saddle south of Berge's summit" and "Peak '7076' false summit", neither of which is one.
//   * the NAME must agree with the AREA's name. wa_gray_wolf_ridge_se_slopes[4] is "Baldy summit" on
//     a route whose area is "Gray Wolf Ridge": Baldy is a bump on that ridge, so the area coordinate
//     is a DIFFERENT summit and copying it would move a correct pin 1.44 km onto the wrong high point.
//     The namesake rule from the trailhead pass, pointed the other way.
import fs from "fs";
const T = process.env.WP_DATA_DIR || "./waypoint-repair-data";
const GENERIC = new Set(["summit", "topout", "top", "out", "block", "peak", "mount", "mountain", "the",
  "and", "true", "main", "false", "point", "pt"]);
const norm = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const key = s => new Set(norm(s).split(" ").filter(t => t.length > 2 && !GENERIC.has(t)));
function sameSummit(a, b) {
  const A = key(a), B = key(b);
  if (!A.size || !B.size) return false;
  let hit = 0; for (const t of A) if (B.has(t)) hit++;
  return hit === Math.min(A.size, B.size);
}

const c = JSON.parse(fs.readFileSync(`${T}/summit-candidates.json`, "utf8"));
const typed = c.filter(x => x.type === "Summit" || x.type === "Topout");
const other = c.filter(x => !(x.type === "Summit" || x.type === "Topout"));
const named = typed.filter(x => sameSummit(x.name, x.areaName));
const mismatch = typed.filter(x => !sameSummit(x.name, x.areaName));
const agree = named.filter(x => x.movesKm === 0);
const differ = named.filter(x => x.movesKm > 0);

console.log(`fabricated pins that look like a summit : ${c.length}\n`);
console.log(`  not typed Summit/Topout — a feature NEAR a summit, not one : ${other.length}`);
for (const x of other) console.log(`      ${x.route}[${x.i}] "${x.name}" [${x.type}]  (would have moved ${x.movesKm} km)`);
console.log(`\n  typed Summit/Topout but the NAME is a different peak       : ${mismatch.length}`);
for (const x of mismatch) console.log(`      ${x.route}[${x.i}] "${x.name}" vs area "${x.areaName}"  (would have moved ${x.movesKm} km)`);
console.log(`\n  genuinely this area's summit                               : ${named.length}`);
console.log(`      ALREADY EXACTLY the area coordinate — nothing to repair : ${agree.length}`);
console.log(`      differs from the area coordinate                        : ${differ.length}`);
for (const x of differ) console.log(`      ${x.route}[${x.i}] "${x.name}" — ${x.movesKm} km from area "${x.areaName}"  claims ${x.elev} ft, area says ${x.areaElevFt} ft, coords_approx=${x.approx}`);
fs.writeFileSync(`${T}/summit-differ.json`, JSON.stringify(differ, null, 1));
console.log(`\n-> summit-differ.json (${differ.length})`);
