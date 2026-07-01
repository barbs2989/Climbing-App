// Usage: node next_batch.mjs [batchSize]
// Reads the full peak list (batch_all.json) and accumulated findings (findings.json),
// then writes the next batch of NOT-yet-researched peaks to next_batch.json and prints progress.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "/Users/nathanbarber/dev/Climbing-App/enrichment-wip/";
const N = +(process.argv[2] || 30);
const peaks = JSON.parse(readFileSync(DIR + "batch_all.json", "utf8"));
const findings = existsSync(DIR + "findings.json")
  ? JSON.parse(readFileSync(DIR + "findings.json", "utf8")) : [];
const done = new Set(findings.map(f => f.peakId));
const remaining = peaks.filter(p => !done.has(p.id));
const batch = remaining.slice(0, N);
writeFileSync(DIR + "next_batch.json", JSON.stringify(batch));
// Emit a ready-to-run workflow with this batch injected (sandbox has no fs access).
const tpl = readFileSync(DIR + "wf_batch.js", "utf8");
const run = tpl.replace(/const PEAKS = \[\]; \/\/__PEAKS__/, "const PEAKS = " + JSON.stringify(batch) + ";");
writeFileSync(DIR + "wf_run.js", run);
console.log(JSON.stringify({
  totalPeaks: peaks.length,
  done: done.size,
  remaining: remaining.length,
  thisBatch: batch.length,
  batchNames: batch.map(p => p.name),
}, null, 1));
