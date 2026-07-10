// Usage: node harvest.mjs <taskOutputFile> [more...]
// Extracts .result (array of peak findings) from each workflow task-output file
// and merges into findings.json, deduped by peakId AND merged field-by-field within
// each route (so a waypoints-only pass and a comprehensive-fields pass can both
// safely contribute to the same peak without either clobbering the other).
// Uses a simple exclusive lockfile around the read-modify-write so two concurrent
// harvest.mjs processes (e.g. two different research sessions) can't race and drop
// each other's writes.
import { readFileSync, writeFileSync, existsSync, openSync, closeSync, unlinkSync } from "node:fs";
const DIR = "/Users/nathanbarber/dev/Climbing-App/enrichment-wip/";
const FF = DIR + "findings.json";
const LOCK = DIR + "findings.json.lock";
const empty = v => v==null || v==="" || (Array.isArray(v)&&!v.length);

function mergeField(oldVal, newVal) {
  if (empty(newVal)) return oldVal;
  if (empty(oldVal)) return newVal;
  return newVal; // both non-empty: prefer the newer research
}
function mergeRoute(oldRoute, newRoute) {
  const out = { ...oldRoute };
  for (const [k, v] of Object.entries(newRoute)) {
    if (k === "routeId") { out.routeId = v; continue; }
    if (k === "sources" && Array.isArray(v)) { out.sources = [...new Set([...(oldRoute.sources||[]), ...v])]; continue; }
    out[k] = mergeField(oldRoute[k], v);
  }
  return out;
}
function mergePeak(oldPeak, newPeak) {
  if (!oldPeak) return newPeak;
  const out = { ...oldPeak, blurb: mergeField(oldPeak.blurb, newPeak.blurb) };
  out.sources = [...new Set([...(oldPeak.sources||[]), ...(newPeak.sources||[])])];
  const routesById = new Map((oldPeak.routes||[]).map(r => [r.routeId, r]));
  for (const nr of (newPeak.routes||[])) {
    routesById.set(nr.routeId, mergeRoute(routesById.get(nr.routeId) || {}, nr));
  }
  out.routes = [...routesById.values()];
  return out;
}

async function acquireLock(timeoutMs = 30000) {
  const start = Date.now();
  for (;;) {
    try {
      const fd = openSync(LOCK, "wx"); // exclusive create, fails if exists
      closeSync(fd);
      return;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for findings.json.lock — another harvest may be stuck; check/remove " + LOCK + " manually if so.");
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    }
  }
}
function releaseLock() {
  try { unlinkSync(LOCK); } catch (e) { /* already gone */ }
}

async function run() {
  await acquireLock();
  try {
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
        byId.set(f.peakId, mergePeak(byId.get(f.peakId), f));
      }
    }
    const out = [...byId.values()];
    writeFileSync(FF, JSON.stringify(out));
    console.log(JSON.stringify({ added, updated, skipped, totalFindings: out.length }, null, 1));
  } finally {
    releaseLock();
  }
}
run().catch(e => { console.error("!! harvest failed:", e.message); releaseLock(); process.exit(1); });
