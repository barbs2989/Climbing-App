// Usage: node next_batch_tracks.mjs [batchSize]
// Picks the next batch of peaks needing GPS-track work: a route needs work if
// gpxVerified is not yet true (covers both "never searched" and "has gpx but
// not QC'd" cases). Unlike next_batch.mjs/next_batch_waypoints.mjs, this pass
// needs to hand agents each route's CURRENT waypoints+gpx (not just names) so
// they can actually verify/clean existing tracks, so peak payloads are built
// from findings.json (richest available data), not from the bare batch_all.json
// stub.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const DIR = "/Users/nathanbarber/dev/Climbing-App/enrichment-wip/";
const N = +(process.argv[2] || 20);
const peaks = JSON.parse(readFileSync(DIR + "batch_all.json", "utf8"));
const findings = existsSync(DIR + "findings.json")
  ? JSON.parse(readFileSync(DIR + "findings.json", "utf8")) : [];
const empty = v => v == null || v === "" || (Array.isArray(v) && !v.length);

const findingsByPeak = new Map(findings.map(f => [f.peakId, f]));

function buildPeakPayload(p) {
  const f = findingsByPeak.get(p.id);
  const routeFindings = new Map((f?.routes || []).map(r => [r.routeId, r]));
  const routes = (p.routes || []).map(r => {
    const rf = routeFindings.get(r.id);
    return {
      id: r.id,
      name: r.name,
      waypoints: rf?.waypoints || null,
      gpx: rf?.gpx || null,
      gpxVerified: rf?.gpxVerified === true,
    };
  });
  return { id: p.id, name: p.name, region: p.region, routes };
}

function peakNeedsWork(p) {
  const f = findingsByPeak.get(p.id);
  const routeFindings = new Map((f?.routes || []).map(r => [r.routeId, r]));
  const routeIds = (p.routes || []).map(r => r.id);
  if (!routeIds.length) return false;
  return routeIds.some(id => {
    const rf = routeFindings.get(id);
    return !rf || rf.gpxVerified !== true;
  });
}

const remaining = peaks.filter(peakNeedsWork);
const batch = remaining.slice(0, N).map(buildPeakPayload);
writeFileSync(DIR + "next_batch_tracks.json", JSON.stringify(batch));
const tpl = readFileSync(DIR + "wf_batch_tracks.js", "utf8");
const run = tpl.replace(/const PEAKS = \[\]; \/\/__PEAKS__/, "const PEAKS = " + JSON.stringify(batch) + ";");
writeFileSync(DIR + "wf_run_tracks.js", run);
console.log(JSON.stringify({
  totalPeaks: peaks.length,
  fullyVerified: peaks.length - remaining.length,
  stillNeedWork: remaining.length,
  thisBatch: batch.length,
  batchNames: batch.map(p => p.name),
}, null, 1));
