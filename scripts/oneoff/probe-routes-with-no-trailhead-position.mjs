// Which routes carry a trailhead NAME in approach_logistics and NO PLACED WAYPOINT OF ANY KIND?
//
// READ THE DENOMINATOR BEFORE COMPARING THIS TO THE AUDIT. audit:trailhead-agreement's
// "NO trailhead position at all" bucket is 10; this prints 1, and neither is wrong — they ask
// different questions. The audit asks whether the row has a TRAILHEAD position (logistics coords,
// or a Trailhead-TYPED placed pin). This asks whether it has ANY placed pin at all, i.e. whether
// the map draws anything for the route. Nine routes sit in the audit's bucket and still have other
// waypoints. Both counts print below so the difference explains itself rather than reading as a
// contradiction. [[when-an-audit-reports-zero-ask-its-denominator]]
import { selectAll } from "../lib/supabase-env.mjs";

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics,road,approach",
  "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report a clean catalog"); process.exit(1); }

const out = [];
let auditBucket = 0;
for (const r of rows) {
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  if (!al || !al.trailhead) continue;
  if (num(al.trailheadLat) !== null && num(al.trailheadLng) !== null) continue;
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const typedPlaced = wps.some(w => w && String(w.type || "").toLowerCase() === "trailhead"
    && num(w.lat) !== null && num(w.lng) !== null);
  if (typedPlaced) continue;
  auditBucket++;                                                                     // the audit's bucket
  if (wps.some(w => num(w && w.lat) !== null && num(w && w.lng) !== null)) continue;  // any placed pin at all
  out.push({
    id: r.id, name: r.name, th: al.trailhead, dir: al.trailheadDirection || "",
    road: (r.road && (r.road.name || r.road.driveNote)) || "", wps: wps.length,
    approach: (r.approach || "").slice(0, 90),
  });
}
console.log(`${rows.length} WA routes read`);
console.log(`${auditBucket} have no trailhead POSITION — the audit's "need research" bucket`);
console.log(`${out.length} of those have no placed waypoint of ANY kind, so the map draws nothing at all\n`);
for (const o of out) {
  console.log(`${o.id}  —  ${o.name}`);
  console.log(`   trailhead: ${o.th}`);
  if (o.road) console.log(`   road:      ${o.road.slice(0, 110)}`);
  if (o.dir) console.log(`   direction: ${o.dir.slice(0, 110)}`);
  console.log(`   waypoints: ${o.wps}   approach: ${o.approach ? o.approach + "…" : "(none)"}\n`);
}

/* WHY THE ONE REMAINING ROUTE IS NOT REPAIRABLE BY COPY, recorded so it is not re-derived.
   wa_rock_mountain_northeast_ridge names the "Old Merritt Lake Trailhead". A sibling row on the
   same stretch of US-2 (wa_mount_howard_south_slope) carries a coordinate for the "Merritt Lake
   Trailhead" — and that row's own trailheadDirection says "Two common trailheads on US-2 in Chelan
   County give access", i.e. Rock Mountain TH and Merritt Lake TH are DIFFERENT PLACES. "Old" is
   then a third thing again: the superseded approach, not the current one.

   Copying the sibling's coordinate would be the exact defect #1209 measured — the trailing
   description says WHICH PART of the feature you mean, and 5 of 11 were the wrong part. So the
   audit's "needs research, not repair" is correct here rather than a formality. */
