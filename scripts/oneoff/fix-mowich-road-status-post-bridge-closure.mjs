// Three Mount Rainier routes tell a climber the road to Mowich Lake opens in July. It does not
// open at all.
//
// WSDOT permanently closed the SR-165 Carbon River / Fairfax Bridge on 22 April 2025 after a
// routine inspection found significant deterioration in the steel supports of the 103-year-old
// span. It was the SOLE public route to Mowich Lake and the Carbon River Ranger Station; there is
// no detour, there is no funding to replace it, and one of the two alternatives under review is
// removing the bridge and leaving SR-165 closed. Reaching Mowich now means roughly 19 miles of
// hiking each way.
//
// FOUR routes share the Mowich Lake trailhead. ONE of them knows this:
//
//   wa_mount_rainier_mowich_face   "No public vehicle, bike, or foot access via SR-165 ..."
//   rainier_north_mowich_headwall  "Seasonal, unpaved"     gate "Typically opens ~July"
//   wa_mount_rainier_edmunds_headwall  "Unpaved, seasonal" gate "Often not open until early July"
//   rainier_central_mowich_face    "Seasonal, unpaved"     gate "Typically opens ~July"
//
// The seasonalGate is the dangerous half: it does not merely omit the closure, it actively tells
// someone to plan a July trip to a road with no public access. This renders — the Planner tab's
// GETTING THERE panel has a "Road status" row (RouteDetail.jsx ~2176) that prints
// `road.status + " — " + road.seasonalGate`, and the access panel prints "Seasonal closures" from
// `ac.closures || ac.closure || ac.seasonal` (~2181).
//
// HOW THIS WAS FOUND, because the route to it matters: I proposed building closure data as a
// FEATURE, on the assumption that the app stored none. That assumption was wrong twice over — the
// data exists AND it renders. Checking the premise instead of building turned an imagined gap into
// a real defect. [[a-number-claimed-is-not-a-number-held]]
//
// WHY COPY THE SIBLING'S TEXT rather than write my own: these three fields describe ONE ROAD, not
// a per-route judgement, and the correct row's wording is already accurate and specific. Writing
// fresh prose here would be inventing where an exact answer already exists on the same trailhead.
// The external check (WSDOT) is what makes the copy safe — it establishes the fact independently,
// so this is not one row's claim propagated on trust.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const SOURCE = "wa_mount_rainier_mowich_face";
const TARGETS = ["rainier_north_mowich_headwall", "wa_mount_rainier_edmunds_headwall", "rainier_central_mowich_face"];

const [src] = await selectAll("routes", "id,road,access,approach_logistics", `id=eq.${SOURCE}`, { pageSize: 3, key });
if (!src) { console.error(`${SOURCE}: NOT FOUND`); process.exit(1); }
const sRoad = src.road || {}, sAccess = src.access || {};
const STATUS = sRoad.status, GATE = sRoad.seasonalGate, CLOSURES = sAccess.closures;

// The source must still describe the closure. If it has been edited, this script is copying
// something else entirely and must stop rather than propagate it.
if (!/Fairfax|Carbon River Bridge/i.test(String(STATUS)) || !/no public/i.test(String(STATUS))) {
  console.error(`${SOURCE} no longer describes the bridge closure — refusing to propagate:\n  ${STATUS}`);
  process.exit(1);
}
if (!/permanently closed/i.test(String(CLOSURES))) {
  console.error(`${SOURCE}.access.closures no longer describes the closure — refusing`); process.exit(1);
}
console.log(`source ${SOURCE} verified:\n  status:   ${String(STATUS).slice(0, 120)}\n  gate:     ${String(GATE).slice(0, 120)}\n  closures: ${String(CLOSURES).slice(0, 120)}\n`);

let wrote = 0, skipped = 0;
for (const id of TARGETS) {
  const [r] = await selectAll("routes", "id,road,access,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  if (!r) { console.error(`${id}: NOT FOUND`); process.exit(1); }
  const road = r.road || {}, access = r.access || {};

  // Only rewrite a row that still carries the PRE-CLOSURE description. Anything else means
  // somebody has already corrected it, or it says something this script did not anticipate.
  const stale = /seasonal/i.test(String(road.status || "")) && !/Fairfax|no public/i.test(String(road.status || ""));
  if (!stale) { console.log(`${id}: road.status is not the stale seasonal text — skipping\n  ${road.status}`); skipped++; continue; }

  // Same trailhead is the premise of the copy; check it rather than assume it.
  const th = String((r.approach_logistics || {}).trailhead || "");
  if (!/mowich/i.test(th)) { console.error(`${id}: trailhead is "${th}", not Mowich — refusing`); process.exit(1); }

  console.log(`${id}`);
  console.log(`   was: "${road.status}" / gate "${road.seasonalGate}"`);
  console.log(`   ->   the bridge-closure text from ${SOURCE}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", id, {
    road: { ...road, status: STATUS, seasonalGate: GATE },
    access: { ...access, closures: CLOSURES },
  });
  const [chk] = await selectAll("routes", "id,road,access", `id=eq.${id}`, { pageSize: 3, key });
  const cr = chk.road || {}, ca = chk.access || {};
  if (cr.status !== STATUS || cr.seasonalGate !== GATE || ca.closures !== CLOSURES) {
    console.error("   RECONCILE FAILED — one of the three fields did not take"); process.exit(1);
  }
  // Every other key in both blobs must survive: this is a targeted edit, not a replacement.
  for (const k of Object.keys(road)) if (k !== "status" && k !== "seasonalGate" && cr[k] !== road[k]) { console.error(`   LOST road.${k}`); process.exit(1); }
  for (const k of Object.keys(access)) if (k !== "closures" && JSON.stringify(ca[k]) !== JSON.stringify(access[k])) { console.error(`   LOST access.${k}`); process.exit(1); }
  console.log(`   reconciled, and every other road/access key survived\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote}, skipped ${skipped}.` : `DRY RUN — ${TARGETS.length} planned.`);
