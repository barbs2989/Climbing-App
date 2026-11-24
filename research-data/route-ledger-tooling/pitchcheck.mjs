// Did IC1-IC3 write pitches 0 -> 1 on a route whose verified facts describe a second pitch?
import fs from "node:fs";
const J = (process.env.JOBS_DIR || ".") + "/";
const R = "research-data/";
const re = /\b(p2|pitch(?:es)? ?2|2(?:nd)? pitch|second pitch|[2-9] pitches|two pitches)\b/i;
const batches = [
  ["IC1", J + "ic/facts-verified.json", R + "route-ledger-2026-11-23/batch-ic1-rollback.json"],
  ["IC2", J + "ic2/facts-verified.json", R + "route-ledger-2026-11-24/batch-ic2-rollback.json"],
  ["IC3", J + "ic3/facts-verified.json", R + "route-ledger-2026-11-24/batch-ic3-rollback.json"],
];
let total = 0;
for (const [name, ff, rbf] of batches) {
  if (!fs.existsSync(rbf)) { console.log(name, "rollback not on this branch:", rbf); continue; }
  const F = JSON.parse(fs.readFileSync(ff, "utf8"));
  const rb = JSON.parse(fs.readFileSync(rbf, "utf8"));
  const set1 = rb.filter((r) => r.column === "pitches" && r.applied === 1).map((r) => r.id);
  const bad = set1.filter((id) => F[id] && re.test(JSON.stringify(F[id].facts || {})));
  total += bad.length;
  console.log(`${name}: ${set1.length} set to 1; ${bad.length} whose facts describe more pitches`);
  for (const id of bad) {
    const hit = JSON.stringify(F[id].facts).match(new RegExp(".{0,60}" + re.source + ".{0,40}", "i"));
    console.log("   ", id, "|", F[id].type_line, "|", hit ? hit[0] : "");
  }
}
console.log("total", total);
