#!/usr/bin/env node
// wa_switchback_mountain_scramble names the Foggy Dew Trailhead and pins the EAGLE LAKES one.
//
// This is the clearest instance of the class described in diagnose-trailhead-refusals.mjs: the
// stored distances were right all along and the TRAILHEAD WAYPOINT was replaced with one from a
// different corridor. What makes this route the reference case is that the swap left a note
// arguing for itself — it dismisses a coordinate as "~5 km off from the real trailhead lot", and
// that dismissed coordinate is the one the FOREST SERVICE PUBLISHES as the Foggy Dew Trailhead.
// The correction inverted the truth. The original DB value was right.
//
// EVIDENCE, measured rather than argued. Against the FS coordinate (48.179295, -120.252817,
// 3,400 ft — Foggy Dew Trail #417 starts there), every waypoint's straight-line distance sits
// comfortably BELOW its recorded trail distance, which is the test the writer's coordinate gate
// applies:
//
//     Foggy Dew Falls          distMi 3.4   crow 2.80 mi
//     Merchants Basin split    distMi 5.5   crow 4.53 mi
//     Cooney Lake              distMi 8.0   crow 4.42 mi
//     Cooney Pass              distMi 8.6   crow 4.59 mi
//     Southeast Ridge          distMi 9.2   crow 4.77 mi
//     Summit                   —            crow 4.86 mi
//
// Against the STORED pin, Foggy Dew Falls is 3.99 mi away with a recorded 3.4 — impossible, which
// is why the mover refused this route. Two further corroborations that the stored pin is Eagle
// Lakes: its elevation is 4,740 ft, and the route's own approach text gives Eagle Lakes as
// 4,700 ft; and Eagle Lakes Trail #431 runs to Martin and Cooney Lakes and never passes Foggy Dew
// Falls, which is waypoint 1 of this chain.
//
// So this is a REPLACEMENT, not an invention: the coordinate comes from the land manager, and it
// is the value that makes the route's own existing numbers consistent. Nothing else is touched —
// no distance is edited, no waypoint added or removed.
//
// Backs up, asserts area_id, re-verifies the FS-consistency at run time, replays the writer's
// coordinate gate over the RESULT, writes through patchRow, then re-reads and reconciles.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_switchback_mountain_scramble";
const EXPECT_AREA = "wa_switchback_mountain";
const FS_TH = {
  type: "Trailhead",
  name: "Foggy Dew Trailhead (FR 4340-200, Trail #417)",
  lat: 48.179295, lng: -120.252817, elev: 3400, distMi: 0,
  note: "Coordinate and elevation as published by the Okanogan-Wenatchee National Forest for the Foggy Dew Trailhead, where Foggy Dew Trail #417 begins. This REPLACES a pin that was actually the Eagle Lakes / Crater Creek trailhead (4,740 ft, ~2.9 mi away): Eagle Lakes Trail #431 runs to Martin and Cooney Lakes and never passes Foggy Dew Falls, which is the next waypoint here. Every recorded distance on this route is consistent with this trailhead and impossible from the other.",
};

const key = anonKey();
const H = { apikey: key, Authorization: "Bearer " + key };
const R = 6371, tr = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const isTH = (w) => /^trailhead$/i.test(String((w && w.type) || ""));

const read = async () => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=eq.${ID}`, { headers: H });
  if (!r.ok) throw new Error(`read -> ${r.status}`);
  const rows = await r.json();
  if (!rows.length) throw new Error(`${ID} not found`);
  return rows[0];
};

const row = await read();
if (row.area_id !== EXPECT_AREA) { console.error(`REFUSING — area is "${row.area_id}", expected "${EXPECT_AREA}"`); process.exit(1); }
const wps = row.waypoints;
const ti = wps.findIndex(isTH);
if (ti < 0) { console.error("REFUSING — no Trailhead waypoint"); process.exit(1); }
if (!/foggy dew/i.test(String(wps[ti].name || ""))) { console.error(`REFUSING — trailhead is "${wps[ti].name}", not the Foggy Dew one`); process.exit(1); }
if (Math.abs(Number(wps[ti].lat) - FS_TH.lat) < 0.001) { console.error("REFUSING — the trailhead already sits at the published coordinate"); process.exit(1); }

const rest = wps.filter((_, i) => i !== ti);
const next = [FS_TH, ...rest];

// Replay the coordinate gate over the RESULT. If the published trailhead does not make this
// route's own numbers possible, the premise is wrong and nothing should be written.
let worst = 0, worstAt = null;
for (const p of rest) {
  if (p.distMi == null) continue;
  const d = hav(FS_TH, p), km = Number(p.distMi) * 1.60934;
  if (d == null || !(km > 0)) continue;
  const ratio = d / (km * 1.10);
  if (ratio > worst) { worst = ratio; worstAt = p.name; }
}
console.log(`${ID} — ${row.name}\n`);
console.log(`  removing trailhead pin: "${wps[ti].name}"  ${wps[ti].lat},${wps[ti].lng}  ${wps[ti].elev} ft`);
console.log(`  inserting (FS published): ${FS_TH.lat},${FS_TH.lng}  ${FS_TH.elev} ft\n`);
for (const p of rest) {
  const d = hav(FS_TH, p);
  console.log(`    ${String(p.type).padEnd(10)} ${String(p.name).slice(0, 40).padEnd(40)} distMi=${String(p.distMi ?? "—").padStart(5)}  crow=${(d / 1.60934).toFixed(2)} mi`);
}
console.log(`\n  worst coordinate ratio against the new trailhead: ${worst.toFixed(2)}x  ${worst <= 1 ? "(gate ACCEPTS)" : `(gate REFUSES at "${worstAt}")`}`);
if (worst > 1) { console.error("\nREFUSING — the published trailhead does not make these numbers possible; do not write."); process.exit(1); }

if (!WRITE) { console.log("\nDRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/switchback-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`\nbackup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const a = (await read()).waypoints;
const ok = isTH(a[0]) && Math.abs(Number(a[0].lat) - FS_TH.lat) < 1e-6 && Number(a[0].distMi) === 0
  && a.length === wps.length && !a.slice(1).some(isTH);
if (!ok) { console.error(`RECONCILE FAILED — first=${a[0] && a[0].type}/${a[0] && a[0].lat}, length ${a.length} vs ${wps.length}`); process.exit(1); }
console.log(`ok — re-read confirms the Foggy Dew trailhead is first at 0 mi and the chain is intact (${a.length} waypoints)`);
