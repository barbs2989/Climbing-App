// Usage: node harvest.mjs <taskOutputFile> [more...]
// Extracts .result (array of peak findings) from each workflow task-output file
// and merges into findings.json, deduped by peakId. Pure disk I/O.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "/Users/nathanbarber/dev/Climbing-App/enrichment-wip/";
const FF = DIR + "findings.json";
const cur = existsSync(FF) ? JSON.parse(readFileSync(FF, "utf8")) : [];
const byId = new Map(cur.map(f => [f.peakId, f]));
let added = 0, updated = 0, skipped = 0;
for (const path of process.argv.slice(2)) {
  let j;
  try { j = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { console.log("!! cannot read/parse", path, e.message); continue; }
  const res = Array.isArray(j.result) ? j.result : [];
  for (const f of res) {
    if (!f || !f.peakId) { skipped++; continue; }
    if (byId.has(f.peakId)) updated++; else added++;
    byId.set(f.peakId, f);
  }
}
const out = [...byId.values()];
writeFileSync(FF, JSON.stringify(out));
console.log(JSON.stringify({ added, updated, skipped, totalFindings: out.length }, null, 1));
