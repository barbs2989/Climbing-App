// The 7 Mount Robson routes stored a WALK in approach_logistics.trailheadDirection ("Via the Berg Lake
// Trail, from the north side of the peak"), which check:trailhead-direction-shape --live fails. Replace
// it with the researched DRIVE to the Berg Lake Trailhead (robson-out.json). --dry by default.
//
// Compare-and-swap: a row is written only while it still holds one of the two known walk strings and
// still names "Berg Lake Trailhead", so a later edit is never overwritten. Merged, paced, reconciled.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, requireServiceKey, SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
import { trailheadDirectionProblem } from "../../../lib/trailheadDirectionShape.js";

const APPLY = process.argv.includes("--apply");
if (APPLY) requireServiceKey();
const here = path.dirname(fileURLToPath(import.meta.url));
const research = JSON.parse(fs.readFileSync(path.join(here, "robson-out.json"), "utf8"));
const text = research.trailheadDirection;
const problem = trailheadDirectionProblem(text);
if (problem) { console.error("refused by the shape detector: " + problem); process.exit(1); }

const OLD = new Set(["Via the Berg Lake Trail, from the north side of the peak", "Via the Berg Lake Trail, from the south side of the peak"]);
const IDS = ["bc_mount_robson_emperor_ridge", "bc_mount_robson_kain_face", "bc_mount_robson_patterson_couloir", "bc_mount_robson_roof_glacier_hourglass_by_pass_couloir", "bc_mount_robson_south_face_schwartz_ledges", "bc_mount_robson_the_north_face", "bc_mount_robson_wishbone_arete"];
const read = async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach_logistics&id=in.(${IDS.join(",")})`, { headers: { apikey: anonKey(), Authorization: "Bearer " + anonKey() } });
  if (!res.ok) throw new Error("read " + res.status);
  return res.json();
};

const rows = await read();
const plan = rows.filter(r => OLD.has(r.approach_logistics?.trailheadDirection) && r.approach_logistics?.trailhead === "Berg Lake Trailhead");
console.log((APPLY ? "APPLY" : "DRY") + ": " + plan.length + " of " + IDS.length + " still hold the walk text");
if (!APPLY) process.exit(0);

const sleep = (ms) => new Promise(res => setTimeout(res, ms));
for (const r of plan) {
  await patchRow("routes", r.id, { approach_logistics: Object.assign({}, r.approach_logistics, { trailheadDirection: text }) });
  console.log("  wrote " + r.id);
  await sleep(1000);
}
const after = await read();
const landed = after.filter(r => r.approach_logistics?.trailheadDirection === text).length;
console.log("reconciled: " + landed + " of " + plan.length + " landed");
if (landed < plan.length) process.exit(1);
