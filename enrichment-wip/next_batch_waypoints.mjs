// Usage: node next_batch_waypoints.mjs [batchSize]
// Like next_batch.mjs, but tracks progress by "does this peak's routes have real
// waypoint coverage yet" (checking BOTH the already-staged catalog/wa-alpine/routes.json
// baseline AND findings.json), not just "is this peakId present in findings.json" —
// so peaks the comprehensive-research pass already touched for OTHER fields still
// get picked up here if they're missing coordinates.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "/Users/nathanbarber/dev/Climbing-App/enrichment-wip/";
const N = +(process.argv[2] || 20);
const peaks = JSON.parse(readFileSync(DIR + "batch_all.json", "utf8"));
const findings = existsSync(DIR + "findings.json")
  ? JSON.parse(readFileSync(DIR + "findings.json", "utf8")) : [];
const empty = v => v == null || v === "" || (Array.isArray(v) && !v.length);

// baseline coverage from the already-staged catalog (Jun 29 run)
let baselineWp = new Set();
try {
  const rj = JSON.parse(readFileSync("/Users/nathanbarber/dev/Climbing-App/catalog/wa-alpine/routes.json", "utf8"));
  rj.routes.forEach(r => { if (!empty(r.waypoints)) baselineWp.add(r.id); });
} catch (e) { /* staged catalog not present; ignore */ }

// coverage from findings.json accumulated so far
const findingsWp = new Set();
for (const pk of findings) {
  for (const r of (pk.routes || [])) {
    if (!empty(r.waypoints)) findingsWp.add(r.routeId);
  }
}

function peakNeedsWork(p) {
  const routeIds = (p.routes || []).map(r => r.id);
  if (!routeIds.length) return false;
  return routeIds.some(id => !baselineWp.has(id) && !findingsWp.has(id));
}

const remaining = peaks.filter(peakNeedsWork);
const batch = remaining.slice(0, N);
writeFileSync(DIR + "next_batch_waypoints.json", JSON.stringify(batch));
const tpl = readFileSync(DIR + "wf_batch_waypoints.js", "utf8");
const run = tpl.replace(/const PEAKS = \[\]; \/\/__PEAKS__/, "const PEAKS = " + JSON.stringify(batch) + ";");
writeFileSync(DIR + "wf_run_waypoints.js", run);
console.log(JSON.stringify({
  totalPeaks: peaks.length,
  fullyCovered: peaks.length - remaining.length,
  stillNeedWork: remaining.length,
  thisBatch: batch.length,
  batchNames: batch.map(p => p.name),
}, null, 1));
