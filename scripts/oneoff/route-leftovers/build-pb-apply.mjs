// Builds pb/out/pb-apply.json from the peakbagger pass (pb/out/p1-p4.json): confirmed results only,
// minus reviewer holds, plus reviewer additions (a copy of the same fact the agent's ops missed).
import fs from "node:fs";
const HOLD = {
  // the row's own schedule reaches the summit at +5 hr and approachTime says ~5 hours; 3.5 would contradict both
  "wa_mount_mastiff_south_route|timing.summitTimeHrs": true,
};
const ADD = {
  "wa_mount_stickney_scramble": [
    { op: "replace_text", id: "wa_mount_stickney_scramble", column: "approach_variants", path: [0, "notes"],
      find: "Walk the road uphill for a little over two miles", replace: "Walk the road uphill for about 4.8 miles" },
  ],
};
const results = [];
for (const b of ["p1", "p2", "p3", "p4"]) {
  for (const r of JSON.parse(fs.readFileSync(`audits/route-leftovers/pb/out/${b}.json`, "utf8")).results) {
    if (r.verdict !== "confirmed" || HOLD[`${r.id}|${r.fact}`]) continue;
    results.push({ ...r, ops: [...r.ops, ...(ADD[r.id] || [])] });
    delete ADD[r.id];
  }
}
fs.writeFileSync("audits/route-leftovers/pb/out/pb-apply.json", JSON.stringify({ results }, null, 1));
console.log(results.length, "results,", results.reduce((n, r) => n + r.ops.length, 0), "ops");
