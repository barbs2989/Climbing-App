#!/usr/bin/env node
// Routes that NAME one trailhead and PIN another from a different corridor.
//
// The class is documented at the top of diagnose-trailhead-refusals.mjs: on 12 of 16 remaining
// legs the stored distances were right all along and the TRAILHEAD WAYPOINT was replaced with one
// from a different approach, leaving the original corridor's chain behind. Several swaps left a
// note arguing for themselves, which is what makes the class expensive — the wrong value is the
// one carrying the rationale.
//
// This is the applier, as a REGISTRY rather than a script per route, so each fix is an entry
// carrying its own evidence and the safety machinery is written once.
//
// THE RULE EVERY ENTRY MUST SATISFY, enforced below rather than trusted:
//   1. The replacement coordinate is PUBLISHED, never a guess or an average, and every entry
//      declares HOW WELL it is sourced in `sourceTier` rather than letting them all look equal:
//        "land-manager"  Forest Service / NPS / WDFW publishes the coordinate. Strongest.
//        "published"     two or more independent published sources agree to 4 decimal places,
//                        but no land manager publishes one. Weaker, and it must say so.
//      A tier is required. The point is that widening the standard has to be visible in the
//      entry, not done silently in the prose above it.
//   2. It must make the route's OWN EXISTING NUMBERS possible: the writer's coordinate gate is
//      replayed over the result and the write is refused if any waypoint's straight-line distance
//      exceeds its recorded trail distance. A replacement that needs the distances edited too is
//      not this class and must not be applied here.
//   3. Nothing else changes. No distance is edited, no waypoint added or removed.
//
// Structurally, that means a fix requiring a coordinate nobody publishes CANNOT BE EXPRESSED --
// the same exclusion-by-construction that made the earlier trailhead batches safe. Two known
// defects are therefore deliberately absent: wa_tailgunner_peak_w_route (waypoint [0] sits
// 0.09 mi from the summit, but no source publishes the crossing) and the Alpental->Guye leg
// (the distance is the wrong record and no published mileage exists).
//
// Usage:  node scripts/oneoff/fix-trailhead-corridor-swaps.mjs [--write] [--only <routeId>]
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const ONLY = (() => { const i = args.indexOf("--only"); return i >= 0 ? args[i + 1] : null; })();

const REGISTRY = [
  {
    id: "wa_mount_berge_southwest_route",
    area: "wa_mount_berge",
    // The chain is the Little Giant Trail: waypoint 0 is the Chiwawa ford at distMi 0.1, then the
    // spring below Little Giant Pass, then the pass itself. The row named TRINITY, 3.28 mi away
    // and up a different valley, and its own note argues the DB's "Little Giant Trailhead" was
    // wrong. Two independent corroborations that it was right: the ford pin sits 0.05 mi from the
    // FS coordinate, and its elevation (2,600 ft) is the FS's published trailhead elevation to
    // the foot.
    wrongNameRe: /trinity/i,
    th: {
      type: "Trailhead",
      name: "Little Giant Trailhead (Chiwawa River Road, Trail #1518)",
      lat: 48.0266, lng: -120.829, elev: 2600, distMi: 0,
      note: "Coordinate and elevation as published by the Okanogan-Wenatchee National Forest for the Little Giant Trailhead, where Little Giant Trail #1518 enters the Glacier Peak Wilderness. This REPLACES a pin naming the Trinity trailhead, 3.28 mi up-valley on a different approach: this route's own first waypoint is the Chiwawa River ford at 0.1 mi, which sits 0.05 mi from this coordinate and shares its 2,600 ft elevation, and the chain above it runs to Little Giant Pass.",
    },
    source: "Okanogan-Wenatchee National Forest — Little Giant Trailhead",
    sourceTier: "land-manager",
  },
  {
    id: "wa_mount_barnes_scramble",
    area: "wa_mount_barnes",
    // The chain is the Bailey Range Traverse out of Sol Duc, unmistakably: Heart Lake, the High
    // Divide crest near Bogachiel Peak, the Catwalk, Ferry Basin, Childs Glacier, Bear Pass. The
    // row named WHISKEY BEND, 11.7 mi away on the Elwha, and its own note asserts "existing DB
    // trailhead 'Sol Duc Trailhead' is incorrect" -- while every mileage left behind is Sol Duc's
    // (Heart Lake at 7.85 mi, 4,744 ft, matches the published Sol Duc figures).
    //
    // SOURCE IS WEAKER HERE and the entry says so: the National Park Service does not publish a
    // coordinate for this trailhead, so this is two independent published sources agreeing to
    // four decimal places. The CONCLUSION is robust regardless of a few hundred feet of
    // coordinate error -- the rejected trailhead is 11.7 mi away and the gate passes at 0.65x --
    // but the coordinate itself carries less authority than the Forest Service entries above.
    wrongNameRe: /whiskey\s*bend/i,
    th: {
      type: "Trailhead",
      name: "Sol Duc Trailhead (end of Sol Duc Hot Springs Road)",
      lat: 47.9548, lng: -123.8349, elev: 1980, distMi: 0,
      note: "Sol Duc trailhead at the end of Sol Duc Hot Springs Road, the start of the High Divide / Bailey Range approach. This REPLACES a pin naming Whiskey Bend, 11.7 mi away on the Elwha, which approaches Mount Barnes from the opposite end and never passes Heart Lake — the first waypoint here. Every recorded distance on this route is consistent with a Sol Duc start. Coordinate from published sources rather than the Park Service, which does not publish one.",
    },
    source: "Two independent published sources agreeing to 4 dp (NPS publishes no coordinate)",
    sourceTier: "published",
  },
];
for (const e of REGISTRY) {
  if (e.sourceTier !== "land-manager" && e.sourceTier !== "published") {
    console.error(`REFUSING — ${e.id} declares no valid sourceTier. Every entry must say how well its coordinate is sourced.`);
    process.exit(1);
  }
}

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

const readOne = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`read ${id} -> ${r.status}`);
  return (await r.json())[0] || null;
};

const plan = [];
for (const e of REGISTRY) {
  if (ONLY && e.id !== ONLY) continue;
  const row = await readOne(e.id);
  if (!row) { console.error(`REFUSING ${e.id} — not found`); process.exitCode = 1; continue; }
  if (row.area_id !== e.area) { console.error(`REFUSING ${e.id} — area is "${row.area_id}", expected "${e.area}"`); process.exitCode = 1; continue; }
  const wps = row.waypoints;
  const ti = wps.findIndex(isTH);
  if (ti < 0) { console.error(`REFUSING ${e.id} — no Trailhead waypoint`); process.exitCode = 1; continue; }
  if (!e.wrongNameRe.test(String(wps[ti].name || ""))) { console.log(`skip ${e.id} — trailhead is "${wps[ti].name}", not the one this entry describes; already fixed?`); continue; }

  const rest = wps.filter((_, i) => i !== ti);
  let worst = 0, worstAt = null;
  for (const p of rest) {
    if (p.distMi == null) continue;
    const d = hav(e.th, p), km = Number(p.distMi) * 1.60934;
    if (d == null || !(km > 0)) continue;
    const ratio = d / (km * 1.10);
    if (ratio > worst) { worst = ratio; worstAt = p.name; }
  }
  console.log(`\n${e.id} — ${row.name}`);
  console.log(`  source: ${e.source}  [${e.sourceTier}]`);
  console.log(`  removing: "${wps[ti].name}"  ${wps[ti].lat},${wps[ti].lng}  ${wps[ti].elev} ft`);
  console.log(`  inserting: "${e.th.name}"  ${e.th.lat},${e.th.lng}  ${e.th.elev} ft`);
  for (const p of rest) {
    const d = hav(e.th, p);
    console.log(`    ${String(p.type).padEnd(10)} ${String(p.name).slice(0, 40).padEnd(40)} distMi=${String(p.distMi ?? "—").padStart(5)}  crow=${(d / 1.60934).toFixed(2)} mi`);
  }
  console.log(`  worst coordinate ratio: ${worst.toFixed(2)}x  ${worst <= 1 ? "(gate ACCEPTS)" : `(gate REFUSES at "${worstAt}")`}`);
  if (worst > 1) {
    console.error(`  REFUSING ${e.id} — the published trailhead does not make this route's own numbers possible. This is not the corridor-swap class; do not force it.`);
    process.exitCode = 1;
    continue;
  }
  plan.push({ e, row, wps, next: [e.th, ...rest] });
}

if (!plan.length) { console.log("\nnothing to write."); process.exit(process.exitCode || 0); }
if (!WRITE) { console.log(`\nDRY RUN — ${plan.length} route(s) ready. Pass --write to apply.`); process.exit(process.exitCode || 0); }

requireServiceKey();
const backup = `scripts/oneoff/trailhead-corridor-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify(plan.map((p) => ({ id: p.row.id, area_id: p.row.area_id, waypoints: p.wps })), null, 2));
console.log(`\nbackup: ${backup}`);

for (const p of plan) await patchRow("routes", p.row.id, { waypoints: p.next });

let bad = 0;
for (const p of plan) {
  const a = (await readOne(p.row.id)).waypoints;
  const ok = isTH(a[0]) && Math.abs(Number(a[0].lat) - p.e.th.lat) < 1e-6 && Number(a[0].distMi) === 0
    && a.length === p.wps.length && !a.slice(1).some(isTH);
  if (!ok) { console.error(`RECONCILE FAILED — ${p.row.id}`); bad++; }
}
if (bad) process.exit(1);
console.log(`ok — ${plan.length} route(s) reconciled: published trailhead first at 0 mi, chain intact`);
