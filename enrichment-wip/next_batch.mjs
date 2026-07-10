// Usage: node next_batch.mjs [batchSize]
// Reads the full peak list (batch_all.json) and accumulated findings (findings.json),
// then writes the next batch of NOT-yet-comprehensively-researched peaks to next_batch.json.
// "Done" requires actual comprehensive-field coverage on every route (checked via a
// comprehensive-only signal field like approach/beta/fa/gainFt/season), NOT just presence
// of the peakId in findings.json — a waypoints-only contribution (see
// next_batch_waypoints.mjs / wf_batch_waypoints.js) must not cause this track to skip a
// peak that still needs grades/gear/approach text/etc.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "/Users/nathanbarber/dev/Climbing-App/enrichment-wip/";
const N = +(process.argv[2] || 30);
const peaks = JSON.parse(readFileSync(DIR + "batch_all.json", "utf8"));
const findings = existsSync(DIR + "findings.json")
  ? JSON.parse(readFileSync(DIR + "findings.json", "utf8")) : [];
const empty = v => v == null || v === "" || (Array.isArray(v) && !v.length);
const COMPREHENSIVE_SIGNAL_FIELDS = ["approach", "beta", "fa", "gainFt", "season", "overview"];
const hasComprehensiveData = r => COMPREHENSIVE_SIGNAL_FIELDS.some(f => !empty(r[f]));

const findingsById = new Map(findings.map(f => [f.peakId, f]));
function peakIsComprehensivelyDone(p) {
  const f = findingsById.get(p.id);
  if (!f) return false;
  const routeIds = (p.routes || []).map(r => r.id);
  if (!routeIds.length) return false;
  const rById = new Map((f.routes || []).map(r => [r.routeId, r]));
  return routeIds.every(id => rById.has(id) && hasComprehensiveData(rById.get(id)));
}

const remaining = peaks.filter(p => !peakIsComprehensivelyDone(p));
const batch = remaining.slice(0, N);
writeFileSync(DIR + "next_batch.json", JSON.stringify(batch));
// Emit a ready-to-run workflow with this batch injected (sandbox has no fs access).
const tpl = readFileSync(DIR + "wf_batch.js", "utf8");
const run = tpl.replace(/const PEAKS = \[\]; \/\/__PEAKS__/, "const PEAKS = " + JSON.stringify(batch) + ";");
writeFileSync(DIR + "wf_run.js", run);
console.log(JSON.stringify({
  totalPeaks: peaks.length,
  comprehensivelyDone: peaks.length - remaining.length,
  remaining: remaining.length,
  thisBatch: batch.length,
  batchNames: batch.map(p => p.name),
}, null, 1));
