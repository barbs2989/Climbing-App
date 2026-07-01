// Usage: node make_shards.mjs [shardSize]
// Splits NOT-yet-researched peaks (batch_all.json minus findings.json) into
// disjoint shards of shardSize, writing one ready-to-run workflow per shard
// (wf_batch.js template with PEAKS injected). Launch each via scriptPath.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "/Users/nathanbarber/dev/Climbing-App/enrichment-wip/";
const SIZE = +(process.argv[2] || 30);
const peaks = JSON.parse(readFileSync(DIR + "batch_all.json", "utf8"));
const findings = existsSync(DIR + "findings.json")
  ? JSON.parse(readFileSync(DIR + "findings.json", "utf8")) : [];
const done = new Set(findings.map(f => f.peakId));
const remaining = peaks.filter(p => !done.has(p.id));
const tpl = readFileSync(DIR + "wf_batch.js", "utf8");
const shards = [];
for (let i = 0; i < remaining.length; i += SIZE) shards.push(remaining.slice(i, i + SIZE));
const manifest = [];
shards.forEach((shard, i) => {
  const n = String(i + 1).padStart(2, "0");
  const file = "wf_s" + n + ".js";
  const run = tpl.replace(/const PEAKS = \[\]; \/\/__PEAKS__/, "const PEAKS = " + JSON.stringify(shard) + ";");
  writeFileSync(DIR + file, run);
  manifest.push({ shard: i + 1, file, peaks: shard.length });
});
writeFileSync(DIR + "shards_manifest.json", JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({
  totalPeaks: peaks.length, done: done.size, remaining: remaining.length,
  shardSize: SIZE, shardCount: shards.length, files: manifest,
}, null, 1));
