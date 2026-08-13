#!/usr/bin/env node
// Repair waypoint arrays whose Trailhead is not the first entry.
//
// `waypoints[].directions` is positional, so `write-waypoint-directions.mjs` refuses any
// route whose Trailhead sits at index > 0: everything listed above it is either a different
// approach or out of sequence, and legs written against it describe junctions the route never
// passes. 120 WA routes are in that state.
//
// THE REPAIR PROVES ITSELF. A blind "move the trailhead to the front" is wrong, because this
// fault is not one fault. wa_argonaut_peak_east_ridge lists Long's Pass, a basin and the east
// end of the ridge, then Colchuck Lake, then the Beverly Turnpike trailhead — and Beverly
// Turnpike is the Teanaway side while Colchuck Lake is the Stuart Lake side. That is a SPLICE
// wearing a misordering's clothes, and hoisting the trailhead would linearise a trip nobody
// takes while making the array look repaired.
//
// So this proposes the minimal move (lift the Trailhead to index 0, preserve the relative
// order of everything else) and then runs the writer's OWN SIX GATES over the result. The
// move is applied only if the outcome is an array the writer would accept. A repair that
// cannot demonstrate it produced something writeable is not applied — which turns "is this
// route a misordering or a splice?" from a judgement call into a measurement.
//
// Dry run by default; --write to apply. Originals are backed up before any write and every
// row is re-read afterwards.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll as _selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WRITE = process.argv.includes("--write");

// PostgREST has been intermittently wedged; retry, print retries, and FAIL rather than skip.
// Skipping a route shrinks the set silently, which reads as "fewer routes to fix".
let retried = 0;
async function selectAll(t, s, f, o) {
  let last;
  for (let a = 1; a <= 5; a++) {
    try { const r = await _selectAll(t, s, f, o); if (a > 1) retried++; return r; }
    catch (e) { last = e; if (a < 5) await new Promise((x) => setTimeout(x, 3000 * a)); }
  }
  throw new Error(`read failed after 5 attempts (${f || t}): ${last?.message}`);
}

const isTH = (w) => /^trailhead$/i.test(String((w && w.type) || ""));
const R = 6371, tr = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// The writer's six gates, replicated. Returns null if it would accept the array.
function gate(wps) {
  if (!Array.isArray(wps) || wps.length < 2) return "too few waypoints";
  for (let i = 1; i < wps.length; i++) {
    const d = hav(wps[0], wps[i]);
    if (d == null || wps[i].distMi == null) continue;
    const km = Number(wps[i].distMi) * 1.60934;
    if (km > 0 && d > km * 1.10) return `coordinate impossible at ${i + 1} "${wps[i].name}"`;
  }
  const marks = wps.map((w) => (w && w.distMi != null ? Number(w.distMi) : null));
  if (marks.filter((m) => m != null).length >= 3) {
    let prev = null;
    for (const m of marks) { if (m == null) continue; if (prev != null && m < prev - 0.001) return "not in travel order"; prev = m; }
  }
  { let prev = null;
    for (let i = 0; i < wps.length; i++) {
      const d = hav(wps[0], wps[i]);
      if (d == null) continue;
      if (prev != null && prev - d > 2.0) return `backtracks toward the start at ${i + 1} "${wps[i].name}"`;
      prev = d;
    } }
  const s = wps.findIndex((w) => /^(summit|topout)$/i.test(String((w && w.type) || "")));
  if (s > 0) {
    const dS = hav(wps[0], wps[s]);
    if (dS != null) for (let i = 1; i < s; i++) {
      const d = hav(wps[0], wps[i]);
      if (d != null && d > dS * 1.15) return `"${wps[i].name}" sits beyond the summit`;
    }
  }
  if (wps.findIndex(isTH) > 0) return "trailhead still not first";
  return null;
}

const areas = await selectAll("areas", "id,path", null, { pageSize: 1000 });
const waIds = areas.filter((a) => (a.path || "").includes("washington")).map((a) => a.id);
const rows = [];
for (let i = 0; i < waIds.length; i += 40)
  rows.push(...await selectAll("routes", "id,name,waypoints", `area_id=in.(${waIds.slice(i, i + 40).join(",")})`, { pageSize: 200 }));

const candidates = rows.filter((r) => Array.isArray(r.waypoints) && r.waypoints.length >= 3 && r.waypoints.findIndex(isTH) > 0);
console.log(`WA routes with a Trailhead at index > 0: ${candidates.length}\n`);

const fix = [], refused = new Map();
for (const r of candidates) {
  const wps = r.waypoints;
  if (wps.filter(isTH).length > 1) { refused.set("more than one Trailhead — a splice, not a misordering", (refused.get("more than one Trailhead — a splice, not a misordering") || 0) + 1); continue; }
  if (wps.some((w) => w.directions && String(w.directions).trim())) { refused.set("already carries directions — a move re-points every written leg", (refused.get("already carries directions — a move re-points every written leg") || 0) + 1); continue; }

  const i = wps.findIndex(isTH);
  const next = [wps[i], ...wps.slice(0, i), ...wps.slice(i + 1)];
  const why = gate(next);
  if (why) { refused.set(`the move does NOT produce a writeable array: ${why.replace(/ at \d+ ".*"$/, "")}`, (refused.get(`the move does NOT produce a writeable array: ${why.replace(/ at \d+ ".*"$/, "")}`) || 0) + 1); continue; }
  fix.push({ r, next, from: i + 1 });
}

console.log(`--- REPAIRABLE (the move yields an array the writer accepts): ${fix.length} ---`);
for (const f of fix.slice(0, 25))
  console.log(`  ${f.r.id.padEnd(46)} TH ${f.from} -> 1   ${f.next.map((w) => String(w.name || w.type || "?").slice(0, 16)).join(" > ").slice(0, 110)}`);
if (fix.length > 25) console.log(`  … and ${fix.length - 25} more`);

console.log(`\n--- REFUSED, by reason ---`);
for (const [k, v] of [...refused].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
if (retried) console.log(`\n(${retried} read(s) needed a retry)`);

if (!WRITE) { console.log(`\nDRY RUN — pass --write to apply to ${fix.length} routes.`); process.exit(0); }
if (!fix.length) { console.log("\nnothing to write"); process.exit(0); }

requireServiceKey();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = path.join(ROOT, "scripts", "oneoff", `trailhead-move-backup-${stamp}.json`);
fs.writeFileSync(backup, JSON.stringify(Object.fromEntries(fix.map((f) => [f.r.id, f.r.waypoints])), null, 2));
console.log(`\nbackup: ${path.relative(ROOT, backup)}`);

for (const f of fix) await patchRow("routes", f.r.id, { waypoints: f.next });
console.log(`patched ${fix.length}; reconciling…`);

let bad = 0;
for (const f of fix) {
  const [live] = await selectAll("routes", "id,waypoints", `id=eq.${f.r.id}`, { pageSize: 5 });
  const got = (live?.waypoints || []).map((w) => w.name).join("|");
  if (got !== f.next.map((w) => w.name).join("|")) { console.log(`  MISMATCH ${f.r.id}`); bad++; }
}
console.log(bad ? `\nFAILED — ${bad} did not match` : `\nok — all ${fix.length} reconciled`);
process.exit(bad ? 1 : 0);
