// Write the adjudicated trailheads into approach_logistics. --dry by default; pass --apply.
//
// Safety rails, each one a rule this repo learned the hard way:
//   * refuses to run unless trailhead-verify-traceable passes first (nothing unverified writes)
//   * asserts each route's area_id resolves to the PEAK NAME the plan expects — ~91% of route
//     ids are minted from the route name, so a name-shaped id proves nothing about its peak
//   * MERGES into the existing approach_logistics rather than replacing it, so no other key is lost
//   * patchRow throws unless exactly one row came back, so a bad id or an RLS rejection cannot
//     read as success
//   * re-reads every id afterwards and reconciles, because a 200 is not evidence the data changed
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";
import { WRITE } from "./trailhead-nocard-plan.mjs";
import { execSync } from "child_process";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

try { execSync("node scripts/oneoff/trailhead-verify-traceable.mjs", { stdio: "pipe" }); }
catch { console.error("traceability check FAILED — refusing to write. Run it to see why."); process.exit(1); }
console.log("traceability: passed\n");

const areas = await selectAll("areas","id,name",{}, {pageSize:1000});
const areaName = new Map(areas.map(a => [a.id, a.name]));
const routes = await selectAll("routes","id,name,area_id,approach_logistics",{}, {pageSize:1000});
const byId = new Map(routes.map(r => [r.id, r]));

const planned = [];
let bad = 0;
for (const e of WRITE) {
  const r = byId.get(e.id);
  if (!r) { console.log("  ABORT " + e.id + " — not in DB"); bad++; continue; }
  const an = areaName.get(r.area_id);
  if (an !== e.area) { console.log("  ABORT " + e.id + " — area is '" + an + "', plan expects '" + e.area + "'"); bad++; continue; }
  const cur = r.approach_logistics || {};
  if (cur.trailhead) { console.log("  ABORT " + e.id + " — already has a trailhead; re-adjudicate"); bad++; continue; }
  const next = Object.assign({}, cur, { trailhead: e.trailhead, trailheadDirection: e.direction });
  if (e.coord) { next.trailheadLat = e.coord[0]; next.trailheadLng = e.coord[1]; }
  planned.push({ id: e.id, area: an, next, keptKeys: Object.keys(cur) });
  console.log("  " + (APPLY ? "WRITE" : "dry  ") + " " + e.id.padEnd(38) + " [" + an + "]");
  console.log("        trailhead : " + e.trailhead);
  console.log("        coord     : " + (e.coord ? e.coord.join(", ") + "  (from " + e.coordFrom + ")" : "none — name only"));
  console.log("        preserving: " + (Object.keys(cur).length ? Object.keys(cur).join(", ") : "(blob was empty)"));
}
if (bad) { console.error("\n" + bad + " precondition failure(s) — nothing written."); process.exit(1); }

if (!APPLY) { console.log("\nDRY RUN — " + planned.length + " route(s) would be written. Re-run with --apply."); process.exit(0); }

console.log("\napplying…");
for (const p of planned) await patchRow("routes", p.id, { approach_logistics: p.next });

console.log("re-reading to reconcile…");
const after = await selectAll("routes","id,approach_logistics",{}, {pageSize:1000});
const aById = new Map(after.map(r => [r.id, r.approach_logistics || {}]));
let ok = 0, wrong = 0;
for (const p of planned) {
  const got = aById.get(p.id) || {};
  const same = got.trailhead === p.next.trailhead
    && got.trailheadDirection === p.next.trailheadDirection
    && (p.next.trailheadLat == null || Math.abs(got.trailheadLat - p.next.trailheadLat) < 1e-9)
    && p.keptKeys.every(k => JSON.stringify(got[k]) === JSON.stringify(p.next[k]));
  if (same) ok++; else { wrong++; console.log("  MISMATCH " + p.id + " -> " + JSON.stringify(got).slice(0, 200)); }
}
console.log("\nverified " + ok + "/" + planned.length + (wrong ? "  — " + wrong + " MISMATCH" : "  — all reconciled"));
process.exit(wrong ? 1 : 0);
